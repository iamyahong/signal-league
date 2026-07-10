import { Prisma } from "@prisma/client";
import { applyScoreChange } from "@/lib/score/applyScoreChange";
import { createAuditLog } from "@/lib/admin/audit";

export interface VoidQuestionParams {
  questionId: string;
  adminId: string;
  voidReason: string;
  userVisibleMessage: string;
  refundCreatorCost: boolean;
}

export interface VoidEmailData {
  questionTitle: string;
  userVisibleMessage: string;
  authorId: string;
  authorNickname: string;
  participants: Array<{ userId: string; nickname: string; refundedScore: number }>;
}

export async function voidQuestion(
  params: VoidQuestionParams,
  tx: Prisma.TransactionClient
): Promise<VoidEmailData> {
  const { questionId, adminId, voidReason, userVisibleMessage, refundCreatorCost } = params;

  const question = await tx.predictionQuestion.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      participations: {
        where: { deletedAt: null, status: { in: ["ACTIVE", "WON", "LOST"] } },
        include: { user: { select: { id: true, nickname: true } } },
      },
      author: { select: { id: true, nickname: true } },
    },
  });

  if (!["OPEN", "CLOSED", "RESOLVED"].includes(question.status)) {
    throw new Error(`무효 처리는 OPEN, CLOSED 또는 RESOLVED 상태에서만 가능합니다. 현재 상태: ${question.status}`);
  }

  await tx.predictionQuestion.update({
    where: { id: questionId },
    data: {
      status: "VOIDED",
      voidedAt: new Date(),
      voidedByUserId: adminId,
      voidReason,
      creatorCostRefunded: refundCreatorCost,
    },
  });

  let totalRefunded = 0;
  const participantsEmailData: VoidEmailData["participants"] = [];

  // dedup: 참여자로 처리된 userId 추적 (작성자=참여자 케이스 대비)
  const notifiedUserIds = new Set<string>();

  for (const p of question.participations) {
    await applyScoreChange({
      userId: p.userId,
      type: "QUESTION_VOID_REFUND",
      amount: p.allocatedScore,
      description: `예측 무효 환불 — ${question.title}`,
      referenceId: questionId,
      referenceType: "PredictionQuestion",
      isSystemGenerated: true,
      tx,
    });

    const earnedScore = p.earnedScore ?? 0;
    if (p.status === "WON" && earnedScore > 0) {
      await applyScoreChange({
        userId: p.userId,
        type: "SYSTEM_CORRECTION",
        amount: -earnedScore,
        description: `예측 무효 — 적중 점수 회수 — ${question.title}`,
        referenceId: questionId,
        referenceType: "PredictionQuestion",
        isSystemGenerated: true,
        tx,
      });
      await tx.userProfile.update({
        where: { userId: p.userId },
        data: {
          totalScore: { decrement: earnedScore },
          correctPredictions: { decrement: 1 },
          totalPredictions: { decrement: 1 },
        },
      });
    } else if (p.status === "LOST") {
      await tx.userProfile.update({
        where: { userId: p.userId },
        data: { totalPredictions: { decrement: 1 } },
      });
    }

    await tx.predictionParticipation.update({
      where: { id: p.id },
      data: { status: "REFUNDED", earnedScore: 0 },
    });

    // 참여자 알림 생성 — 작성자=참여자인 경우 생성 비용 환급 정보도 함께 포함
    const isAlsoAuthor = p.userId === question.authorId && refundCreatorCost && question.creatorCost > 0;
    const participantBody = isAlsoAuthor
      ? `"${question.title}" — ${userVisibleMessage}. 배분 점수 ${p.allocatedScore.toLocaleString()}점 및 생성 비용 ${question.creatorCost.toLocaleString()}점이 환불되었습니다.`
      : `"${question.title}" — ${userVisibleMessage}. 배분 점수 ${p.allocatedScore.toLocaleString()}점이 환불되었습니다.`;
    await tx.notification.create({
      data: {
        userId: p.userId,
        type: "QUESTION_VOIDED",
        title: "예측 문제 무효 처리",
        body: participantBody,
        data: {
          questionId,
          allocatedScore: p.allocatedScore,
          refundedScore: p.allocatedScore,
          ...(isAlsoAuthor ? { creatorCostRefunded: question.creatorCost } : {}),
        },
      },
    });

    notifiedUserIds.add(p.userId);

    participantsEmailData.push({
      userId: p.userId,
      nickname: p.user.nickname,
      refundedScore: p.allocatedScore,
    });

    totalRefunded += p.allocatedScore;
  }

  if (refundCreatorCost && question.creatorCost > 0) {
    await applyScoreChange({
      userId: question.authorId,
      type: "QUESTION_CREATE_REFUND",
      amount: question.creatorCost,
      description: `예측 문제 생성 비용 환불 — ${question.title}`,
      referenceId: questionId,
      referenceType: "PredictionQuestion",
      isSystemGenerated: true,
      tx,
    });
  }

  // 작성자 알림 — 작성자가 참여자이기도 한 경우 이미 참여자 알림이 발송되었으므로 skip
  if (!notifiedUserIds.has(question.authorId)) {
    await tx.notification.create({
      data: {
        userId: question.authorId,
        type: "QUESTION_VOIDED",
        title: "내 예측 문제 무효 처리",
        body: `"${question.title}" — ${userVisibleMessage}${refundCreatorCost ? ` 생성 비용 ${question.creatorCost.toLocaleString()}점이 환불되었습니다.` : ""}`,
        data: { questionId, voidReason, creatorCostRefunded: refundCreatorCost },
      },
    });
  }

  await createAuditLog(
    {
      actorId: adminId,
      action: "QUESTION_VOID",
      targetType: "PredictionQuestion",
      targetId: questionId,
      before: { status: question.status },
      after: {
        status: "VOIDED",
        voidReason,
        userVisibleMessage,
        refundCreatorCost,
        participantCount: question.participations.length,
        totalRefunded,
        creatorCostRefunded: refundCreatorCost ? question.creatorCost : 0,
      },
    },
    tx
  );

  return {
    questionTitle: question.title,
    userVisibleMessage,
    authorId: question.authorId,
    authorNickname: question.author.nickname,
    participants: participantsEmailData,
  };
}
