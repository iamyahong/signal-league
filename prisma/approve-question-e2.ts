/**
 * E-2 문제 승인 이메일 테스트 스크립트
 * 사용법: DATABASE_URL=$DATABASE_URL pnpm --filter @workspace/signal-league exec tsx prisma/approve-question-e2.ts
 */
import {
  PrismaClient,
  UserStatus,
  SubscriptionStatus,
  QuestionStatus,
  PlanCode,
} from "@prisma/client";
import { Resend } from "resend";
import crypto from "crypto";
import { questionApprovedTemplate } from "../src/lib/emailTemplates";

const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);

const ADMIN_ID = "da878cb1-cc70-406a-9517-8d30199c66f7";
const STANDARD_PLAN_ID = "fa0e7a1b-1bb5-4978-9729-2fb7c5b70d1c";
const ECONOMY_CATEGORY_ID = "dd355e99-ff65-454c-8ddb-85aaa3845d5e";

const TARGET_EMAIL = "iamyahong@gmail.com";
const TARGET_NICKNAME = "야홍E2";
const QUESTION_TITLE = "[E-2 검증] 2026년 5월 코스피 3000 돌파?";

const FROM = process.env.EMAIL_FROM ?? "Signal League <no-reply@signalleague.com>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "hello@signalleague.com";

function makeReferralCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function main() {
  console.log(`\n=== E-2 문제 승인 이메일 테스트 시작 ===`);
  console.log(`대상 이메일: ${TARGET_EMAIL}`);

  // 1. 사용자 조회 또는 생성 (BETA_ACTIVE)
  let user = await prisma.user.findUnique({
    where: { email: TARGET_EMAIL },
    include: { profile: true, subscription: true },
  });

  if (user) {
    console.log(`\n[1/5] 기존 사용자 발견: ${user.id} (status: ${user.status})`);
  } else {
    console.log(`\n[1/5] 신규 사용자 생성 중...`);
    const userId = crypto.randomUUID();
    user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          id: userId,
          email: TARGET_EMAIL,
          nickname: TARGET_NICKNAME,
          status: UserStatus.BETA_ACTIVE,
          desiredPlanCode: PlanCode.STANDARD,
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
          status: SubscriptionStatus.BETA_ACTIVE,
          betaApprovedAt: new Date(),
          betaApprovedBy: ADMIN_ID,
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

  // 2. 기존 E-2 테스트 문제 조회 또는 신규 생성
  console.log(`\n[2/5] PENDING_REVIEW 문제 조회 또는 생성 중...`);
  let question = await prisma.predictionQuestion.findFirst({
    where: {
      authorId: userId,
      title: QUESTION_TITLE,
      status: QuestionStatus.PENDING_REVIEW,
    },
  });

  if (question) {
    console.log(`  기존 문제 발견: ${question.id}`);
  } else {
    const qId = crypto.randomUUID();
    question = await prisma.$transaction(async (tx) => {
      const q = await tx.predictionQuestion.create({
        data: {
          id: qId,
          authorId: userId,
          categoryId: ECONOMY_CATEGORY_ID,
          title: QUESTION_TITLE,
          description: "E-2 이메일 발송 검증용 테스트 문제입니다.",
          resolutionCriteria: "2026년 5월 31일 코스피 종가 3000 초과 시 예(적중)",
          status: QuestionStatus.PENDING_REVIEW,
          closesAt: new Date("2026-05-31T15:00:00Z"),
          updatedAt: new Date(),
        },
      });
      await tx.predictionOption.create({
        data: {
          id: crypto.randomUUID(),
          questionId: qId,
          label: "예 (3000 초과)",
          sortOrder: 0,
          updatedAt: new Date(),
        },
      });
      await tx.predictionOption.create({
        data: {
          id: crypto.randomUUID(),
          questionId: qId,
          label: "아니오 (3000 이하)",
          sortOrder: 1,
          updatedAt: new Date(),
        },
      });
      return q;
    });
    console.log(`  ✅ 문제 생성 완료: ${question.id}`);
  }

  const questionId = question.id;

  // 3. 승인 트랜잭션 (approveQuestion 인라인)
  console.log(`\n[3/5] 문제 승인 트랜잭션 실행 중...`);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.predictionQuestion.update({
      where: { id: questionId },
      data: {
        status: QuestionStatus.OPEN,
        approvedAt: now,
        approvedByUserId: ADMIN_ID,
        updatedAt: now,
      },
    });

    await tx.notification.create({
      data: {
        userId,
        type: "QUESTION_APPROVED",
        title: "예측 문제가 공개되었습니다",
        body: `'${QUESTION_TITLE}' 문제가 승인되어 공개되었습니다. (공개 일시: ${now.toLocaleString("ko-KR")})`,
        data: { questionId },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: ADMIN_ID,
        action: "QUESTION_APPROVE",
        targetType: "PredictionQuestion",
        targetId: questionId,
        before: { status: QuestionStatus.PENDING_REVIEW },
        after: {
          status: QuestionStatus.OPEN,
          approvedAt: now.toISOString(),
          memo: "E-2 이메일 테스트",
        },
      },
    });
  });

  console.log(`  ✅ 승인 트랜잭션 완료 — 문제 상태: OPEN`);

  // 4. QUESTION_APPROVED 이메일 발송
  console.log(`\n[4/5] QUESTION_APPROVED 이메일 발송 중...`);

  const template = questionApprovedTemplate({
    nickname: TARGET_NICKNAME,
    questionTitle: QUESTION_TITLE,
    questionId,
  });

  const emailLog = await prisma.emailLog.create({
    data: {
      type: "QUESTION_APPROVED",
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

  // 5. 최종 확인
  console.log(`\n[5/5] email_logs 확인...`);
  const finalLog = await prisma.emailLog.findUnique({ where: { id: emailLog.id } });
  console.log(JSON.stringify(finalLog, null, 2));

  console.log(`\n=== E-2 테스트 완료 ✅ ===`);
}

main()
  .catch((e) => {
    console.error("스크립트 오류:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
