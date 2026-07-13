import { NextRequest, NextResponse } from "next/server";
import { requireBetaUser, handleAuthError, AuthError } from "@/lib/auth/requireUser";
import { participate, ParticipateError } from "@/lib/prediction/participate";
import { participateSchema } from "@/lib/validation/prediction";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBetaUser();
    const { id: questionId } = await params;

    const body = await req.json();
    console.log("participate request", session.user.email, body);

    // 요청 1: 입력 검증 — 필수 값·형식·허용 범위 확인
    const parsed = participateSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다.";
      return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    // 요청 2: DB 기반 속도 제한 — 같은 사용자의 최근 1분 제출 건수
    const since = new Date(Date.now() - 60 * 1000);
    const recentCount = await prisma.predictionParticipation.count({
      where: { userId: session.user.id, createdAt: { gte: since } },
    });
    if (recentCount >= 5) {
      return NextResponse.json({ error: "잠시 후 다시 시도해 주세요.", code: "RATE_LIMIT" }, { status: 429 });
    }

    const { participation, ledger } = await participate({
      userId: session.user.id,
      questionId,
      optionId: parsed.data.optionId,
      allocatedScore: parsed.data.allocatedScore,
      memo: parsed.data.memo,
    });

    return NextResponse.json({ success: true, participationId: participation.id, balanceAfter: ledger.balanceAfter });
  } catch (e) {
    if (e instanceof AuthError) return handleAuthError(e);
    if (e instanceof ParticipateError) {
      return NextResponse.json({ error: e.message, code: "PARTICIPATE_ERROR" }, { status: e.statusCode });
    }
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
