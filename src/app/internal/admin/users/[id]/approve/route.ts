import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import { applyScoreChange } from "@/lib/score/applyScoreChange";
import { createAuditLog } from "@/lib/admin/audit";
import { PlanCode, UserStatus, SubscriptionStatus, ScoreLedgerType } from "@prisma/client";
import { sendEmailNotification } from "@/lib/emailNotification";
import { betaApprovedTemplate } from "@/lib/emailTemplates";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  try {
    const session = await requireAdmin();
    const adminId = session.user.id;
    const body = await req.json();
    const { planCode, reason } = body as { planCode: PlanCode; reason?: string };

    if (!Object.values(PlanCode).includes(planCode)) {
      return NextResponse.json({ error: "유효하지 않은 요금제입니다." }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) return NextResponse.json({ error: "요금제를 찾을 수 없습니다." }, { status: 404 });

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true, subscription: true },
    });
    if (!targetUser) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    if (targetUser.status !== UserStatus.PENDING_BETA) {
      return NextResponse.json({ error: "베타 승인 대기 상태의 회원만 승인할 수 있습니다." }, { status: 400 });
    }

    const beforeSnapshot = {
      status: targetUser.status,
      planId: targetUser.subscription?.planId,
      availableScore: targetUser.profile?.availableScore ?? 0,
    };

    const result = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.BETA_ACTIVE },
      });

      const now = new Date();
      if (targetUser.subscription) {
        await tx.subscription.update({
          where: { userId },
          data: {
            planId: plan.id,
            status: SubscriptionStatus.BETA_ACTIVE,
            betaApprovedAt: now,
            betaApprovedBy: adminId,
          },
        });
      } else {
        await tx.subscription.create({
          data: {
            userId,
            planId: plan.id,
            status: SubscriptionStatus.BETA_ACTIVE,
            betaApprovedAt: now,
            betaApprovedBy: adminId,
          },
        });
      }

      const scoreResult = await applyScoreChange({
        userId,
        type: ScoreLedgerType.PLAN_GRANT,
        amount: plan.monthlyScore,
        description: `베타 승인 — ${plan.name} 요금제 월 지급 점수`,
        referenceId: targetUser.subscription?.id,
        referenceType: "Subscription",
        createdByUserId: adminId,
        isSystemGenerated: false,
        tx,
      });

      await tx.notification.create({
        data: {
          userId,
          type: "BETA_APPROVED",
          title: "베타 승인 완료",
          body: `Signal League 베타 회원으로 승인되었습니다. ${plan.name} 요금제 기준 ${plan.monthlyScore.toLocaleString()}점이 지급되었습니다.`,
        },
      });

      await createAuditLog({
        actorId: adminId,
        action: "BETA_APPROVE",
        targetType: "USER",
        targetId: userId,
        before: beforeSnapshot,
        after: {
          status: UserStatus.BETA_ACTIVE,
          planCode,
          availableScore: scoreResult.balanceAfter,
        },
      }, tx);

      return scoreResult;
    });

    // 트랜잭션 완료 후 이메일 발송 (실패해도 비즈니스 로직에 영향 없음)
    void sendEmailNotification({
      userId,
      type: "BETA_APPROVED",
      ...betaApprovedTemplate({
        nickname: targetUser.nickname,
        plan: planCode as "BASIC" | "STANDARD" | "PRO",
        initialScore: plan.monthlyScore,
      }),
      forceEmailRegardlessOfPreference: true,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    const msg = e instanceof Error ? e.message : "서버 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
