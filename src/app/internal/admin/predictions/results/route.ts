import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { QuestionStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const sort = searchParams.get("sort") ?? "oldest";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const where = {
    status: QuestionStatus.CLOSED,
    deletedAt: null,
    ...(categoryId ? { categoryId } : {}),
    ...(filter === "overdue" ? { resolvesAt: { lte: now } } : {}),
    ...(filter === "newly-closed" ? { lastAutoClosedAt: { gte: last24h } } : {}),
  };

  const orderBy =
    sort === "participants" ? { totalParticipants: "desc" as const }
    : sort === "resolves"  ? { resolvesAt: "asc" as const }
    : { closesAt: "asc" as const };

  const [questions, total, overdueCount, newlyClosedCount, todayResolved] = await Promise.all([
    prisma.predictionQuestion.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        category: { select: { id: true, slug: true, name: true } },
        author: { select: { id: true, nickname: true } },
        options: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.predictionQuestion.count({ where }),
    prisma.predictionQuestion.count({
      where: { status: QuestionStatus.CLOSED, deletedAt: null, resolvesAt: { lte: now } },
    }),
    prisma.auditLog.count({
      where: { action: "AUTO_CLOSE_QUESTION", createdAt: { gte: last24h }, deletedAt: null },
    }),
    prisma.predictionQuestion.count({
      where: {
        status: { in: [QuestionStatus.RESOLVED, QuestionStatus.VOIDED] },
        deletedAt: null,
        resolvedAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
      },
    }),
  ]);

  return NextResponse.json({
    questions,
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
    kpis: {
      closedCount: await prisma.predictionQuestion.count({ where: { status: QuestionStatus.CLOSED, deletedAt: null } }),
      overdueCount,
      newlyClosedCount,
      todayResolved,
    },
  });
}
