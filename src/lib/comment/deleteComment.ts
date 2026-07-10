import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/admin/audit";

interface DeleteCommentParams {
  commentId: string;
  adminId: string;
  deletionReason: string;
  userVisibleDeletionMessage?: string;
  notifyAuthor?: boolean;
}

export async function deleteComment(
  params: DeleteCommentParams,
  tx: Prisma.TransactionClient
): Promise<void> {
  const { commentId, adminId, deletionReason, userVisibleDeletionMessage, notifyAuthor } = params;

  const comment = await tx.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      content: true,
      userId: true,
      questionId: true,
      deletedAt: true,
      deletedByAdminId: true,
    },
  });

  if (!comment) throw new Error("댓글을 찾을 수 없습니다.");
  if (comment.deletedAt) throw new Error("이미 삭제된 댓글입니다.");

  const visibleMessage =
    userVisibleDeletionMessage ?? "운영자에 의해 삭제된 댓글입니다.";

  await tx.comment.update({
    where: { id: commentId },
    data: {
      deletedAt: new Date(),
      deletedByAdminId: adminId,
      deletionReason,
      userVisibleDeletionMessage: visibleMessage,
    },
  });

  if (notifyAuthor) {
    await tx.notification.create({
      data: {
        userId: comment.userId,
        type: "COMMENT_DELETED",
        title: "댓글이 삭제되었습니다",
        body: visibleMessage,
      },
    });
  }

  await createAuditLog(
    {
      actorId: adminId,
      action: "ADMIN_DELETE_COMMENT",
      targetType: "Comment",
      targetId: commentId,
      before: { content: comment.content.slice(0, 200) },
      after: { deletionReason, notifyAuthor: notifyAuthor ?? false },
    },
    tx
  );
}
