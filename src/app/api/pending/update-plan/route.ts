import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { PlanCode } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "인증이 필요합니다" }, { status: 401 });
  }

  const { planCode } = await req.json();
  if (!["BASIC", "STANDARD", "PRO"].includes(planCode)) {
    return NextResponse.json({ error: "유효하지 않은 요금제입니다" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { code: planCode as PlanCode } });
  if (!plan) {
    return NextResponse.json({ error: "요금제를 찾을 수 없습니다" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { desiredPlanCode: planCode as PlanCode },
  });

  await prisma.subscription.update({
    where: { userId: session.user.id },
    data: { planId: plan.id },
  });

  return NextResponse.json({ success: true });
}
