import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { QuestionStatus } from "@prisma/client";
import { ReviewQueueClient } from "./_components/ReviewQueueClient";

async function getReviewData() {
  const questions = await prisma.predictionQuestion.findMany({
    where: { status: QuestionStatus.PENDING_REVIEW, deletedAt: null },
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
  return questions.map((q) => ({
    ...q,
    createdAt: q.createdAt.toISOString(),
    closesAt: q.closesAt?.toISOString() ?? null,
    waitMinutes: Math.floor((now.getTime() - q.createdAt.getTime()) / 60000),
  }));
}

export default async function AdminPredictionsReviewPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const questions = await getReviewData();
  const total = questions.length;

  const avgWaitMinutes =
    total > 0
      ? Math.round(questions.reduce((s, q) => s + q.waitMinutes, 0) / total)
      : 0;

  const formatWait = (m: number) => {
    if (m < 60) return `${m}분`;
    if (m < 60 * 24) return `${Math.floor(m / 60)}시간`;
    return `${Math.floor(m / (60 * 24))}일`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">검토 대기 예측 문제</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
          공개 전 운영자 검토가 필요한 문제 목록입니다. 신청일이 오래된 순으로 정렬됩니다.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-tertiary)]">검토 대기 건수</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{total}건</p>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-tertiary)]">평균 대기 시간</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">
            {total > 0 ? formatWait(avgWaitMinutes) : "—"}
          </p>
        </div>
      </div>

      <ReviewQueueClient questions={questions} />
    </div>
  );
}
