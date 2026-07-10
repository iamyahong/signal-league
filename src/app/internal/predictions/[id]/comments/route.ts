import { NextRequest, NextResponse } from "next/server";
import { requireBetaUser, handleAuthError, AuthError } from "@/lib/auth/requireUser";
import { commentSchema } from "@/lib/validation/prediction";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 10;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: questionId } = await params;
    const page = parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10);
    const skip = (page - 1) * PAGE_SIZE;

    // Include active comments AND admin-deleted comments (Option C).
    // User-deleted comments (deletedAt NOT NULL AND deletedByAdminId NULL) are fully excluded.
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          questionId,
          parentId: null,
          OR: [
            { deletedAt: null },
            { deletedByAdminId: { not: null } },
          ],
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          content: true,
          commentType: true,
          createdAt: true,
          deletedAt: true,
          deletedByAdminId: true,
          userVisibleDeletionMessage: true,
          user: { select: { id: true, nickname: true } },
        },
      }),
      prisma.comment.count({
        where: {
          questionId,
          parentId: null,
          OR: [
            { deletedAt: null },
            { deletedByAdminId: { not: null } },
          ],
        },
      }),
    ]);

    // Apply Option C masking: admin-deleted → show meta only, mask content
    const mappedComments = comments.map((c) => {
      const deletedByAdmin = c.deletedAt !== null && c.deletedByAdminId !== null;
      return {
        id: c.id,
        commentType: c.commentType,
        createdAt: c.createdAt,
        deletedByAdmin,
        content: deletedByAdmin ? null : c.content,
        userVisibleDeletionMessage: deletedByAdmin
          ? (c.userVisibleDeletionMessage ?? "운영자에 의해 삭제된 댓글입니다.")
          : null,
        user: c.user,
      };
    });

    return NextResponse.json({
      comments: mappedComments,
      total,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.ceil(total / PAGE_SIZE),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다.", code: "SERVER_ERROR" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireBetaUser();
    const { id: questionId } = await params;

    const body = await req.json();
    const parsed = commentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "입력값을 확인해주세요.", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const question = await prisma.predictionQuestion.findUnique({ where: { id: questionId, deletedAt: null }, select: { id: true } });
    if (!question) {
      return NextResponse.json({ error: "예측 문제를 찾을 수 없습니다.", code: "NOT_FOUND" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        questionId,
        userId: session.user.id,
        content: parsed.data.content,
        commentType: parsed.data.commentType,
        parentId: parsed.data.parentId ?? null,
      },
      include: { user: { select: { id: true, nickname: true } } },
    });

    return NextResponse.json({ success: true, comment }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return handleAuthError(e);
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
