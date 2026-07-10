import { requireAdmin } from "@/lib/admin/auth";
import { AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 30;
  const adminDeleted = searchParams.get("adminDeleted");
  const hidden = searchParams.get("hidden");
  const q = searchParams.get("q") ?? "";

  const where: Prisma.CommentWhereInput = {
    ...(adminDeleted === "1"
      ? { deletedByAdminId: { not: null } }
      : adminDeleted === "0"
        ? { deletedByAdminId: null, deletedAt: null }
        : { deletedAt: null }),
    ...(hidden === "1" ? { isHidden: true } : hidden === "0" ? { isHidden: false } : {}),
    ...(q ? { content: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, nickname: true, email: true } },
        question: { select: { id: true, title: true } },
      },
    }),
  ]);

  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      content: c.content,
      commentType: c.commentType,
      isHidden: c.isHidden,
      deletedAt: c.deletedAt?.toISOString() ?? null,
      deletedByAdminId: c.deletedByAdminId,
      deletionReason: c.deletionReason,
      userVisibleDeletionMessage: c.userVisibleDeletionMessage,
      createdAt: c.createdAt.toISOString(),
      user: c.user,
      question: c.question,
    })),
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  });
}
