import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireBetaUser, handleAuthError, AuthError } from "@/lib/auth/requireUser";
import { createQuestion } from "@/lib/prediction/createQuestion";
import { calcCreationCost, validateCreationCost } from "@/lib/prediction/calcCreationCost";
import { createQuestionSchema, predictionsListSchema } from "@/lib/validation/prediction";
import prisma from "@/lib/prisma";
import { QuestionStatus } from "@prisma/client";

const PAGE_SIZE = 12;

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const params = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = predictionsListSchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: "잘못된 요청입니다.", code: "BAD_REQUEST" }, { status: 400 });
    }
    const { tab, categories, sort, page, search } = parsed.data;

    const categoryIds = categories ? categories.split(",").filter(Boolean) : [];
    const skip = (page - 1) * PAGE_SIZE;

    let statusFilter: QuestionStatus[] = [QuestionStatus.OPEN];
    if (tab === "closed") statusFilter = [QuestionStatus.CLOSED];
    else if (tab === "resolved") statusFilter = [QuestionStatus.RESOLVED];

    const where: Record<string, unknown> = {
      status: { in: statusFilter },
      deletedAt: null,
      ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
      ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
    };

    if (tab === "participated" && userId) {
      const myQuestionIds = await prisma.predictionParticipation.findMany({
        where: { userId, deletedAt: null },
        select: { questionId: true },
      });
      where.id = { in: myQuestionIds.map((p) => p.questionId) };
      delete (where as Record<string, unknown>).status;
    }

    let orderBy: Record<string, unknown> = { createdAt: "desc" };
    if (tab === "popular" || sort === "participants") orderBy = { totalParticipants: "desc" };
    else if (tab === "closing" || sort === "closing") orderBy = { closesAt: "asc" };
    else if (sort === "allocated") orderBy = { totalAllocated: "desc" };
    else if (sort === "comments") orderBy = { comments: { _count: "desc" } };

    const [questions, total] = await Promise.all([
      prisma.predictionQuestion.findMany({
        where,
        orderBy,
        skip,
        take: PAGE_SIZE,
        include: {
          category: { select: { id: true, slug: true, name: true } },
          author: { select: { id: true, nickname: true } },
          options: { select: { id: true, label: true, totalAllocated: true, participantCount: true, sortOrder: true }, orderBy: { sortOrder: "asc" } },
          _count: { select: { comments: { where: { deletedAt: null } } } },
        },
      }),
      prisma.predictionQuestion.count({ where }),
    ]);

    let myParticipations: Set<string> = new Set();
    if (userId && questions.length > 0) {
      const qIds = questions.map((q) => q.id);
      const participations = await prisma.predictionParticipation.findMany({
        where: { userId, questionId: { in: qIds }, deletedAt: null },
        select: { questionId: true, optionId: true },
      });
      myParticipations = new Set(participations.map((p) => p.questionId));
    }

    return NextResponse.json({
      questions: questions.map((q) => ({
        ...q,
        commentCount: q._count.comments,
        hasParticipated: myParticipations.has(q.id),
      })),
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

export async function POST(req: NextRequest) {
  try {
    const session = await requireBetaUser();
    const userId = session.user.id;

    const body = await req.json();
    const parsed = createQuestionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "입력값을 확인해주세요.", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const data = parsed.data;

    const [profile, settings] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userId }, select: { availableScore: true } }),
      prisma.serviceSetting.findMany({ where: { key: { in: ["question_create_min_score", "question_create_max_score"] } } }),
    ]);

    const currentScore = profile?.availableScore ?? 0;
    const settingMap = Object.fromEntries(settings.map((s) => [s.key, parseInt(s.value, 10)]));
    const bounds = calcCreationCost(currentScore, settingMap.question_create_min_score, settingMap.question_create_max_score);
    const costError = validateCreationCost(data.creatorCost, bounds);
    if (costError) {
      return NextResponse.json({ error: costError, code: "COST_INVALID" }, { status: 400 });
    }

    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    if (!category) {
      return NextResponse.json({ error: "유효하지 않은 카테고리입니다.", code: "INVALID_CATEGORY" }, { status: 400 });
    }

    const { question, ledger } = await createQuestion({
      authorId: userId,
      categoryId: data.categoryId,
      title: data.title,
      description: data.description,
      resolutionCriteria: data.resolutionCriteria,
      closesAt: new Date(data.closesAt),
      resolvesAt: new Date(data.resolvesAt),
      sourceUrls: data.sourceUrls,
      options: data.options,
      creatorCost: data.creatorCost,
    });

    return NextResponse.json({ success: true, questionId: question.id, balanceAfter: ledger.balanceAfter }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return handleAuthError(e);
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
