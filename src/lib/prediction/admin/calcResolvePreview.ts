import { Prisma } from "@prisma/client";

export interface ResolvePreviewResult {
  questionId: string;
  questionTitle: string;
  totalParticipants: number;
  totalAllocated: number;
  correctOptionId: string;
  correctOptionLabel: string;
  winners: {
    count: number;
    totalAllocated: number;
    totalRefund: number;
  };
  losers: {
    count: number;
    totalAllocated: number;
  };
  options: Array<{
    id: string;
    label: string;
    participantCount: number;
    totalAllocated: number;
    isCorrect: boolean;
  }>;
}

export async function calcResolvePreview(
  questionId: string,
  correctOptionId: string,
  tx: Prisma.TransactionClient
): Promise<ResolvePreviewResult> {
  const question = await tx.predictionQuestion.findUniqueOrThrow({
    where: { id: questionId },
    include: {
      options: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      participations: { where: { deletedAt: null, status: "ACTIVE" } },
    },
  });

  if (question.status !== "CLOSED") {
    throw new Error("미리보기는 CLOSED 상태 문제에서만 가능합니다.");
  }

  const correctOption = question.options.find((o) => o.id === correctOptionId);
  if (!correctOption) {
    throw new Error("정답 선택지가 이 문제에 속하지 않습니다.");
  }

  const winners = question.participations.filter((p) => p.optionId === correctOptionId);
  const losers = question.participations.filter((p) => p.optionId !== correctOptionId);

  const winnersAllocated = winners.reduce((sum, p) => sum + p.allocatedScore, 0);
  const losersAllocated = losers.reduce((sum, p) => sum + p.allocatedScore, 0);

  return {
    questionId,
    questionTitle: question.title,
    totalParticipants: question.totalParticipants,
    totalAllocated: question.totalAllocated,
    correctOptionId,
    correctOptionLabel: correctOption.label,
    winners: {
      count: winners.length,
      totalAllocated: winnersAllocated,
      totalRefund: winnersAllocated * 2,
    },
    losers: {
      count: losers.length,
      totalAllocated: losersAllocated,
    },
    options: question.options.map((o) => ({
      id: o.id,
      label: o.label,
      participantCount: o.participantCount,
      totalAllocated: o.totalAllocated,
      isCorrect: o.id === correctOptionId,
    })),
  };
}
