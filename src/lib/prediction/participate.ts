import prisma from "@/lib/prisma";
import { applyScoreChange } from "@/lib/score/applyScoreChange";
import { grantReferralBonus } from "@/lib/referral/grantReferralBonus";
import { QuestionStatus, ScoreLedgerType } from "@prisma/client";

export interface ParticipateInput {
  userId: string;
  questionId: string;
  optionId: string;
  allocatedScore: number;
  memo?: string;
}

export async function participate(input: ParticipateInput) {
  return prisma.$transaction(async (tx) => {
    const question = await tx.predictionQuestion.findUnique({
      where: { id: input.questionId },
      select: { id: true, title: true, status: true, closesAt: true },
    });

    if (!question) throw new ParticipateError("예측 문제를 찾을 수 없습니다.", 404);
    if (question.status !== QuestionStatus.OPEN) {
      throw new ParticipateError("참여 가능한 예측 문제가 아닙니다.", 400);
    }
    if (question.closesAt && question.closesAt < new Date()) {
      throw new ParticipateError("참여가 마감된 예측입니다.", 400);
    }

    const existing = await tx.predictionParticipation.findUnique({
      where: { questionId_userId: { questionId: input.questionId, userId: input.userId } },
    });
    if (existing) throw new ParticipateError("이미 이 예측에 참여했습니다.", 409);

    const option = await tx.predictionOption.findUnique({
      where: { id: input.optionId },
      select: { id: true, questionId: true },
    });
    if (!option || option.questionId !== input.questionId) {
      throw new ParticipateError("유효하지 않은 선택지입니다.", 400);
    }

    if (input.allocatedScore < 10) {
      throw new ParticipateError("최소 배분 점수는 10점입니다.", 400);
    }

    const participation = await tx.predictionParticipation.create({
      data: {
        questionId: input.questionId,
        userId: input.userId,
        optionId: input.optionId,
        allocatedScore: input.allocatedScore,
        memo: input.memo ?? null,
      },
    });

    const ledger = await applyScoreChange({
      userId: input.userId,
      type: ScoreLedgerType.PREDICTION_ALLOCATE,
      amount: -input.allocatedScore,
      description: `예측 참여 — ${question.title}`,
      referenceId: participation.id,
      referenceType: "PredictionParticipation",
      isSystemGenerated: false,
      tx,
    });

    await tx.predictionOption.update({
      where: { id: input.optionId },
      data: {
        totalAllocated: { increment: input.allocatedScore },
        participantCount: { increment: 1 },
      },
    });

    await tx.predictionQuestion.update({
      where: { id: input.questionId },
      data: {
        totalParticipants: { increment: 1 },
        totalAllocated: { increment: input.allocatedScore },
      },
    });

    await grantReferralBonus({ userId: input.userId, tx });

    return { participation, ledger };
  });
}

export class ParticipateError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
  ) {
    super(message);
    this.name = "ParticipateError";
  }
}
