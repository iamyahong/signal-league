import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitDispute } from "@/lib/dispute/submitDispute";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = session.user.status as string;
  if (!["BETA_ACTIVE", "ACTIVE"].includes(status)) {
    return NextResponse.json({ error: "베타 활성 회원만 이의제기할 수 있습니다." }, { status: 403 });
  }

  const { id: questionId } = await params;
  let body: { reason?: string; evidence?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { reason, evidence } = body;
  if (!reason) return NextResponse.json({ error: "이의제기 사유를 입력해주세요." }, { status: 400 });

  try {
    const result = await submitDispute({ questionId, userId: session.user.id, reason, evidence });
    return NextResponse.json({ success: true, disputeId: result.disputeId }, { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string };
    return NextResponse.json({ error: err.message ?? "이의제기 제출 중 오류가 발생했습니다." }, { status: err.code ?? 500 });
  }
}
