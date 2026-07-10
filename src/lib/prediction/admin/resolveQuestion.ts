import { Prisma } from "@prisma/client";
import { applyScoreChange } from "@/lib/score/applyScoreChange";
import { createAuditLog } from "@/lib/admin/audit";

export interface ResolveQuestionParams {
  questionId: string;
  adminId: string;
  correctOptionId: string;
  resolutionMemo: string;
  resolutionEvidenceUrl?: string;
}

export interface ResolveEmailData {
  questionTitle: string;
  questionId: string;
  correctOptionLabel: string;
  authorId: string;
  authorNickname: string;
  hits: Array<{ userId: string; nickname: string; earnedScore: number }>;
  misses: Array<{ userId: string; nickname: string; allocatedScore: number }>;
}

export async function resolveQuestion(
  params: ResolveQuestionParams,
  tx: Prisma.TransactionClient
): Promise<ResolveEmailData> {
  const { questionId, adminId, correctOptionId, resolutionMemo, resolutionEvidenceUrl } = params;

  const question = await tx.predictionQuestion.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      options: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      participations: {
        where: { deletedAt: null, status: "ACTIVE" },
        include: { user: { select: { id: true, nickname: true } } },
      },
      author: { select: { id: true, nickname: true } },
    },
  });

  if (question.status !== "CLOSED") {
    throw new Error(`결과 확정은 CLOSED 상태에서만 가능합니다. 현재 상태: ${question.status}`);
  }

  const correctOption = question.options.find((o) => o.id === correctOptionId);
  if (!correctOption) {
    throw new Error("정답 선택지가 이 문제에 속하지 않습니다.");
  }

  await tx.predictionQuestion.update({
    where: { id: questionId },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedByUserId: adminId,
      resolvedOptionId: correctOptionId,
      resolutionEvidenceUrl: resolutionEvidenceUrl ?? null,
      resolutionMemo,
    },
  });

  await tx.predictionOption.update({
    where: { id: correctOptionId },
    data: { isResolved: true },
  });

  let winnerCount = 0;
  let loserCount = 0;
  let totalRefunded = 0;

  const hitsEmailData: ResolveEmailData["hits"] = [];
  const missesEmailData: ResolveEmailData["misses"] = [];

  // dedup: 참여자로 처리된 userId 추적 (작성자=참여자 케이스 대비)
  const notifiedUserIds = new Set<string>();

  for (const p of question.participations) {
    const isWinner = p.optionId === correctOptionId;

    if (isWinner) {
      const earnedScore = p.allocatedScore * 2;
      await applyScoreChange({
        userId: p.userId,
        type: "PREDICTION_WIN",
        amount: earnedScore,
        description: `예측 적중 — ${question.title}`,
        referenceId: questionId,
        referenceType: "PredictionQuestion",
        isSystemGenerated: true,
        tx,
      });
      await tx.predictionParticipation.update({
        where: { id: p.id },
        data: { status: "WON", earnedScore },
      });
      await tx.userProfile.update({
        where: { userId: p.userId },
        data: { correctPredictions: { increment: 1 } },
      });
      await tx.notification.create({
        data: {
          userId: p.userId,
          type: "PREDICTION_WIN",
          title: "예측 적중",
          body: `"${question.title}" — 배분 ${p.allocatedScore.toLocaleString()}점 → 성과 점수 ${earnedScore.toLocaleString()}점 환원`,
          data: { questionId, allocatedScore: p.allocatedScore, earnedScore },
        },
      });
      hitsEmailData.push({ userId: p.userId, nickname: p.user.nickname, earnedScore });
      winnerCount++;
      totalRefunded += earnedScore;
    } else {
      await applyScoreChange({
        userId: p.userId,
        type: "PREDICTION_LOSE",
        amount: 0,
        description: `예측 비적중 — ${question.title}`,
        referenceId: questionId,
        referenceType: "PredictionQuestion",
        isSystemGenerated: true,
        tx,
      });
      await tx.predictionParticipation.update({
        where: { id: p.id },
        data: { status: "LOST", earnedScore: 0 },
      });
      await tx.notification.create({
        data: {
          userId: p.userId,
          type: "PREDICTION_LOSE",
          title: "예측 비적중",
          body: `"${question.title}" — 배분 점수 ${p.allocatedScore.toLocaleString()}점 소진. 정답: "${correctOption.label}"`,
          data: { questionId, allocatedScore: p.allocatedScore, correctOptionLabel: correctOption.label },
        },
      });
      missesEmailData.push({ userId: p.userId, nickname: p.user.nickname, allocatedScore: p.allocatedScore });
      loserCount++;
    }

    notifiedUserIds.add(p.userId);
  }

  // 작성자 알림 — 작성자가 참여자이기도 한 경우 이미 PREDICTION_WIN/LOSE 알림이 발송되었으므로 skip
  if (!notifiedUserIds.has(question.authorId)) {
    await tx.notification.create({
      data: {
        userId: question.authorId,
        type: "QUESTION_RESOLVED",
        title: "내 예측 문제 결과 확정",
        body: `"${question.title}" 결과가 확정되었습니다. 적중 ${winnerCount}명 / 비적중 ${loserCount}명`,
        data: { questionId, winnerCount, loserCount, correctOptionLabel: correctOption.label },
      },
    });
  }

  await createAuditLog(
    {
      actorId: adminId,
      action: "QUESTION_RESOLVE",
      targetType: "PredictionQuestion",
      targetId: questionId,
      before: { status: "CLOSED" },
      after: {
        status: "RESOLVED",
        correctOptionId,
        correctOptionLabel: correctOption.label,
        resolutionMemo,
        resolutionEvidenceUrl: resolutionEvidenceUrl ?? null,
        winnerCount,
        loserCount,
        totalRefunded,
      },
    },
    tx
  );

  return {
    questionTitle: question.title,
    questionId,
    correctOptionLabel: correctOption.label,
    authorId: question.authorId,
    authorNickname: question.author.nickname,
    hits: hitsEmailData,
    misses: missesEmailData,
  };
}
