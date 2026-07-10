import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";
import { PlanCode } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  try {
    const session = await requireAdmin();
    const adminId = session.user.id;
    const { planCode, reason } = await req.json() as { planCode: PlanCode; reason: string };

    if (!Object.values(PlanCode).includes(planCode)) {
      return NextResponse.json({ error: "유효하지 않은 요금제입니다." }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: "사유를 입력해 주세요." }, { status: 400 });
    }

    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) return NextResponse.json({ error: "요금제를 찾을 수 없습니다." }, { status: 404 });

    const sub = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub) return NextResponse.json({ error: "구독 정보를 찾을 수 없습니다." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { userId },
        data: { planId: plan.id },
      });
      await createAuditLog({
        actorId: adminId,
        action: "PLAN_CHANGE",
        targetType: "USER",
        targetId: userId,
        before: { planCode: sub.plan.code },
        after: { planCode, reason },
      }, tx);
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    const msg = e instanceof Error ? e.message : "서버 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
