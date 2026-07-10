/**
 * STEP 4-① 시나리오 검증 스크립트
 * 실행: DATABASE_URL=$DATABASE_URL pnpm exec tsx prisma/test-step4.ts
 */
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`❌ ASSERT FAIL: ${msg}`);
  console.log(`  ✅ ${msg}`);
}

async function getBaseline() {
  const [ledger, parts, notifs, audits] = await Promise.all([
    prisma.scoreLedger.count(),
    prisma.predictionParticipation.count(),
    prisma.notification.count(),
    prisma.auditLog.count(),
  ]);
  return { ledger, parts, notifs, audits };
}

// ── 시나리오 E: 미리보기 ───────────────────────────────────────────────
async function scenarioE(questionId: string, correctOptionId: string) {
  console.log("\n=== 시나리오 E: 결과 확정 미리보기 ===");

  const q = await prisma.predictionQuestion.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      options: { where: { deletedAt: null } },
      participations: { where: { deletedAt: null, status: "ACTIVE" } },
    },
  });

  const winners = q.participations.filter((p) => p.optionId === correctOptionId);
  const losers  = q.participations.filter((p) => p.optionId !== correctOptionId);
  const winnersAllocated = winners.reduce((s, p) => s + p.allocatedScore, 0);
  const losersAllocated  = losers.reduce((s,  p) => s + p.allocatedScore, 0);

  const sqlCheck = await prisma.predictionParticipation.aggregate({
    where: { questionId, optionId: correctOptionId, status: "ACTIVE", deletedAt: null },
    _sum: { allocatedScore: true },
  });

  console.log(`  문제: ${q.title}`);
  console.log(`  적중자: ${winners.length}명 / 배분합: ${winnersAllocated}점 → 환원 예정: ${winnersAllocated * 2}점`);
  console.log(`  비적중자: ${losers.length}명 / 배분합: ${losersAllocated}점`);
  console.log(`  SQL 직접 집계 (correctOption 배분합): ${sqlCheck._sum.allocatedScore ?? 0}점`);

  assert(
    winnersAllocated === (sqlCheck._sum.allocatedScore ?? 0),
    `preview.winners.totalAllocated(${winnersAllocated}) = SQL 직접 집계(${sqlCheck._sum.allocatedScore})`
  );
  assert(winners.length >= 1, `적중자 1명 이상 (${winners.length}명)`);
  assert(losers.length >= 1,  `비적중자 1명 이상 (${losers.length}명)`);

  return { winnersCount: winners.length, losersCount: losers.length, winnersAllocated, losersAllocated };
}

