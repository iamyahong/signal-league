import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await auth();
    const userId = session?.user?.id;

    const question = await prisma.predictionQuestion.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: { select: { id: true, slug: true, name: true } },
        author: { select: { id: true, nickname: true } },
        options: { orderBy: { sortOrder: "asc" } },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
    });

    if (!question) {
      return NextResponse.json({ error: "예측 문제를 찾을 수 없습니다.", code: "NOT_FOUND" }, { status: 404 });
    }

    let myParticipation = null;
    if (userId) {
      myParticipation = await prisma.predictionParticipation.findUnique({
        where: { questionId_userId: { questionId: id, userId } },
        include: { option: { select: { label: true } } },
      });
    }

    return NextResponse.json({
      question: {
        ...question,
        commentCount: question._count.comments,
      },
      myParticipation,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "서버 오류가 발생했습니다.", code: "SERVER_ERROR" }, { status: 500 });
  }
}
