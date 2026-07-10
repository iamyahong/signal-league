import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { QuestionStatus, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }

  const categoryId = req.nextUrl.searchParams.get("categoryId") ?? undefined;
  const q = req.nextUrl.searchParams.get("q") ?? undefined;

  const where: Prisma.PredictionQuestionWhereInput = {
    status: QuestionStatus.PENDING_REVIEW,
    deletedAt: null,
  };
  if (categoryId) where.categoryId = categoryId;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { author: { nickname: { contains: q, mode: "insensitive" } } },
    ];
  }

  const questions = await prisma.predictionQuestion.findMany({
    where,
    orderBy: { createdAt: "asc" },
    include: {
      author: {
        select: {
          nickname: true,
          email: true,
          profile: { select: { availableScore: true } },
        },
      },
      category: { select: { name: true, slug: true } },
      options: { orderBy: { sortOrder: "asc" } },
    },
  });

  const now = new Date();
  const withWait = questions.map((q) => ({
    ...q,
    waitMinutes: Math.floor((now.getTime() - q.createdAt.getTime()) / 60000),
  }));

  return NextResponse.json({ questions: withWait, total: questions.length });
}