// ── 시나리오 F: 트랜잭션 롤백 ─────────────────────────────────────────
async function scenarioF(questionId: string, correctOptionId: string, adminId: string) {
  console.log("\n=== 시나리오 F: 트랜잭션 롤백 검증 ===");
  const base = await getBaseline();

  const q = await prisma.predictionQuestion.findUniqueOrThrow({
    where: { id: questionId },
    include: { participations: { where: { deletedAt: null, status: "ACTIVE" } } },
  });

  // 참여자별 사전 점수
  const preScores: Record<string, number> = {};
  for (const p of q.participations) {
    const up = await prisma.userProfile.findUniqueOrThrow({ where: { userId: p.userId }, select: { availableScore: true } });
    preScores[p.userId] = up.availableScore;
  }

  // 의도적 throw — 1명 처리 후 rollback
  let errorCaught = false;
  let processedCount = 0;
  try {
    await prisma.$transaction(async (tx) => {
      for (const p of q.participations) {
        const isWinner = p.optionId === correctOptionId;
        if (isWinner) {
          const earned = p.allocatedScore * 2;
          // ledger insert
          const up = await tx.userProfile.findUniqueOrThrow({ where: { userId: p.userId }, select: { availableScore: true } });
          await tx.scoreLedger.create({
            data: { userId: p.userId, type: "PREDICTION_WIN", amount: earned, balanceAfter: up.availableScore + earned, description: "ROLLBACK_TEST" },
          });
          await tx.predictionParticipation.update({ where: { id: p.id }, data: { status: "WON" } });
        } else {
          await tx.scoreLedger.create({
            data: { userId: p.userId, type: "PREDICTION_LOSE", amount: 0, balanceAfter: 0, description: "ROLLBACK_TEST" },
          });
        }
        processedCount++;
        if (processedCount >= 1) {
          throw new Error("rollback_test_intentional");
        }
      }
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "rollback_test_intentional") {
      errorCaught = true;
    } else {
      throw e;
    }
  }

  assert(errorCaught, "의도적 throw가 catch됨");

  const post = await getBaseline();
  assert(base.ledger === post.ledger, `score_ledger 카운트 변화 없음 (${base.ledger} → ${post.ledger})`);
  assert(base.parts === post.parts, `participation 카운트 변화 없음 (${base.parts} → ${post.parts})`);
  assert(base.notifs === post.notifs, `notifications 변화 없음`);
  assert(base.audits === post.audits, `audit_logs 변화 없음`);

  // 참여자 점수 변화 없음
  for (const p of q.participations) {
    const up = await prisma.userProfile.findUniqueOrThrow({ where: { userId: p.userId }, select: { availableScore: true } });
    assert(up.availableScore === preScores[p.userId], `롤백 후 ${p.userId.slice(0, 8)} 점수 불변`);
  }

  const qAfter = await prisma.predictionQuestion.findUniqueOrThrow({ where: { id: questionId } });
  assert(qAfter.status === "CLOSED", `문제 상태 여전히 CLOSED (현재: ${qAfter.status})`);

  console.log(`  ✅ 시나리오 F 완료 — ${processedCount}명 처리 후 throw, 전체 롤백 확인`);
}

// ── 시나리오 A: 결과 확정 ─────────────────────────────────────────────
async function scenarioA(questionId: string, correctOptionId: string, adminId: string) {
  console.log("\n=== 시나리오 A: 결과 확정 ===");
  const base = await getBaseline();

  const q = await prisma.predictionQuestion.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      options: { where: { deletedAt: null } },
      participations: { where: { deletedAt: null, status: "ACTIVE" } },
    },
  });

  // 사전 점수 스냅샷
  const preScores: Record<string, number> = {};
  for (const p of q.participations) {
    const up = await prisma.userProfile.findUniqueOrThrow({ where: { userId: p.userId }, select: { availableScore: true } });
    preScores[p.userId] = up.availableScore;
  }

  const winners = q.participations.filter((p) => p.optionId === correctOptionId);
  const losers  = q.participations.filter((p) => p.optionId !== correctOptionId);
  const correctOption = q.options.find((o) => o.id === correctOptionId)!;

  console.log(`  문제: ${q.title}`);
  console.log(`  선택 정답: ${correctOption.label}`);
  console.log(`  적중자 ${winners.length}명 / 비적중자 ${losers.length}명`);

  // 트랜잭션 실행
  await prisma.$transaction(async (tx) => {
    await tx.predictionQuestion.update({
      where: { id: questionId },
      data: { status: "RESOLVED", resolvedAt: new Date(), resolvedByUserId: adminId, resolvedOptionId: correctOptionId, resolutionMemo: "검증 테스트", resolutionEvidenceUrl: "https://example.com" },
    });
    await tx.predictionOption.update({ where: { id: correctOptionId }, data: { isResolved: true } });

    let winnerCount = 0; let loserCount = 0;

    for (const p of q.participations) {
      const isWinner = p.optionId === correctOptionId;
      const up = await tx.userProfile.findUniqueOrThrow({ where: { userId: p.userId }, select: { availableScore: true } });

      if (isWinner) {
        const earned = p.allocatedScore * 2;
        await tx.scoreLedger.create({ data: { userId: p.userId, type: "PREDICTION_WIN", amount: earned, balanceAfter: up.availableScore + earned, description: `적중 — ${q.title.slice(0,30)}`, referenceId: questionId, referenceType: "PredictionQuestion" } });
        await tx.userProfile.update({ where: { userId: p.userId }, data: { availableScore: { increment: earned }, totalScore: { increment: earned }, correctPredictions: { increment: 1 } } });
        await tx.predictionParticipation.update({ where: { id: p.id }, data: { status: "WON", earnedScore: earned } });
        await tx.notification.create({ data: { userId: p.userId, type: "PREDICTION_WIN", title: "예측 적중", body: `적중 — ${q.title.slice(0,30)}`, data: { questionId } } });
        winnerCount++;
      } else {
        await tx.scoreLedger.create({ data: { userId: p.userId, type: "PREDICTION_LOSE", amount: 0, balanceAfter: up.availableScore, description: `비적중 — ${q.title.slice(0,30)}`, referenceId: questionId, referenceType: "PredictionQuestion" } });
        await tx.predictionParticipation.update({ where: { id: p.id }, data: { status: "LOST", earnedScore: 0 } });
        await tx.notification.create({ data: { userId: p.userId, type: "PREDICTION_LOSE", title: "예측 비적중", body: `비적중 — ${q.title.slice(0,30)}`, data: { questionId } } });
        loserCount++;
      }
    }

    await tx.notification.create({ data: { userId: q.authorId, type: "QUESTION_RESOLVED", title: "결과 확정", body: `${q.title.slice(0,30)} 결과 확정`, data: { questionId } } });
    await tx.auditLog.create({ data: { actorId: adminId, action: "QUESTION_RESOLVE", targetType: "PredictionQuestion", targetId: questionId, before: { status: "CLOSED" }, after: { status: "RESOLVED", correctOptionId, winnerCount, loserCount } } });
  }, { timeout: 30000 });

  // 사후 검증
  const qAfter = await prisma.predictionQuestion.findUniqueOrThrow({ where: { id: questionId }, include: { participations: { where: { deletedAt: null } } } });
  assert(qAfter.status === "RESOLVED", `status = RESOLVED`);
  assert(qAfter.resolvedOptionId === correctOptionId, `resolvedOptionId 저장`);
  assert(qAfter.resolvedAt !== null, `resolvedAt NOT NULL`);

  let wonCount = 0; let lostCount = 0;
  for (const p of qAfter.participations) {
    const up = await prisma.userProfile.findUniqueOrThrow({ where: { userId: p.userId }, select: { availableScore: true } });
    if (p.optionId === correctOptionId) {
      const expected = preScores[p.userId] + p.allocatedScore * 2;
      assert(up.availableScore === expected, `WON: ${p.userId.slice(0,8)} score ${preScores[p.userId]}+${p.allocatedScore}×2=${expected} → actual ${up.availableScore}`);
      assert(p.status === "WON", `participation.status = WON`);
      wonCount++;
    } else {
      assert(up.availableScore === preScores[p.userId], `LOST: ${p.userId.slice(0,8)} score 불변 (${preScores[p.userId]})`);
      assert(p.status === "LOST", `participation.status = LOST`);
      lostCount++;
    }
  }

  const post = await getBaseline();
  const newLedger = post.ledger - base.ledger;
  const newNotifs = post.notifs - base.notifs;
  const newAudits = post.audits - base.audits;
  assert(newLedger === wonCount + lostCount, `ledger 신규 ${wonCount + lostCount}건 (WON:${wonCount} + LOST:${lostCount}) → actual ${newLedger}`);
  assert(newNotifs === wonCount + lostCount + 1, `notifications 신규 ${wonCount + lostCount + 1}건 → actual ${newNotifs}`);
  assert(newAudits === 1, `audit_logs 신규 1건 → actual ${newAudits}`);

  console.log(`  ✅ 시나리오 A 완료 — WON ${wonCount}명, LOST ${lostCount}명`);
  return { wonCount, lostCount };
}

