import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { deleteComment } from "@/lib/comment/deleteComment";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  deletionReason: z.string().min(1).max(500),
  userVisibleDeletionMessage: z.string().max(300).optional(),
  notifyAuthor: z.boolean().optional().default(true),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }

  const { id: commentId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      await deleteComment(
        {
          commentId,
          adminId: session.user.id,
          deletionReason: parsed.data.deletionReason,
          userVisibleDeletionMessage: parsed.data.userVisibleDeletionMessage,
          notifyAuthor: parsed.data.notifyAuthor,
        },
        tx
      );
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "이미 삭제된 댓글입니다.")
      return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof Error && e.message === "댓글을 찾을 수 없습니다.")
      return NextResponse.json({ error: e.message }, { status: 404 });
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
