import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }

  const { id } = await params;

  const question = await prisma.predictionQuestion.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          nickname: true,
          email: true,
          createdAt: true,
          profile: { select: { availableScore: true } },
        },
      },
      category: { select: { id: true, name: true, slug: true } },
      options: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!question) {
    return NextResponse.json({ error: "문제를 찾을 수 없습니다." }, { status: 404 });
  }

  const [auditLogs, reports] = await Promise.all([
    prisma.auditLog.findMany({
      where: { targetId: id, targetType: "PredictionQuestion", deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { nickname: true } } },
    }),
    prisma.report.findMany({
      where: { targetId: id, targetType: "QUESTION", deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { reporter: { select: { nickname: true, email: true } } },
    }),
  ]);

  const prevNext = await prisma.predictionQuestion.findMany({
    where: { status: "PENDING_REVIEW", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });

  const currentIdx = prevNext.findIndex((q) => q.id === id);
  const prev = currentIdx > 0 ? prevNext[currentIdx - 1] : null;
  const next = currentIdx >= 0 && currentIdx < prevNext.length - 1 ? prevNext[currentIdx + 1] : null;

  return NextResponse.json({ question, auditLogs, reports, prev, next });
}