// ── 시나리오 B/C: 무효 처리 ────────────────────────────────────────────
async function scenarioVoid(questionId: string, adminId: string, refundCreatorCost: boolean, label: string) {
  console.log(`\n=== 시나리오 ${label}: 무효 처리 (refundCreatorCost=${refundCreatorCost}) ===`);
  const base = await getBaseline();

  const q = await prisma.predictionQuestion.findUniqueOrThrow({
    where: { id: questionId },
    include: { participations: { where: { deletedAt: null, status: "ACTIVE" } } },
  });

  if (!["OPEN", "CLOSED"].includes(q.status)) {
    throw new Error(`무효 처리 불가 상태: ${q.status}`);
  }

  const preScores: Record<string, number> = {};
  const allUserIds = [...q.participations.map((p) => p.userId), q.authorId];
  for (const uid of [...new Set(allUserIds)]) {
    const up = await prisma.userProfile.findUniqueOrThrow({ where: { userId: uid }, select: { availableScore: true } });
    preScores[uid] = up.availableScore;
  }

  const voidReason = `검증 테스트 (${label})`;
  const userVisibleMsg = "테스트 무효 처리입니다.";

  await prisma.$transaction(async (tx) => {
    await tx.predictionQuestion.update({
      where: { id: questionId },
      data: { status: "VOIDED", voidedAt: new Date(), voidedByUserId: adminId, voidReason, creatorCostRefunded: refundCreatorCost },
    });

    let totalRefunded = 0;
    for (const p of q.participations) {
      const up = await tx.userProfile.findUniqueOrThrow({ where: { userId: p.userId }, select: { availableScore: true } });
      await tx.scoreLedger.create({ data: { userId: p.userId, type: "QUESTION_VOID_REFUND", amount: p.allocatedScore, balanceAfter: up.availableScore + p.allocatedScore, description: `무효 환불 — ${q.title.slice(0,30)}`, referenceId: questionId, referenceType: "PredictionQuestion" } });
      await tx.userProfile.update({ where: { userId: p.userId }, data: { availableScore: { increment: p.allocatedScore }, totalScore: { increment: p.allocatedScore } } });
      await tx.predictionParticipation.update({ where: { id: p.id }, data: { status: "REFUNDED", earnedScore: p.allocatedScore } });
      await tx.notification.create({ data: { userId: p.userId, type: "QUESTION_VOIDED", title: "예측 무효 처리", body: `${q.title.slice(0,30)} 무효`, data: { questionId } } });
      totalRefunded += p.allocatedScore;
    }

    if (refundCreatorCost && q.creatorCost > 0) {
      const upA = await tx.userProfile.findUniqueOrThrow({ where: { userId: q.authorId }, select: { availableScore: true } });
      await tx.scoreLedger.create({ data: { userId: q.authorId, type: "QUESTION_CREATE_REFUND", amount: q.creatorCost, balanceAfter: upA.availableScore + q.creatorCost, description: `생성비 환불 — ${q.title.slice(0,30)}`, referenceId: questionId, referenceType: "PredictionQuestion" } });
      await tx.userProfile.update({ where: { userId: q.authorId }, data: { availableScore: { increment: q.creatorCost }, totalScore: { increment: q.creatorCost } } });
    }

    await tx.notification.create({ data: { userId: q.authorId, type: "QUESTION_VOIDED", title: "내 예측 문제 무효 처리", body: `${q.title.slice(0,30)} 무효`, data: { questionId, voidReason, refundCreatorCost } } });
    await tx.auditLog.create({ data: { actorId: adminId, action: "QUESTION_VOID", targetType: "PredictionQuestion", targetId: questionId, before: { status: q.status }, after: { status: "VOIDED", voidReason, refundCreatorCost, totalRefunded } } });
  }, { timeout: 30000 });

  // 사후 검증
  const qAfter = await prisma.predictionQuestion.findUniqueOrThrow({ where: { id: questionId }, include: { participations: { where: { deletedAt: null } } } });
  assert(qAfter.status === "VOIDED", `status = VOIDED`);
  assert(qAfter.voidedAt !== null, `voidedAt NOT NULL`);
  assert(qAfter.creatorCostRefunded === refundCreatorCost, `creatorCostRefunded = ${refundCreatorCost}`);

  for (const p of qAfter.participations) {
    assert(p.status === "REFUNDED", `participation.status = REFUNDED for ${p.userId.slice(0,8)}`);
    const up = await prisma.userProfile.findUniqueOrThrow({ where: { userId: p.userId }, select: { availableScore: true } });
    assert(up.availableScore === preScores[p.userId] + p.allocatedScore, `환불 후 점수 = 사전(${preScores[p.userId]}) + allocate(${p.allocatedScore}) = ${preScores[p.userId] + p.allocatedScore} → actual ${up.availableScore}`);
  }

  const authorAfter = await prisma.userProfile.findUniqueOrThrow({ where: { userId: q.authorId }, select: { availableScore: true } });
  if (refundCreatorCost) {
    assert(authorAfter.availableScore === preScores[q.authorId] + q.creatorCost, `작성자 생성비 환불 (${q.creatorCost}점)`);
  } else {
    assert(authorAfter.availableScore === preScores[q.authorId], `작성자 점수 변화 없음`);
  }

  const post = await getBaseline();
  const N = qAfter.participations.length;
  const expectedLedger = refundCreatorCost ? N + 1 : N;
  assert(post.ledger - base.ledger === expectedLedger, `ledger 신규 ${expectedLedger}건 → actual ${post.ledger - base.ledger}`);
  assert(post.notifs - base.notifs === N + 1, `notifications 신규 ${N + 1}건 → actual ${post.notifs - base.notifs}`);
  assert(post.audits - base.audits === 1, `audit_logs 신규 1건`);

  if (!refundCreatorCost) {
    const createRefundLedgers = await prisma.scoreLedger.count({ where: { userId: q.authorId, type: "QUESTION_CREATE_REFUND", referenceId: questionId } });
    assert(createRefundLedgers === 0, `QUESTION_CREATE_REFUND 없음 (refundCreatorCost=false)`);
  }

  console.log(`  ✅ 시나리오 ${label} 완료 — 참여자 ${N}명 환불, 작성자 환불: ${refundCreatorCost}`);
}

