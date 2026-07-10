import { Prisma, QuestionStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/admin/audit";

export interface HideQuestionInput {
  questionId: string;
  adminId: string;
  hiddenReason: string;
  userVisibleMessage: string;
}

export async function hideQuestion(
  input: HideQuestionInput,
  tx: Prisma.TransactionClient
): Promise<void> {
  const question = await tx.predictionQuestion.findUnique({
    where: { id: input.questionId },
    select: {
      id: true,
      status: true,
      title: true,
      authorId: true,
      totalParticipants: true,
    },
  });
  if (!question) throw new Error("문제를 찾을 수 없습니다.");

  const unHideable: QuestionStatus[] = [
    QuestionStatus.HIDDEN,
    QuestionStatus.RESOLVED,
    QuestionStatus.VOIDED,
    QuestionStatus.REJECTED,
  ];
  if (unHideable.includes(question.status)) {
    throw new Error(`현재 상태(${question.status})에서는 숨김 처리할 수 없습니다.`);
  }

  const now = new Date();

  await tx.predictionQuestion.update({
    where: { id: input.questionId },
    data: {
      status: QuestionStatus.HIDDEN,
      hiddenAt: now,
      hiddenByUserId: input.adminId,
      hiddenReason: input.hiddenReason,
    },
  });

  const participations = await tx.predictionParticipation.findMany({
    where: { questionId: input.questionId, deletedAt: null },
    select: { userId: true },
    distinct: ["userId"],
  });

  const notifUserIds = [
    ...new Set([question.authorId, ...participations.map((p) => p.userId)]),
  ];

  await Promise.all(
    notifUserIds.map((userId) =>
      tx.notification.create({
        data: {
          userId,
          type: "QUESTION_HIDDEN",
          title: "예측 문제가 운영 정책에 의해 비공개 처리되었습니다",
          body: `'${question.title}' 문제가 비공개 처리되었습니다.\n\n안내: ${input.userVisibleMessage}\n\n배분 점수는 그대로 유지되며, 별도의 무효 처리가 있을 경우 개별 안내됩니다.`,
          data: { questionId: input.questionId },
        },
      })
    )
  );

  await createAuditLog(
    {
      actorId: input.adminId,
      action: "QUESTION_HIDE",
      targetType: "PredictionQuestion",
      targetId: input.questionId,
      before: { status: question.status },
      after: {
        status: QuestionStatus.HIDDEN,
        hiddenAt: now.toISOString(),
        hiddenReason: input.hiddenReason,
        userVisibleMessage: input.userVisibleMessage,
        notifiedUsers: notifUserIds.length,
      },
    },
    tx
  );
}
