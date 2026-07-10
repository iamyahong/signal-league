import { Prisma, QuestionStatus } from "@prisma/client";
import { createAuditLog } from "@/lib/admin/audit";

export interface ForceCloseQuestionInput {
  questionId: string;
  adminId: string;
  forceCloseReason: string;
  userVisibleMessage?: string;
}

export async function forceCloseQuestion(
  input: ForceCloseQuestionInput,
  tx: Prisma.TransactionClient
): Promise<void> {
  const question = await tx.predictionQuestion.findUnique({
    where: { id: input.questionId },
    select: {
      id: true,
      status: true,
      title: true,
      authorId: true,
      closesAt: true,
    },
  });
  if (!question) throw new Error("문제를 찾을 수 없습니다.");
  if (question.status !== QuestionStatus.OPEN) {
    throw new Error("진행 중(OPEN) 상태의 문제만 강제 마감할 수 있습니다.");
  }

  const now = new Date();

  await tx.predictionQuestion.update({
    where: { id: input.questionId },
    data: {
      status: QuestionStatus.CLOSED,
      closesAt: now,
      forceClosedAt: now,
      forceClosedByUserId: input.adminId,
      forceCloseReason: input.forceCloseReason,
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

  const bodyBase = input.userVisibleMessage
    ? `'${question.title}' 예측 문제가 운영 정책에 따라 조기 마감되었습니다.\n\n안내: ${input.userVisibleMessage}\n\n결과 확정은 별도로 진행될 예정입니다.`
    : `'${question.title}' 예측 문제가 운영 정책에 따라 조기 마감되었습니다. 결과 확정은 별도로 진행될 예정입니다.`;

  await Promise.all(
    notifUserIds.map((userId) =>
      tx.notification.create({
        data: {
          userId,
          type: "QUESTION_FORCE_CLOSED",
          title: "예측 문제가 조기 마감되었습니다",
          body: bodyBase,
          data: { questionId: input.questionId },
        },
      })
    )
  );

  await createAuditLog(
    {
      actorId: input.adminId,
      action: "QUESTION_FORCE_CLOSE",
      targetType: "PredictionQuestion",
      targetId: input.questionId,
      before: {
        status: question.status,
        closesAt: question.closesAt?.toISOString() ?? null,
      },
      after: {
        status: QuestionStatus.CLOSED,
        closesAt: now.toISOString(),
        forceClosedAt: now.toISOString(),
        forceCloseReason: input.forceCloseReason,
        userVisibleMessage: input.userVisibleMessage ?? null,
        notifiedUsers: notifUserIds.length,
      },
    },
    tx
  );
}
