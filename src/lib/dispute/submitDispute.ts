import prisma from "@/lib/prisma";
import { createAuditLog } from "@/lib/admin/audit";

export interface SubmitDisputeParams {
  questionId: string;
  userId: string;
  reason: string;
  evidence?: string;
}

export interface SubmitDisputeResult {
  disputeId: string;
}

export async function submitDispute(params: SubmitDisputeParams): Promise<SubmitDisputeResult> {
  const { questionId, userId, reason, evidence } = params;

  if (reason.length < 50 || reason.length > 500) {
    throw Object.assign(new Error("이의제기 사유는 50자 이상 500자 이하여야 합니다."), { code: 400 });
  }

  const question = await prisma.predictionQuestion.findUnique({
    where: { id: questionId, deletedAt: null },
    select: { id: true, title: true, status: true, resolvedAt: true },
  });

  if (!question) {
    throw Object.assign(new Error("예측 문제를 찾을 수 없습니다."), { code: 404 });
  }

  if (question.status !== "RESOLVED") {
    throw Object.assign(new Error("결과가 확정된 문제에만 이의제기할 수 있습니다."), { code: 400 });
  }

  const participation = await prisma.predictionParticipation.findUnique({
    where: { questionId_userId: { questionId, userId } },
  });

  if (!participation) {
    throw Object.assign(new Error("해당 문제에 참여한 회원만 이의제기할 수 있습니다."), { code: 403 });
  }

  const disputePeriodSetting = await prisma.serviceSetting.findUnique({
    where: { key: "dispute_period_hours" },
  });
  const disputeHours = parseInt(disputePeriodSetting?.value ?? "72", 10);

  if (question.resolvedAt) {
    const deadlineMs = new Date(question.resolvedAt).getTime() + disputeHours * 60 * 60 * 1000;
    if (Date.now() > deadlineMs) {
      throw Object.assign(new Error(`이의제기 가능 기간(${disputeHours}시간)이 지났습니다.`), { code: 410 });
    }
  }

  const existing = await prisma.dispute.findUnique({
    where: { questionId_userId: { questionId, userId } },
  });

  if (existing) {
    throw Object.assign(new Error("이미 이 문제에 이의제기를 제출하셨습니다."), { code: 409 });
  }

  const dispute = await prisma.$transaction(async (tx) => {
    const d = await tx.dispute.create({
      data: {
        questionId,
        userId,
        reason,
        evidence: evidence ?? null,
        status: "PENDING",
      },
    });

    const adminUsers = await tx.userRole.findMany({
      where: { role: { in: ["SUPER_ADMIN", "OPERATOR"] }, deletedAt: null },
      select: { userId: true },
    });

    for (const admin of adminUsers) {
      await tx.notification.create({
        data: {
          userId: admin.userId,
          type: "DISPUTE_SUBMITTED",
          title: "새 이의제기 접수",
          body: `"${question.title}" 문제에 이의제기가 접수되었습니다.`,
          data: { disputeId: d.id, questionId, submittedBy: userId },
        },
      });
    }

    await createAuditLog(
      {
        actorId: userId,
        action: "DISPUTE_SUBMIT",
        targetType: "Dispute",
        targetId: d.id,
        after: { questionId, reason: reason.slice(0, 100), hasEvidence: !!evidence },
      },
      tx
    );

    return d;
  });

  return { disputeId: dispute.id };
}
