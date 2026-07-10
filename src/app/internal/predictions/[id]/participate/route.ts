import { NextRequest, NextResponse } from "next/server";
import { requireBetaUser, handleAuthError, AuthError } from "@/lib/auth/requireUser";
import { participate, ParticipateError } from "@/lib/prediction/participate";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBetaUser();
    const { id: questionId } = await params;

    const body = await req.json();
    console.log("participate request", session.user.email, body);

    const { participation, ledger } = await participate({
      userId: session.user.id,
      questionId,
      optionId: body.optionId,
      allocatedScore: body.allocatedScore,
      memo: body.memo,
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
