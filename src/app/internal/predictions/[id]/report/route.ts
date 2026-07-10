import { NextRequest, NextResponse } from "next/server";
import { requireBetaUser, handleAuthError, AuthError } from "@/lib/auth/requireUser";
import { reportSchema } from "@/lib/validation/prediction";
import prisma from "@/lib/prisma";
import { ReportTargetType } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBetaUser();
    const { id: questionId } = await params;

    const body = await req.json();
    const parsed = reportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "입력값을 확인해주세요.", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const question = await prisma.predictionQuestion.findUnique({ where: { id: questionId, deletedAt: null }, select: { id: true } });
    if (!question) {
      return NextResponse.json({ error: "예측 문제를 찾을 수 없습니다.", code: "NOT_FOUND" }, { status: 404 });
    }

    const report = await prisma.report.create({
      data: {
        reporterId: session.user.id,
        targetType: ReportTargetType.QUESTION,
        targetId: questionId,
        reason: parsed.data.reason,
        reviewNote: parsed.data.detail ?? null,
      },
    });

    return NextResponse.json({ success: true, reportId: report.id });
  } catch (e) {
    if (e instanceof AuthError) return handleAuthError(e);
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
