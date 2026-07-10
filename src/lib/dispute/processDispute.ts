import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/admin/audit";
import { voidQuestion } from "@/lib/prediction/admin/voidQuestion";
import { DisputeStatus } from "@prisma/client";
import { sendEmailNotification } from "@/lib/emailNotification";
import { disputeHandledTemplate } from "@/lib/emailTemplates";

export type DisputeDecision = "ACCEPTED" | "REJECTED" | "NEEDS_MORE_INFO";
export type DisputeResultAction = "NONE" | "VOIDED";

export interface ProcessDisputeParams {
  disputeId: string;
  adminId: string;
  decision: DisputeDecision;
  processingReason: string;
  userVisibleResolutionMessage: string;
  resultAction?: DisputeResultAction;
  refundCreatorCost?: boolean;
  notifyOtherDisputers?: boolean;
}

const TITLE_MAP: Record<DisputeDecision, string> = {
  ACCEPTED: "이의제기 인용",
  REJECTED: "이의제기 검토 결과",
  NEEDS_MORE_INFO: "이의제기 추가 정보 요청",
};

const BODY_MAP: Record<DisputeDecision, string> = {
  ACCEPTED: "제출하신 이의제기가 인용되어 결과가 조정되었습니다. 자세한 내용은 문제 상세 페이지에서 확인해 주세요.",
  REJECTED: "제출하신 이의제기를 검토한 결과, 기존 결과를 유지하기로 결정했습니다.",
  NEEDS_MORE_INFO: "이의제기 검토를 위해 추가 정보가 필요합니다. 알림 페이지에서 자세한 내용을 확인해 주세요.",
};

export async function processDispute(params: ProcessDisputeParams): Promise<void> {
  const {
    disputeId,
    adminId,
    decision,
    processingReason,
    userVisibleResolutionMessage,
    resultAction = "NONE",
    refundCreatorCost = false,
    notifyOtherDisputers = false,
  } = params;

  if (!processingReason || processingReason.length < 1) {
    throw Object.assign(new Error("처리 사유를 입력해주세요."), { code: 400 });
  }
  if (!userVisibleResolutionMessage || userVisibleResolutionMessage.length < 1) {
    throw Object.assign(new Error("사용자 표시 메시지를 입력해주세요."), { code: 400 });
  }

  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    include: {
      question: { select: { id: true, title: true, status: true, authorId: true } },
      user: { select: { id: true, nickname: true } },
    },
  });

  if (!dispute) {
    throw Object.assign(new Error("이의제기를 찾을 수 없습니다."), { code: 404 });
  }

  if (dispute.status === "ACCEPTED" || dispute.status === "REJECTED") {
    throw Object.assign(new Error("이미 처리된 이의제기입니다."), { code: 409 });
  }

  if (decision === "ACCEPTED" && resultAction === "VOIDED" && dispute.question.status !== "RESOLVED") {
    throw Object.assign(new Error("무효 처리는 RESOLVED 상태 문제에만 가능합니다."), { code: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.dispute.update({
      where: { id: disputeId },
      data: {
        status: decision as DisputeStatus,
        processedAt: new Date(),
        processedByUserId: adminId,
        processingReason,
        userVisibleResolutionMessage,
        resultAction: decision === "ACCEPTED" ? resultAction : "NONE",
        reviewedBy: adminId,
        reviewedAt: new Date(),
        reviewNote: processingReason,
      },
    });

    if (decision === "ACCEPTED" && resultAction === "VOIDED") {
      await voidQuestion(
        {
          questionId: dispute.questionId,
          adminId,
          voidReason: `이의제기 수락에 따른 무효 처리 — ${processingReason}`,
          userVisibleMessage: userVisibleResolutionMessage,
          refundCreatorCost,
        },
        tx
      );
    }

    // 제출자 인앱 알림
    await tx.notification.create({
      data: {
        userId: dispute.userId,
        type: "DISPUTE_HANDLED",
        title: TITLE_MAP[decision],
        body: BODY_MAP[decision],
        data: { disputeId, questionId: dispute.questionId, decision, resultAction },
      },
    });

    if (notifyOtherDisputers) {
      const otherDisputes = await tx.dispute.findMany({
        where: {
          questionId: dispute.questionId,
          id: { not: disputeId },
          deletedAt: null,
          status: { in: ["PENDING", "REVIEWING"] },
        },
        select: { userId: true },
      });

      for (const d of otherDisputes) {
        await tx.notification.create({
          data: {
            userId: d.userId,
            type: "DISPUTE_HANDLED",
            title: "같은 문제 이의제기 처리 결과 안내",
            body: `"${dispute.question.title}" 문제에 제출된 이의제기가 처리되었습니다: ${userVisibleResolutionMessage}`,
            data: { questionId: dispute.questionId, decision },
          },
        });
      }
    }

    await createAuditLog(
      {
        actorId: adminId,
        action: "DISPUTE_PROCESS",
        targetType: "Dispute",
        targetId: disputeId,
        before: { status: dispute.status },
        after: {
          status: decision,
          processingReason,
          userVisibleResolutionMessage,
          resultAction: decision === "ACCEPTED" ? resultAction : "NONE",
          refundCreatorCost: decision === "ACCEPTED" && resultAction === "VOIDED" ? refundCreatorCost : null,
          notifyOtherDisputers,
        },
      },
      tx
    );
  });

  // 이메일 — 트랜잭션 commit 후
  const tpl = disputeHandledTemplate({
    nickname: dispute.user.nickname,
    decision,
    questionTitle: dispute.question.title,
    questionId: dispute.questionId,
  });
  await sendEmailNotification({
    userId: dispute.userId,
    type: "DISPUTE_HANDLED",
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    preferenceKey: "DISPUTE_HANDLED",
  });
}
