import { NextRequest, NextResponse } from "next/server";
import { requireSession, handleAuthError, AuthError } from "@/lib/auth/requireUser";
import prisma from "@/lib/prisma";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    const { id: commentId } = await params;

    const comment = await prisma.comment.findUnique({ where: { id: commentId, deletedAt: null }, select: { id: true, userId: true } });
    if (!comment) {
      return NextResponse.json({ error: "댓글을 찾을 수 없습니다.", code: "NOT_FOUND" }, { status: 404 });
    }

    const userId = session.user.id;
    const roles = (session.user.roles as string[]) || [];
    const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR");

    if (comment.userId !== userId && !isAdmin) {
      return NextResponse.json({ error: "본인 댓글만 삭제할 수 있습니다.", code: "FORBIDDEN" }, { status: 403 });
    }

    await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return handleAuthError(e);
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