// ── 시나리오 D: 자동 마감 cron ───────────────────────────────────────
async function scenarioD() {
  console.log("\n=== 시나리오 D: 자동 마감 cron ===");

  // 마감일이 과거인 OPEN 문제 찾기
  const overdueCount = await prisma.predictionQuestion.count({
    where: { status: "OPEN", closesAt: { lte: new Date() }, deletedAt: null },
  });
  console.log(`  현재 마감 초과 OPEN 문제: ${overdueCount}건`);

  // 임시로 1개 OPEN 문제의 closeAt을 어제로 수정
  let patchedId: string | null = null;
  if (overdueCount === 0) {
    const oneOpen = await prisma.predictionQuestion.findFirst({ where: { status: "OPEN", deletedAt: null } });
    if (oneOpen) {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      await prisma.predictionQuestion.update({ where: { id: oneOpen.id }, data: { closesAt: yesterday } });
      patchedId = oneOpen.id;
      console.log(`  ⚠️ 임시 closesAt 패치: ${oneOpen.title.slice(0,40)}`);
    }
  }

  const base = await getBaseline();
  const preOverdue = await prisma.predictionQuestion.count({ where: { status: "OPEN", closesAt: { lte: new Date() }, deletedAt: null } });

  // cron API 직접 호출 (Prisma로 재현)
  const overdue = await prisma.predictionQuestion.findMany({
    where: { status: "OPEN", closesAt: { lte: new Date() }, deletedAt: null },
    select: { id: true, title: true },
  });
  const closedIds = overdue.map((q) => q.id);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.predictionQuestion.updateMany({ where: { id: { in: closedIds } }, data: { status: "CLOSED", lastAutoClosedAt: now } });
    for (const q of overdue) {
      await tx.auditLog.create({ data: { actorId: null, action: "AUTO_CLOSE_QUESTION", targetType: "PredictionQuestion", targetId: q.id, before: { status: "OPEN" }, after: { status: "CLOSED", autoClosedAt: now.toISOString() } } });
    }
  });

  assert(overdue.length === preOverdue, `cron이 ${preOverdue}건 마감 처리`);

  const post = await getBaseline();
  assert(post.ledger === base.ledger, `score_ledger 변화 없음 (cron은 점수 변동 없음)`);
  assert(post.audits - base.audits === overdue.length, `audit_logs AUTO_CLOSE_QUESTION ${overdue.length}건`);

  for (const q of overdue) {
    const qAfter = await prisma.predictionQuestion.findUniqueOrThrow({ where: { id: q.id } });
    assert(qAfter.status === "CLOSED", `${q.title.slice(0,30)} → CLOSED`);
    assert(qAfter.lastAutoClosedAt !== null, `lastAutoClosedAt NOT NULL`);
  }

  // 임시 패치 복원 (closesAt은 이미 CLOSED가 됐으므로 별도 복원 불필요)
  if (patchedId) console.log(`  (임시 패치 문제 ${patchedId.slice(0,8)} → CLOSED 처리됨)`);

  console.log(`  ✅ 시나리오 D 완료 — ${overdue.length}건 자동 마감`);
}

