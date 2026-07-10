import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { hideQuestion } from "@/lib/prediction/admin/hideQuestion";
import { z } from "zod";

const bodySchema = z.object({
  hiddenReason: z.string().min(1, "숨김 사유를 입력해 주세요."),
  userVisibleMessage: z.string().min(1, "참여자 표시 메시지를 입력해 주세요."),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await hideQuestion(
        {
          questionId: id,
          adminId: session.user.id,
          hiddenReason: parsed.data.hiddenReason,
          userVisibleMessage: parsed.data.userVisibleMessage,
        },
        tx
      );
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
