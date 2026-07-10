import prisma from "@/lib/prisma";
import { applyScoreChange } from "@/lib/score/applyScoreChange";
import { createAuditLog } from "@/lib/admin/audit";
import { QuestionStatus, ScoreLedgerType } from "@prisma/client";

export interface CreateQuestionInput {
  authorId: string;
  categoryId: string;
  title: string;
  description: string;
  resolutionCriteria: string;
  closesAt: Date;
  resolvesAt: Date;
  sourceUrls: string[];
  options: { label: string; description?: string }[];
  creatorCost: number;
}

export async function createQuestion(input: CreateQuestionInput) {
  return prisma.$transaction(async (tx) => {
    const question = await tx.predictionQuestion.create({
      data: {
        authorId: input.authorId,
        categoryId: input.categoryId,
        title: input.title,
        description: input.description,
        resolutionCriteria: input.resolutionCriteria,
        closesAt: input.closesAt,
        resolvesAt: input.resolvesAt,
        sourceUrls: input.sourceUrls.length > 0 ? input.sourceUrls : undefined,
        creatorCost: input.creatorCost,
        status: QuestionStatus.PENDING_REVIEW,
        options: {
          create: input.options.map((opt, idx) => ({
            label: opt.label,
            description: opt.description ?? null,
            sortOrder: idx,
          })),
        },
      },
      include: { options: true },
    });

    const ledger = await applyScoreChange({
      userId: input.authorId,
      type: ScoreLedgerType.QUESTION_CREATE_COST,
      amount: -input.creatorCost,
      description: `예측 문제 생성 비용 — ${input.title}`,
      referenceId: question.id,
      referenceType: "PredictionQuestion",
      isSystemGenerated: false,
      tx,
    });

    await createAuditLog(
      {
        actorId: input.authorId,
        action: "QUESTION_SUBMIT",
        targetType: "QUESTION",
        targetId: question.id,
        before: { availableScore: ledger.balanceBefore },
        after: {
          availableScore: ledger.balanceAfter,
          questionId: question.id,
          status: QuestionStatus.PENDING_REVIEW,
          creatorCost: input.creatorCost,
        },
      },
      tx,
    );

    return { question, ledger };
  });
}
