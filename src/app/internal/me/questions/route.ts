import { NextRequest, NextResponse } from "next/server";
import { requireBetaUser, handleAuthError, AuthError } from "@/lib/auth/requireUser";
import prisma from "@/lib/prisma";
import { QuestionStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireBetaUser();
    const userId = session.user.id;

    const statusParam = req.nextUrl.searchParams.get("status");
    const validStatuses = Object.values(QuestionStatus) as QuestionStatus[];
    const statusFilter = statusParam && validStatuses.includes(statusParam as QuestionStatus)
      ? [statusParam as QuestionStatus]
      : undefined;

    const questions = await prisma.predictionQuestion.findMany({
      where: {
        authorId: userId,
        deletedAt: null,
        ...(statusFilter ? { status: { in: statusFilter } } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { slug: true, name: true } },
        _count: { select: { participations: { where: { deletedAt: null } } } },
      },
    });

    return NextResponse.json({
      questions: questions.map((q) => ({
        ...q,
        participantCount: q._count.participations,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) return handleAuthError(e);
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