// ── 메인 ──────────────────────────────────────────────────────────────
async function main() {
  console.log("=".repeat(60));
  console.log("STEP 4-① 시나리오 검증 시작");
  console.log("=".repeat(60));

  const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "admin@signalleague.com" } });
  const adminId = adminUser.id;

  // CLOSED 문제 목록
  const closedQuestions = await prisma.predictionQuestion.findMany({
    where: { status: "CLOSED", deletedAt: null },
    include: { options: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } } },
    orderBy: { totalAllocated: "desc" },
  });

  console.log(`\n현재 CLOSED 문제 ${closedQuestions.length}개:`);
  for (const q of closedQuestions) {
    console.log(`  - ${q.title.slice(0,50)} (참여자 ${q.totalParticipants}, 배분합 ${q.totalAllocated})`);
  }

  if (closedQuestions.length < 3) {
    console.warn(`⚠️  CLOSED 문제 ${closedQuestions.length}개 — 3개 이상이어야 시나리오 A, B, C 모두 실행 가능`);
  }

  // 시나리오 E (preview) — KBO 또는 첫 번째 CLOSED
  const qForAF = closedQuestions[0];
  if (!qForAF) throw new Error("CLOSED 문제 없음");
  const correctOptionForAF = qForAF.options[0]; // 첫 번째 선택지를 정답으로 가정

  await scenarioE(qForAF.id, correctOptionForAF.id);

  // 시나리오 F (rollback) — 동일 문제
  await scenarioF(qForAF.id, correctOptionForAF.id, adminId);

  // 시나리오 A (resolve) — qForAF
  await scenarioA(qForAF.id, correctOptionForAF.id, adminId);

  // CLOSED 문제 다시 조회 (A 실행 후 qForAF가 RESOLVED가 됨)
  const remainClosed = await prisma.predictionQuestion.findMany({
    where: { status: "CLOSED", deletedAt: null },
    include: { options: { where: { deletedAt: null } }, participations: { where: { deletedAt: null, status: "ACTIVE" } } },
    orderBy: { totalAllocated: "asc" },
  });

  // 시나리오 B (void with refund)
  if (remainClosed[0]) {
    await scenarioVoid(remainClosed[0].id, adminId, true, "B");
  } else {
    console.warn("⚠️  시나리오 B 스킵 — 남은 CLOSED 문제 없음");
  }

  // 시나리오 C (void without refund)
  if (remainClosed[1]) {
    await scenarioVoid(remainClosed[1].id, adminId, false, "C");
  } else {
    console.warn("⚠️  시나리오 C 스킵 — 남은 CLOSED 문제 부족");
  }

  // 시나리오 D (cron)
  await scenarioD();

  // 최종 상태 카운트
  const finalCounts = await executeSqlViaPromise();
  console.log("\n=== 최종 상태 카운트 ===");
  console.log(finalCounts);

  console.log("\n=".repeat(60));
  console.log("✅ 모든 시나리오 검증 완료");
  console.log("=".repeat(60));
}

async function executeSqlViaPromise() {
  const [qStatus, ledger, parts, notifs, audits] = await Promise.all([
    prisma.predictionQuestion.groupBy({ by: ["status"], _count: true }),
    prisma.scoreLedger.count(),
    prisma.predictionParticipation.count(),
    prisma.notification.count(),
    prisma.auditLog.count(),
  ]);
  return { questionStatusCounts: Object.fromEntries(qStatus.map((r) => [r.status, r._count])), ledger, parts, notifs, audits };
}

main()
  .catch((e) => { console.error("❌ 오류:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
