import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 20;
  const statusFilter = searchParams.get("status") ?? "";

  const userId = session.user.id;

  const where = {
    userId,
    deletedAt: null,
    ...(statusFilter ? { status: statusFilter as never } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.predictionParticipation.count({ where }),
    prisma.predictionParticipation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        question: {
          select: {
            id: true,
            title: true,
            status: true,
            closesAt: true,
            resolvedAt: true,
            category: { select: { slug: true, name: true } },
          },
        },
        option: { select: { id: true, label: true } },
      },
    }),
  ]);

  return NextResponse.json({
    items: items.map((p) => ({
      id: p.id,
      questionId: p.questionId,
      questionTitle: p.question.title,
      questionStatus: p.question.status,
      categorySlug: p.question.category.slug,
      categoryName: p.question.category.name,
      closesAt: p.question.closesAt?.toISOString() ?? null,
      resolvedAt: p.question.resolvedAt?.toISOString() ?? null,
      optionId: p.optionId,
      optionLabel: p.option.label,
      allocatedScore: p.allocatedScore,
      earnedScore: p.earnedScore ?? null,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  });
}
