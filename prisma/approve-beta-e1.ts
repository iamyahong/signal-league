/**
 * E-1 베타 승인 테스트 스크립트
 * 사용법: DATABASE_URL=$DATABASE_URL pnpm --filter @workspace/signal-league exec tsx prisma/approve-beta-e1.ts
 */
import {
  PrismaClient,
  UserStatus,
  SubscriptionStatus,
  ScoreLedgerType,
  PlanCode,
} from "@prisma/client";
import { Resend } from "resend";
import crypto from "crypto";
import { betaApprovedTemplate } from "../src/lib/emailTemplates";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_ID = "da878cb1-cc70-406a-9517-8d30199c66f7";
const STANDARD_PLAN_ID = "fa0e7a1b-1bb5-4978-9729-2fb7c5b70d1c";
const STANDARD_MONTHLY_SCORE = 4000;
const PLAN_CODE = PlanCode.STANDARD;

const TARGET_EMAIL = "iamyahong+beta@gmail.com";
const TARGET_NICKNAME = "야홍";

const FROM = process.env.EMAIL_FROM ?? "Signal League <no-reply@signalleague.com>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "hello@signalleague.com";

function makeReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function main() {
  console.log(`\n=== E-1 베타 승인 스크립트 시작 ===`);
  console.log(`대상 이메일: ${TARGET_EMAIL}`);

  // 1. 기존 사용자 조회 또는 신규 생성
  let user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    include: { profile: true, subscription: true },
  });

  if (user) {
    console.log(`\n[1/4] 기존 사용자 발견: ${user.id} (status: ${user.status})`);
    if (user.status !== UserStatus.PENDING_BETA) {
      console.error(`❌ 사용자 상태가 PENDING_BETA가 아닙니다: ${user.status}`);
      process.exit(1);
    }
  } else {
    console.log(`\n[1/4] 신규 사용자 생성 중...`);
    const userId = crypto.randomUUID();
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: userId,
          email: TARGET_EMAIL,
          nickname: TARGET_NICKNAME,
          status: UserStatus.PENDING_BETA,
          desiredPlanCode: PLAN_CODE,
          referralCode: makeReferralCode(),
          updatedAt: new Date(),
        },
      });
      await tx.userProfile.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          updatedAt: new Date(),
          notificationPreferences: {
            betaApproved: { inApp: true, email: true },
            questionApproved: { inApp: true, email: true },
            questionRejected: { inApp: true, email: true },
            resultConfirmed: { inApp: true, email: true },
            questionVoided: { inApp: true, email: true },
          },
        },
      });
      await tx.subscription.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          planId: STANDARD_PLAN_ID,
          status: SubscriptionStatus.PENDING_BETA,
          updatedAt: new Date(),
        },
      });
      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { profile: true, subscription: true },
      });
    });
    console.log(`  ✅ 신규 사용자 생성 완료: ${user.id}`);
  }

  const userId = user.id;

  // 2. 베타 승인 트랜잭션
  console.log(`\n[2/4] 베타 승인 트랜잭션 실행 중...`);
  const now = new Date();

  const scoreResult = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: UserStatus.BETA_ACTIVE, updatedAt: now },
    });

    if (user.subscription) {
      await tx.subscription.update({
        where: { userId },
        data: {
          planId: STANDARD_PLAN_ID,
          status: SubscriptionStatus.BETA_ACTIVE,
          betaApprovedAt: now,
          betaApprovedBy: ADMIN_ID,
          updatedAt: now,
        },
      });
    } else {
      await tx.subscription.create({
        data: {
          id: crypto.randomUUID(),
          userId,
          planId: STANDARD_PLAN_ID,
          status: SubscriptionStatus.BETA_ACTIVE,
          betaApprovedAt: now,
          betaApprovedBy: ADMIN_ID,
          updatedAt: now,
        },
      });
    }

    // applyScoreChange 인라인
    const profile = await tx.userProfile.findUniqueOrThrow({
      where: { userId },
      select: { availableScore: true },
    });
    const balanceBefore = profile.availableScore;
    const balanceAfter = balanceBefore + STANDARD_MONTHLY_SCORE;

    const ledger = await tx.scoreLedger.create({
      data: {
        userId,
        type: ScoreLedgerType.PLAN_GRANT,
        amount: STANDARD_MONTHLY_SCORE,
        balanceAfter,
        description: `베타 승인 — Standard 요금제 월 지급 점수`,
        referenceType: "Subscription",
        referenceId: user.subscription?.id,
      },
    });

    await tx.userProfile.update({
      where: { userId },
      data: {
        availableScore: balanceAfter,
        totalScore: { increment: STANDARD_MONTHLY_SCORE },
        updatedAt: now,
      },
    });

    await tx.notification.create({
      data: {
        userId,
        type: "BETA_APPROVED",
        title: "베타 승인 완료",
        body: `Signal League 베타 회원으로 승인되었습니다. Standard 요금제 기준 ${STANDARD_MONTHLY_SCORE.toLocaleString()}점이 지급되었습니다.`,
      },
    });

    return { ledgerId: ledger.id, balanceBefore, balanceAfter };
  });

  console.log(
    `  ✅ 트랜잭션 완료 — 점수: ${scoreResult.balanceBefore} → ${scoreResult.balanceAfter}점`
  );

  // 3. 이메일 발송
  console.log(`\n[3/4] 이메일 발송 중...`);
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY가 설정되지 않았습니다.");
    process.exit(1);
  }

  const template = betaApprovedTemplate({
    nickname: TARGET_NICKNAME,
    plan: "STANDARD",
    initialScore: STANDARD_MONTHLY_SCORE,
  });

  const emailLog = await prisma.emailLog.create({
    data: {
      type: "BETA_APPROVED",
      toEmail: TARGET_EMAIL,
      userId,
      subject: template.subject,
      status: "PENDING",
    },
  });

  const attempt = () =>
    resend.emails.send({
      from: FROM,
      to: TARGET_EMAIL,
      replyTo: REPLY_TO,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

  let result = await attempt();
  if (result.error) {
    await new Promise((r) => setTimeout(r, 2000));
    result = await attempt();
  }

  if (result.error) {
    await prisma.emailLog.update({
      where: { id: emailLog.id },
      data: { status: "FAILED", errorMsg: result.error.message },
    });
    console.error(`❌ 이메일 발송 실패: ${result.error.message}`);
    process.exit(1);
  }

  await prisma.emailLog.update({
    where: { id: emailLog.id },
    data: { status: "SENT", resendId: result.data?.id ?? null, sentAt: new Date() },
  });

  console.log(`  ✅ 이메일 발송 성공 — resendId: ${result.data?.id}`);

  // 4. 결과 요약
  console.log(`\n[4/4] 결과 확인 SQL:`);
  console.log(`SELECT type, status, "toEmail", "sentAt", "errorMessage"`);
  console.log(`FROM email_logs`);
  console.log(`WHERE "toEmail" = '${TARGET_EMAIL}'`);
  console.log(`ORDER BY "createdAt" DESC LIMIT 5;\n`);

  const finalLog = await prisma.emailLog.findUnique({ where: { id: emailLog.id } });
  console.log(`=== 최종 email_log 레코드 ===`);
  console.log(JSON.stringify(finalLog, null, 2));

  console.log(`\n=== E-1 테스트 완료 ✅ ===`);
}

main()
  .catch((e) => {
    console.error("스크립트 오류:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
