import prisma from "./src/lib/prisma";
import { applyScoreChange } from "./src/lib/score/applyScoreChange";
import { createAuditLog } from "./src/lib/admin/audit";
import { ScoreLedgerType, UserStatus, SubscriptionStatus, PlanCode } from "@prisma/client";

async function run() {
  /* ──────────────────────────────────────────────
     시나리오 A: 베타 승인 전체 흐름
  ────────────────────────────────────────────── */
  console.log("\n========================================");
  console.log("시나리오 A: 베타 승인 전체 흐름");
  console.log("========================================");

  const [targetUser, adminUser, stdPlan] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { email: "test-pending@signalleague.com" },
      include: { profile: true, subscription: true },
    }),
    prisma.user.findUniqueOrThrow({ where: { email: "admin@signalleague.com" } }),
    prisma.plan.findUniqueOrThrow({ where: { code: PlanCode.STANDARD } }),
  ]);

  const adminId = adminUser.id;
  const userId  = targetUser.id;
  const beforeSnap = {
    status: targetUser.status,
    planId: targetUser.subscription?.planId,
    availableScore: targetUser.profile?.availableScore ?? 0,
  };

  console.log(`[사전] status=${targetUser.status} score=${targetUser.profile?.availableScore}`);

  const txResult = await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { status: UserStatus.BETA_ACTIVE } });

    await tx.subscription.update({
      where: { userId },
      data: {
        planId: stdPlan.id,
        status: SubscriptionStatus.BETA_ACTIVE,
        betaApprovedAt: new Date(),
        betaApprovedBy: adminId,
      },
    });

    const sr = await applyScoreChange({
      userId,
      type: ScoreLedgerType.PLAN_GRANT,
      amount: stdPlan.monthlyScore,
      description: `베타 승인 — ${stdPlan.name} 요금제 월 지급 점수`,
      referenceId: targetUser.subscription?.id,
      referenceType: "Subscription",
      createdByUserId: adminId,
      isSystemGenerated: false,
      tx,
    });

    await tx.notification.create({
      data: {
        userId,
        type: "BETA_APPROVED",
        title: "베타 승인 완료",
        body: `${stdPlan.name} 요금제 기준 ${stdPlan.monthlyScore.toLocaleString()}점이 지급되었습니다.`,
      },
    });

    await createAuditLog({
      actorId: adminId,
      action: "BETA_APPROVE",
      targetType: "USER",
      targetId: userId,
      before: beforeSnap,
      after: { status: UserStatus.BETA_ACTIVE, planCode: PlanCode.STANDARD, availableScore: sr.balanceAfter },
    }, tx);

    return sr;
  });

  console.log(`[트랜잭션 결과] balanceBefore=${txResult.balanceBefore} → balanceAfter=${txResult.balanceAfter}`);

  const [aUser, aLedger, aAudit, aNotif] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { profile: true, subscription: { include: { plan: true } } },
    }),
    prisma.scoreLedger.findMany({ where: { userId } }),
    prisma.auditLog.findFirst({ where: { targetId: userId, action: "BETA_APPROVE" } }),
    prisma.notification.findFirst({ where: { userId, type: "BETA_APPROVED" } }),
  ]);

  const aChecks = [
    ["user.status = BETA_ACTIVE",            aUser.status === UserStatus.BETA_ACTIVE],
    ["subscription.status = BETA_ACTIVE",    aUser.subscription?.status === SubscriptionStatus.BETA_ACTIVE],
    ["plan.code = STANDARD",                 aUser.subscription?.plan.code === PlanCode.STANDARD],
    ["availableScore = 4000",                aUser.profile?.availableScore === stdPlan.monthlyScore],
    ["betaApprovedAt 존재",                  !!aUser.subscription?.betaApprovedAt],
    ["score_ledger 1건(PLAN_GRANT)",         aLedger.length === 1 && aLedger[0].type === ScoreLedgerType.PLAN_GRANT],
    ["audit_log BETA_APPROVE 존재",          !!aAudit],
    ["audit before.status = PENDING_BETA",   (aAudit?.before as any)?.status === UserStatus.PENDING_BETA],
    ["notification BETA_APPROVED 존재",      !!aNotif],
  ];
  aChecks.forEach(([lbl, ok]) => console.log(`  ${ok ? "✅" : "❌"} ${lbl}`));

  /* ──────────────────────────────────────────────
     시나리오 B: 관리자 점수 조정 (+500)
  ────────────────────────────────────────────── */
  console.log("\n========================================");
  console.log("시나리오 B: 관리자 점수 조정");
  console.log("========================================");

  const basicUser = await prisma.user.findUniqueOrThrow({ where: { email: "test-basic@signalleague.com" } });
  const bBefore = (await prisma.userProfile.findUniqueOrThrow({ where: { userId: basicUser.id } })).availableScore;
  console.log(`조정 전 availableScore: ${bBefore}`);

  const bResult = await prisma.$transaction(async (tx) => {
    const sr = await applyScoreChange({
      userId: basicUser.id,
      type: ScoreLedgerType.ADMIN_ADJUST_ADD,
      amount: 500,
      description: "시나리오B — 이벤트 보상",
      createdByUserId: adminId,
      isSystemGenerated: false,
      tx,
    });
    await createAuditLog({
      actorId: adminId,
      action: "SCORE_ADJUST_ADD",
      targetType: "USER",
      targetId: basicUser.id,
      before: { availableScore: sr.balanceBefore },
      after:  { availableScore: sr.balanceAfter, amount: 500 },
    }, tx);
    return sr;
  });

  const [bProfile, bLedger, bAudit] = await Promise.all([
    prisma.userProfile.findUniqueOrThrow({ where: { userId: basicUser.id } }),
    prisma.scoreLedger.findFirst({ where: { userId: basicUser.id }, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.findFirst({ where: { targetId: basicUser.id, action: "SCORE_ADJUST_ADD" }, orderBy: { createdAt: "desc" } }),
  ]);

  const bChecks = [
    ["users.availableScore = 1500",        bProfile.availableScore === 1500],
    ["ledger.type = ADMIN_ADJUST_ADD",     bLedger?.type === ScoreLedgerType.ADMIN_ADJUST_ADD],
    ["ledger.amount = 500",                bLedger?.amount === 500],
    [`ledger.balanceBefore = ${bBefore}`,  bLedger ? bLedger.balanceAfter - bLedger.amount === bBefore : false],
    ["ledger.balanceAfter = 1500",         bLedger?.balanceAfter === 1500],
    ["audit.action = SCORE_ADJUST_ADD",    bAudit?.action === "SCORE_ADJUST_ADD"],
  ];
  bChecks.forEach(([lbl, ok]) => console.log(`  ${ok ? "✅" : "❌"} ${lbl}`));
  console.log(`  [audit.before] ${JSON.stringify(bAudit?.before)}`);
  console.log(`  [audit.after]  ${JSON.stringify(bAudit?.after)}`);

  /* ──────────────────────────────────────────────
     트랜잭션 테스트 1: 음수 잔액 방어
  ────────────────────────────────────────────── */
  console.log("\n========================================");
  console.log("트랜잭션 테스트 1: 음수 잔액 방어");
  console.log("========================================");

  const [t1Score, t1LedgerCnt] = await Promise.all([
    prisma.userProfile.findUniqueOrThrow({ where: { userId: basicUser.id } }),
    prisma.scoreLedger.count({ where: { userId: basicUser.id } }),
  ]);
  console.log(`차감 전 score=${t1Score.availableScore}  ledger건수=${t1LedgerCnt}`);

  let negErr = "(에러 없음 - 버그)";
  try {
    await applyScoreChange({
      userId: basicUser.id, type: ScoreLedgerType.ADMIN_ADJUST_SUBTRACT,
      amount: -9999, description: "음수 방어 테스트", createdByUserId: adminId, isSystemGenerated: false,
    });
  } catch (e) { negErr = e instanceof Error ? e.message : String(e); }

  const [t1ScoreAfter, t1LedgerCntAfter] = await Promise.all([
    prisma.userProfile.findUniqueOrThrow({ where: { userId: basicUser.id } }),
    prisma.scoreLedger.count({ where: { userId: basicUser.id } }),
  ]);

  console.log(`에러 메시지: "${negErr}"`);
  const t1c = [
    ["에러 발생 (잔액 부족)",                negErr.includes("잔액")],
    [`score 불변 (${t1Score.availableScore})`, t1ScoreAfter.availableScore === t1Score.availableScore],
    ["ledger 건수 불변",                     t1LedgerCntAfter === t1LedgerCnt],
  ];
  t1c.forEach(([lbl, ok]) => console.log(`  ${ok ? "✅" : "❌"} ${lbl}`));

  /* ──────────────────────────────────────────────
     트랜잭션 테스트 2: 롤백 검증
  ────────────────────────────────────────────── */
  console.log("\n========================================");
  console.log("트랜잭션 테스트 2: 롤백 검증");
  console.log("========================================");

  // 1) 더미 PENDING_BETA 계정 생성
  const dummyEmail = "dummy-rollback-test@signalleague.com";
  await prisma.user.deleteMany({ where: { email: dummyEmail } });
  const basicPlan = await prisma.plan.findUniqueOrThrow({ where: { code: PlanCode.BASIC } });
  const dummyUser = await prisma.user.create({
    data: {
      email: dummyEmail,
      nickname: "롤백테스트",
      passwordHash: "dummy",
      status: UserStatus.PENDING_BETA,
      desiredPlanCode: PlanCode.BASIC,
      referralCode: "ROLLTEST",
      profile: { create: { favoriteCategories: [] } },
      subscription: { create: { planId: basicPlan.id, status: SubscriptionStatus.PENDING_BETA } },
    },
  });

  // 2) baseline
  const [bl_ledger, bl_audit, bl_notif] = await Promise.all([
    prisma.scoreLedger.count(),
    prisma.auditLog.count(),
    prisma.notification.count(),
  ]);
  console.log(`[baseline] ledger=${bl_ledger} audit=${bl_audit} notif=${bl_notif}`);

  // 3) 의도적 에러 주입: audit 기록 직전 throw
  let rollbackErr = "(에러 없음)";
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: dummyUser.id }, data: { status: UserStatus.BETA_ACTIVE } });
      await tx.subscription.update({
        where: { userId: dummyUser.id },
        data: { planId: basicPlan.id, status: SubscriptionStatus.BETA_ACTIVE, betaApprovedAt: new Date(), betaApprovedBy: adminId },
      });
      await applyScoreChange({
        userId: dummyUser.id, type: ScoreLedgerType.PLAN_GRANT, amount: basicPlan.monthlyScore,
        description: "롤백 테스트용", createdByUserId: adminId, isSystemGenerated: false, tx,
      });
      await tx.notification.create({
        data: { userId: dummyUser.id, type: "BETA_APPROVED", title: "테스트", body: "테스트" },
      });
      // audit 기록 직전 의도적 throw
      throw new Error("rollback_test_intentional");
    });
  } catch (e) { rollbackErr = e instanceof Error ? e.message : String(e); }

  // 4) post-error 카운트
  const [pe_ledger, pe_audit, pe_notif] = await Promise.all([
    prisma.scoreLedger.count(),
    prisma.auditLog.count(),
    prisma.notification.count(),
  ]);
  const dummyStatus = (await prisma.user.findUnique({ where: { id: dummyUser.id } }))?.status;
  const dummyScore  = (await prisma.userProfile.findUnique({ where: { userId: dummyUser.id } }))?.availableScore ?? "프로필없음";

  console.log(`에러: "${rollbackErr}"`);
  console.log(`[post-error] ledger=${pe_ledger} audit=${pe_audit} notif=${pe_notif}`);
  const t2c = [
    ["에러 메시지 = rollback_test_intentional",  rollbackErr === "rollback_test_intentional"],
    ["ledger 건수 불변",                         pe_ledger === bl_ledger],
    ["audit 건수 불변",                          pe_audit  === bl_audit],
    ["notif 건수 불변",                          pe_notif  === bl_notif],
    ["dummy.status = PENDING_BETA (롤백됨)",     dummyStatus === UserStatus.PENDING_BETA],
    [`dummy.score = 0 (롤백됨)`,                 dummyScore  === 0],
  ];
  t2c.forEach(([lbl, ok]) => console.log(`  ${ok ? "✅" : "❌"} ${lbl}`));

  // 5) 정상 승인 (롤백 후 재시도)
  console.log("\n[정상 승인 재시도]");
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: dummyUser.id }, data: { status: UserStatus.BETA_ACTIVE } });
    await tx.subscription.update({
      where: { userId: dummyUser.id },
      data: { planId: basicPlan.id, status: SubscriptionStatus.BETA_ACTIVE, betaApprovedAt: new Date(), betaApprovedBy: adminId },
    });
    await applyScoreChange({
      userId: dummyUser.id, type: ScoreLedgerType.PLAN_GRANT, amount: basicPlan.monthlyScore,
      description: "롤백 후 정상 승인", createdByUserId: adminId, isSystemGenerated: false, tx,
    });
    await tx.notification.create({
      data: { userId: dummyUser.id, type: "BETA_APPROVED", title: "테스트 승인", body: "정상 승인" },
    });
    await createAuditLog({ actorId: adminId, action: "BETA_APPROVE", targetType: "USER", targetId: dummyUser.id,
      before: {}, after: { status: UserStatus.BETA_ACTIVE } }, tx);
  });

  const dummyFinal = await prisma.user.findUniqueOrThrow({
    where: { id: dummyUser.id }, include: { profile: true },
  });
  const f2c = [
    ["재시도 후 status = BETA_ACTIVE", dummyFinal.status === UserStatus.BETA_ACTIVE],
    [`재시도 후 score = ${basicPlan.monthlyScore}`, dummyFinal.profile?.availableScore === basicPlan.monthlyScore],
  ];
  f2c.forEach(([lbl, ok]) => console.log(`  ${ok ? "✅" : "❌"} ${lbl}`));

  // 6) 더미 계정 삭제
  await prisma.user.delete({ where: { id: dummyUser.id } });
  console.log("  더미 계정 삭제 완료");

  console.log("\n========================================");
  console.log("모든 테스트 완료");
  console.log("========================================");
}

run().catch(console.error).finally(() => prisma.$disconnect());
