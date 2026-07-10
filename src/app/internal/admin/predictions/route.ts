import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { QuestionStatus, Prisma } from "@prisma/client";
import { z } from "zod";

const querySchema = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(QuestionStatus).optional(),
  categoryId: z.string().optional(),
  period: z.enum(["today", "7d", "30d"]).optional(),
  sort: z.enum(["createdAt_desc", "createdAt_asc", "closesAt_asc", "participants_desc", "totalAllocated_desc"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }

  const sp = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = querySchema.safeParse(sp);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 파라미터입니다." }, { status: 400 });
  }
  const { q, status, categoryId, period, sort, page } = parsed.data;

  const PAGE_SIZE = 25;
  const now = new Date();

  const where: Prisma.PredictionQuestionWhereInput = { deletedAt: null };

  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;

  if (period) {
    const cutoffs = {
      today: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      "7d": new Date(now.getTime() - 7 * 86400000),
      "30d": new Date(now.getTime() - 30 * 86400000),
    };
    where.createdAt = { gte: cutoffs[period] };
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { author: { nickname: { contains: q, mode: "insensitive" } } },
      { author: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const orderBy: Prisma.PredictionQuestionOrderByWithRelationInput =
    sort === "createdAt_asc" ? { createdAt: "asc" }
    : sort === "closesAt_asc" ? { closesAt: "asc" }
    : sort === "participants_desc" ? { totalParticipants: "desc" }
    : sort === "totalAllocated_desc" ? { totalAllocated: "desc" }
    : { createdAt: "desc" };

  const [total, questions] = await Promise.all([
    prisma.predictionQuestion.count({ where }),
    prisma.predictionQuestion.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { nickname: true, email: true } },
        category: { select: { name: true, slug: true } },
      },
    }),
  ]);

  return NextResponse.json({ questions, total, page, pageSize: PAGE_SIZE });
}
