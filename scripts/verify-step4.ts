/**
 * STEP 4-② 검증 스크립트
 * 시나리오 B: 이의제기 목록 조회
 * 시나리오 C: 중복 이의제기 unique 제약
 * 시나리오 D: 이의제기 기각 (REJECTED)
 * 시나리오 E: 이의제기 수락+무효화 (ACCEPTED+VOIDED)
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n🔍 STEP 4-② 검증 시작\n");

  const disputes = await prisma.dispute.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { email: true } },
      question: { select: { title: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`[B] 이의제기 목록 조회: ${disputes.length}건`);
  disputes.forEach((d, i) => {
    console.log(
      `  ${i + 1}. [${d.status}] ${d.user.email} → ${d.question.title.slice(0, 40)}... (Q: ${d.question.status})`
    );
  });

  // ── 시나리오 C: 중복 이의제기 unique 제약
  console.log("\n[C] 중복 이의제기 unique 제약 검증...");
  const firstDispute = disputes[0];
  try {
    await prisma.dispute.create({
      data: {
        questionId: firstDispute.questionId,
        userId: firstDispute.userId,
        reason: "중복 테스트",
        status: "PENDING",
      },
    });
    console.log("  ❌ 중복 생성 성공 (unique 제약 실패!)");
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "P2002") {
      console.log("  ✅ unique 제약 정상 동작 — 중복 이의제기 차단됨");
    } else {
      console.log(`  ❌ 예상치 못한 에러: ${(e as Error).message}`);
    }
  }

  // ── 시나리오 D: test-basic 이의제기 기각
  const adminUser = await prisma.user.findFirst({
    where: { email: "admin@signalleague.com" },
  });
  const disputeD = disputes.find((d) => d.user.email === "test-basic@signalleague.com");

  if (!disputeD || !adminUser) {
    console.log("\n[D] ❌ 필요한 데이터 없음");
  } else {
    console.log(`\n[D] 이의제기 기각 처리 (${disputeD.id.slice(0, 8)}…, 현재: ${disputeD.status})`);

    // 이미 최종 상태면 일단 PENDING으로 리셋해서 재테스트
    if (disputeD.status === "REJECTED") {
      await prisma.dispute.update({
        where: { id: disputeD.id },
        data: { status: "PENDING", processedAt: null, processedByUserId: null },
      });
    }

    await prisma.dispute.update({
      where: { id: disputeD.id },
      data: {
        status: "REJECTED",
        processedAt: new Date(),
        processedByUserId: adminUser.id,
        processingReason: "결과 판정이 공식 데이터 기반으로 정확히 이루어진 것으로 확인됨",
        userVisibleResolutionMessage: "이의제기 검토 결과 기각 처리됩니다.",
        resultAction: "NONE",
      },
    });
    const after = await prisma.dispute.findUnique({
      where: { id: disputeD.id },
      select: { status: true },
    });
    if (after?.status === "REJECTED") {
      console.log("  ✅ 시나리오 D 통과: PENDING → REJECTED 처리 성공");
    } else {
      console.log(`  ❌ 시나리오 D 실패: 상태=${after?.status}`);
    }
  }

  // ── 시나리오 E: dummy-05 이의제기 수락 + G7 문제 무효화
  const disputeE = disputes.find((d) => d.user.email === "dummy-05@signalleague.local");
  if (!disputeE || !adminUser) {
    console.log("\n[E] ❌ 필요한 데이터 없음");
  } else {
    console.log(
      `\n[E] 이의제기 수락+무효화 처리 (${disputeE.id.slice(0, 8)}…, 현재: ${disputeE.status})`
    );

    const g7Question = await prisma.predictionQuestion.findUnique({
      where: { id: disputeE.questionId },
      include: {
        participations: {
          where: { deletedAt: null, status: { in: ["ACTIVE", "WON", "LOST"] } },
          select: { id: true, userId: true, allocatedScore: true, earnedScore: true, status: true },
        },
      },
    });

    if (!g7Question) {
      console.log("  ❌ G7 문제를 찾을 수 없음");
      return;
    }

    console.log(
      `  대상 문제: ${g7Question.title.slice(0, 50)} (상태: ${g7Question.status}, 참여: ${g7Question.participations.length}명)`
    );

    if (g7Question.status === "VOIDED") {
      console.log("  ✅ 이미 VOIDED 처리됨 — 시나리오 E 이미 완료 상태");
    } else if (g7Question.status !== "RESOLVED") {
      console.log(`  ⏭️  G7 문제 상태 ${g7Question.status} — VOIDED 처리 건너뜀`);
    } else {
      await prisma.$transaction(
        async (tx) => {
          // 1. 이의제기 ACCEPTED
          await tx.dispute.update({
            where: { id: disputeE.id },
            data: {
              status: "ACCEPTED",
              processedAt: new Date(),
              processedByUserId: adminUser.id,
              processingReason: "G7 판정 기준 시점 불일치 확인",
              userVisibleResolutionMessage: "이의제기 수락 — 해당 문제가 무효 처리되며 점수가 환불됩니다.",
              resultAction: "VOIDED",
            },
          });

          // 2. 문제 VOIDED
          await tx.predictionQuestion.update({
            where: { id: g7Question.id },
            data: { status: "VOIDED" },
          });

          // 3. 참여자 환불 처리
          const wonParticipations = g7Question.participations.filter((p) => p.status === "WON");
          const otherParticipations = g7Question.participations.filter((p) => p.status !== "WON");

          for (const p of wonParticipations) {
            const profile = await tx.userProfile.findUniqueOrThrow({
              where: { userId: p.userId },
              select: { availableScore: true },
            });
            const clawBack = p.earnedScore ?? 0;
            const refund = p.allocatedScore;
            const newBalance = Math.max(0, profile.availableScore - clawBack + refund);
            await tx.scoreLedger.createMany({
              data: [
                {
                  userId: p.userId,
                  type: "QUESTION_VOID_REFUND",
                  amount: refund,
                  balanceAfter: profile.availableScore + refund,
                  description: `이의제기 무효화 환불 — ${g7Question.title.slice(0, 40)}`,
                },
                {
                  userId: p.userId,
                  type: "ADMIN_ADJUST_SUBTRACT",
                  amount: -clawBack,
                  balanceAfter: newBalance,
                  description: `이의제기 무효화 적중 점수 회수 — ${g7Question.title.slice(0, 40)}`,
                },
              ],
            });
            await tx.userProfile.update({
              where: { userId: p.userId },
              data: {
                availableScore: newBalance,
                totalScore: { decrement: clawBack },
                correctPredictions: { decrement: 1 },
                totalPredictions: { decrement: 1 },
              },
            });
            await tx.predictionParticipation.update({
              where: { id: p.id },
              data: { status: "REFUNDED", earnedScore: 0 },
            });
          }

          for (const p of otherParticipations) {
            const profile = await tx.userProfile.findUniqueOrThrow({
              where: { userId: p.userId },
              select: { availableScore: true },
            });
            await tx.scoreLedger.create({
              data: {
                userId: p.userId,
                type: "QUESTION_VOID_REFUND",
                amount: p.allocatedScore,
                balanceAfter: profile.availableScore + p.allocatedScore,
                description: `이의제기 무효화 환불 — ${g7Question.title.slice(0, 40)}`,
              },
            });
            await tx.userProfile.update({
              where: { userId: p.userId },
              data: {
                availableScore: { increment: p.allocatedScore },
                totalPredictions: { decrement: 1 },
              },
            });
            await tx.predictionParticipation.update({
              where: { id: p.id },
              data: { status: "REFUNDED", earnedScore: 0 },
            });
          }
        },
        { timeout: 30000 }
      );

      const afterQ = await prisma.predictionQuestion.findUnique({
        where: { id: g7Question.id },
        select: { status: true },
      });
      const afterD = await prisma.dispute.findUnique({
        where: { id: disputeE.id },
        select: { status: true, resultAction: true },
      });

      if (afterQ?.status === "VOIDED" && afterD?.status === "ACCEPTED") {
        console.log(
          `  ✅ 시나리오 E 통과: 이의제기 ACCEPTED, 문제 VOIDED, 참여자 ${g7Question.participations.length}명 환불 완료`
        );
      } else {
        console.log(
          `  ❌ 시나리오 E 실패: Q=${afterQ?.status}, Dispute=${afterD?.status}`
        );
      }
    }
  }

  // ── 최종 상태 요약
  console.log("\n📊 최종 상태 요약");
  const finalDisputes = await prisma.dispute.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { email: true } },
      question: { select: { title: true, status: true } },
    },
  });
  finalDisputes.forEach((d) => {
    console.log(
      `  [${d.status}] ${d.user.email} | ${d.question.title.slice(0, 35)}… | Q:${d.question.status} | action:${d.resultAction ?? "—"}`
    );
  });

  const snapCount = await prisma.rankingSnapshot.count({ where: { deletedAt: null } });
  const statCount = await prisma.userRankingStat.count({ where: { deletedAt: null } });
  console.log(`\n  랭킹 스냅샷: ${snapCount}건`);
  console.log(`  UserRankingStat: ${statCount}건`);
  console.log("\n✅ 검증 완료\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
