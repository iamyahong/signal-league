import prisma from "@/lib/prisma";
import { QuestionStatus } from "@prisma/client";
import { PredictionCard } from "./PredictionCard";
import Link from "next/link";

const PAGE_SIZE = 12;

interface SearchParams {
  tab?: string;
  categories?: string;
  sort?: string;
  page?: string;
  search?: string;
}

interface PredictionsGridProps {
  searchParams: SearchParams;
  userId?: string;
}

export async function PredictionsGrid({ searchParams, userId }: PredictionsGridProps) {
  const tab = searchParams.tab ?? "popular";
  const categoryIds = (searchParams.categories ?? "").split(",").filter(Boolean);
  const sort = searchParams.sort ?? "";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10));
  const search = searchParams.search ?? "";
  const skip = (page - 1) * PAGE_SIZE;

  let statusFilter: QuestionStatus[] = [QuestionStatus.OPEN];
  if (tab === "closed") statusFilter = [QuestionStatus.CLOSED];
  else if (tab === "resolved") statusFilter = [QuestionStatus.RESOLVED];

  const where: import("@prisma/client").Prisma.PredictionQuestionWhereInput = {
    deletedAt: null,
    ...(tab !== "participated" ? { status: { in: statusFilter } } : {}),
    ...(categoryIds.length > 0 ? { categoryId: { in: categoryIds } } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
  };

  if (tab === "participated" && userId) {
    const myIds = await prisma.predictionParticipation.findMany({
      where: { userId, deletedAt: null },
      select: { questionId: true },
    });
    where.id = { in: myIds.map((p) => p.questionId) };
  }

  let orderBy: import("@prisma/client").Prisma.PredictionQuestionOrderByWithRelationInput =
    tab === "popular" || sort === "participants" ? { totalParticipants: "desc" }
    : tab === "closing" || sort === "closing" ? { closesAt: "asc" }
    : sort === "allocated" ? { totalAllocated: "desc" }
    : { createdAt: "desc" };

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

  let participatedSet = new Set<string>();
  if (userId && questions.length > 0) {
    const pp = await prisma.predictionParticipation.findMany({
      where: { userId, questionId: { in: questions.map((q) => q.id) }, deletedAt: null },
      select: { questionId: true },
    });
    participatedSet = new Set(pp.map((p) => p.questionId));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (questions.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-[var(--color-text-tertiary)] text-sm mb-3">조건에 맞는 예측 문제가 없습니다.</p>
        {userId && (
          <Link href="/predictions/new" className="text-sm text-[var(--color-accent-primary)] hover:underline">직접 새로운 예측 문제를 만들어보세요.</Link>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {questions.map((q) => (
          <PredictionCard
            key={q.id}
            id={q.id}
            title={q.title}
            status={q.status}
            closesAt={q.closesAt}
            totalParticipants={q.totalParticipants}
            totalAllocated={q.totalAllocated}
            commentCount={q._count.comments}
            category={q.category}
            author={q.author}
            options={q.options}
            hasParticipated={participatedSet.has(q.id)}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/predictions?${new URLSearchParams({ ...searchParams, page: String(p) }).toString()}`}
              className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${p === page ? "bg-[var(--color-accent-primary)] text-white" : "border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}

      <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-4">총 {total.toLocaleString()}개 문제 (페이지 {page}/{totalPages})</p>
    </div>
  );
}
