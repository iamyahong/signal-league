import { ReportStatus, ReportTargetType, Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/admin/audit";
import { deleteComment } from "@/lib/comment/deleteComment";

export type ProcessingResolution = "ACCEPTED" | "DISMISSED" | "NEEDS_MORE_INFO";

export interface FollowUpActions {
  deleteComment?: boolean;
  hideQuestion?: boolean;
  warnUser?: boolean;
  suspendUser?: boolean;
}

interface ProcessReportParams {
  reportId: string;
  adminId: string;
  resolution: ProcessingResolution;
  processingReason: string;
  userVisibleResolutionMessage?: string;
  notifyReporter?: boolean;
  notifyReportedUser?: boolean;
  followUpActions?: FollowUpActions;
}

export interface ProcessReportResult {
  reporterId: string | null;
  reporterNickname: string | null;
  resolution: ProcessingResolution;
}

export async function processReport(
  params: ProcessReportParams,
  tx: Prisma.TransactionClient
): Promise<ProcessReportResult> {
  const report = await tx.report.findUnique({
    where: { id: params.reportId },
    select: {
      id: true,
      status: true,
      targetType: true,
      targetId: true,
      reporterId: true,
      reporter: { select: { nickname: true } },
    },
  });

  if (!report) throw new Error("신고를 찾을 수 없습니다.");
  if (
    report.status === ReportStatus.ACCEPTED ||
    report.status === ReportStatus.DISMISSED
  ) {
    throw new Error("이미 처리된 신고입니다.");
  }

  const newStatus =
    params.resolution === "ACCEPTED"
      ? ReportStatus.ACCEPTED
      : params.resolution === "DISMISSED"
        ? ReportStatus.DISMISSED
        : ReportStatus.NEEDS_MORE_INFO;

  const now = new Date();
  const actions = params.followUpActions ?? {};
  const visibleMsg =
    params.userVisibleResolutionMessage ?? "운영 정책에 따라 처리가 완료되었습니다.";

  // Resolve the reported user ID from target
  let reportedUserId: string | null = null;
  if (report.targetType === ReportTargetType.COMMENT) {
    const comment = await tx.comment.findUnique({
      where: { id: report.targetId },
      select: { userId: true },
    });
    reportedUserId = comment?.userId ?? null;
  } else if (report.targetType === ReportTargetType.QUESTION) {
    const question = await tx.predictionQuestion.findUnique({
      where: { id: report.targetId },
      select: { authorId: true },
    });
    reportedUserId = question?.authorId ?? null;
  }

  // Update report status
  await tx.report.update({
    where: { id: params.reportId },
    data: {
      status: newStatus,
      reviewedBy: params.adminId,
      reviewedAt: now,
      processedAt: now,
      processedByAdminId: params.adminId,
      processingReason: params.processingReason,
      processingResolution: params.resolution,
      notifyReporter: params.notifyReporter ?? false,
      notifyReportedUser: params.notifyReportedUser ?? false,
      userVisibleResolutionMessage: params.userVisibleResolutionMessage,
    },
  });

  // Follow-up actions — all within the same transaction
  if (actions.deleteComment && report.targetType === ReportTargetType.COMMENT) {
    await deleteComment(
      {
        commentId: report.targetId,
        adminId: params.adminId,
        deletionReason: params.processingReason,
        userVisibleDeletionMessage: visibleMsg,
        notifyAuthor: false,
      },
      tx
    );
  }

  if (actions.hideQuestion && report.targetType === ReportTargetType.QUESTION) {
    await tx.predictionQuestion.update({
      where: { id: report.targetId },
      data: { status: "HIDDEN" },
    });
  }

  if (actions.suspendUser && reportedUserId) {
    await tx.user.update({
      where: { id: reportedUserId },
      data: { status: "SUSPENDED" },
    });
  }

  // In-app notifications — same transaction
  if (params.notifyReporter && report.reporterId) {
    const isFinalized = params.resolution !== "NEEDS_MORE_INFO";
    await tx.notification.create({
      data: {
        userId: report.reporterId,
        type: "REPORT_HANDLED",
        title: params.resolution === "ACCEPTED" ? "신고 처리 완료" : "신고 처리 결과",
        body: params.resolution === "ACCEPTED"
          ? "접수하신 신고가 검토되어 필요한 조치가 진행되었습니다."
          : params.resolution === "DISMISSED"
            ? "접수하신 신고를 검토했으나 별도 조치는 진행되지 않았습니다."
            : "신고 내용을 검토 중입니다. 추가 확인이 필요합니다.",
        data: { reportId: params.reportId, resolution: params.resolution },
      },
    });
  }

  if (params.notifyReportedUser && reportedUserId) {
    const titleByAction = actions.deleteComment
      ? "작성하신 댓글이 삭제되었습니다"
      : actions.suspendUser
        ? "계정이 정지되었습니다"
        : actions.hideQuestion
          ? "예측 문제가 숨김 처리되었습니다"
          : "운영 처리 안내";

    await tx.notification.create({
      data: {
        userId: reportedUserId,
        type: "REPORT_PROCESSED",
        title: titleByAction,
        body: visibleMsg,
      },
    });
  }

  if (actions.warnUser && reportedUserId) {
    await tx.notification.create({
      data: {
        userId: reportedUserId,
        type: "USER_WARNING",
        title: "운영 경고",
        body: visibleMsg,
      },
    });
  }

  await createAuditLog(
    {
      actorId: params.adminId,
      action: "ADMIN_PROCESS_REPORT",
      targetType: "Report",
      targetId: params.reportId,
      before: { status: report.status },
      after: {
        resolution: params.resolution,
        processingReason: params.processingReason,
        followUpActions: actions,
        notifyReporter: params.notifyReporter ?? false,
        notifyReportedUser: params.notifyReportedUser ?? false,
      },
    },
    tx
  );

  return {
    reporterId: params.notifyReporter ? (report.reporterId ?? null) : null,
    reporterNickname: params.notifyReporter ? (report.reporter?.nickname ?? null) : null,
    resolution: params.resolution,
  };
}
