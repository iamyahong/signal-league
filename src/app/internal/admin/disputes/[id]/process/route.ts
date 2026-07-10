import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { processDispute } from "@/lib/dispute/processDispute";

function isAdmin(roles: string[]) {
  return roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = (session.user.roles as string[]) ?? [];
  if (!isAdmin(roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: disputeId } = await params;
  let body: {
    decision?: string;
    processingReason?: string;
    userVisibleResolutionMessage?: string;
    resultAction?: string;
    refundCreatorCost?: boolean;
    notifyOtherDisputers?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { decision, processingReason, userVisibleResolutionMessage, resultAction, refundCreatorCost, notifyOtherDisputers } = body;

  if (!decision || !["ACCEPTED", "REJECTED", "NEEDS_MORE_INFO"].includes(decision)) {
    return NextResponse.json({ error: "처리 결과를 선택해주세요." }, { status: 400 });
  }
  if (!processingReason) return NextResponse.json({ error: "처리 사유를 입력해주세요." }, { status: 400 });
  if (!userVisibleResolutionMessage) return NextResponse.json({ error: "사용자 표시 메시지를 입력해주세요." }, { status: 400 });

  try {
    await processDispute({
      disputeId,
      adminId: session.user.id,
      decision: decision as "ACCEPTED" | "REJECTED" | "NEEDS_MORE_INFO",
      processingReason,
      userVisibleResolutionMessage,
      resultAction: (resultAction as "NONE" | "VOIDED") ?? "NONE",
      refundCreatorCost: refundCreatorCost ?? false,
      notifyOtherDisputers: notifyOtherDisputers ?? false,
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string };
    return NextResponse.json({ error: err.message ?? "처리 중 오류가 발생했습니다." }, { status: err.code ?? 500 });
  }
}
