import { Prisma, QuestionStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/admin/audit";

export interface ApproveQuestionInput {
  questionId: string;
  adminId: string;
  memo?: string;
}

export interface ApproveQuestionEmailData {
  authorId: string;
  questionTitle: string;
  questionId: string;
}

export async function approveQuestion(
  input: ApproveQuestionInput,
  tx: Prisma.TransactionClient
): Promise<ApproveQuestionEmailData> {
  const question = await tx.predictionQuestion.findUnique({
    where: { id: input.questionId },
    select: { id: true, status: true, title: true, authorId: true },
  });
  if (!question) throw new Error("문제를 찾을 수 없습니다.");
  if (question.status !== QuestionStatus.PENDING_REVIEW) {
    throw new Error("검토 대기(PENDING_REVIEW) 상태의 문제만 승인할 수 있습니다.");
  }

  const now = new Date();

  await tx.predictionQuestion.update({
    where: { id: input.questionId },
    data: {
      status: QuestionStatus.OPEN,
      approvedAt: now,
      approvedByUserId: input.adminId,
    },
  });

  await tx.notification.create({
    data: {
      userId: question.authorId,
      type: "QUESTION_APPROVED",
      title: "예측 문제가 공개되었습니다",
      body: `'${question.title}' 문제가 승인되어 공개되었습니다. (공개 일시: ${now.toLocaleString("ko-KR")})`,
      data: { questionId: input.questionId },
    },
  });

  await createAuditLog(
    {
      actorId: input.adminId,
      action: "QUESTION_APPROVE",
      targetType: "PredictionQuestion",
      targetId: input.questionId,
      before: { status: question.status },
      after: {
        status: QuestionStatus.OPEN,
        approvedAt: now.toISOString(),
        memo: input.memo ?? null,
      },
    },
    tx
  );

  return {
    authorId: question.authorId,
    questionTitle: question.title,
    questionId: input.questionId,
  };
}
