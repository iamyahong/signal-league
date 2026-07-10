import { Prisma, QuestionStatus, ScoreLedgerType } from "@prisma/client";
import { createAuditLog } from "@/lib/admin/audit";
import { applyScoreChange } from "@/lib/score/applyScoreChange";

export interface RejectQuestionInput {
  questionId: string;
  adminId: string;
  rejectionReason: string;
  userVisibleRejectionMessage: string;
  refund: boolean;
  refundDecisionNote?: string;
}

export interface RejectQuestionEmailData {
  authorId: string;
  questionTitle: string;
  userVisibleRejectionMessage: string;
}

export async function rejectQuestion(
  input: RejectQuestionInput,
  tx: Prisma.TransactionClient
): Promise<RejectQuestionEmailData> {
  const question = await tx.predictionQuestion.findUnique({
    where: { id: input.questionId },
    select: {
      id: true,
      status: true,
      title: true,
      authorId: true,
      creatorCost: true,
    },
  });
  if (!question) throw new Error("문제를 찾을 수 없습니다.");
  if (question.status !== QuestionStatus.PENDING_REVIEW) {
    throw new Error("검토 대기(PENDING_REVIEW) 상태의 문제만 반려할 수 있습니다.");
  }

  const now = new Date();

  await tx.predictionQuestion.update({
    where: { id: input.questionId },
    data: {
      status: QuestionStatus.REJECTED,
      rejectedAt: now,
      rejectedByUserId: input.adminId,
      rejectionReason: input.rejectionReason,
      userVisibleRejectionMessage: input.userVisibleRejectionMessage,
    },
  });

  let refundAmount = 0;
  if (input.refund && question.creatorCost > 0) {
    refundAmount = question.creatorCost;
    await applyScoreChange({
      userId: question.authorId,
      type: ScoreLedgerType.QUESTION_CREATE_REFUND,
      amount: refundAmount,
      description: `예측 문제 반려에 따른 생성 비용 반환 — ${question.title.slice(0, 40)}`,
      referenceId: input.questionId,
      referenceType: "PredictionQuestion",
      isSystemGenerated: true,
      tx,
    });
  }

  const notifBody = input.refund
    ? `'${question.title}' 문제가 반려되었습니다.\n\n사유: ${input.userVisibleRejectionMessage}\n\n생성 비용 ${question.creatorCost.toLocaleString()}점이 반환되었습니다.`
    : `'${question.title}' 문제가 반려되었습니다.\n\n사유: ${input.userVisibleRejectionMessage}\n\n생성 비용은 반환되지 않습니다.`;

  await tx.notification.create({
    data: {
      userId: question.authorId,
      type: "QUESTION_REJECTED",
      title: "예측 문제가 반려되었습니다",
      body: notifBody,
      data: {
        questionId: input.questionId,
        refunded: input.refund,
        refundAmount,
      },
    },
  });

  await createAuditLog(
    {
      actorId: input.adminId,
      action: "QUESTION_REJECT",
      targetType: "PredictionQuestion",
      targetId: input.questionId,
      before: { status: question.status },
      after: {
        status: QuestionStatus.REJECTED,
        rejectedAt: now.toISOString(),
        rejectionReason: input.rejectionReason,
        userVisibleRejectionMessage: input.userVisibleRejectionMessage,
        refunded: input.refund,
        refundAmount,
        refundDecisionNote: input.refundDecisionNote ?? null,
      },
    },
    tx
  );

  return {
    authorId: question.authorId,
    questionTitle: question.title,
    userVisibleRejectionMessage: input.userVisibleRejectionMessage,
  };
}
