import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { ClipboardCheck, ChevronRight, Users, TrendingUp, Clock } from "lucide-react";

const PAGE_SIZE = 20;

async function getQueue(searchParams: Record<string, string>) {
  const q = searchParams.q ?? "";
  const sort = searchParams.sort ?? "closesAt_asc";
  const page = Math.max(1, parseInt(searchParams.page ?? "1") || 1);

  const where: Prisma.PredictionQuestionWhereInput = {
    status: "CLOSED",
    deletedAt: null,
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { author: { nickname: { contains: q, mode: "insensitive" } } },
      ],
    } : {}),
  };

  const orderBy: Prisma.PredictionQuestionOrderByWithRelationInput =
    sort === "participants_desc" ? { totalParticipants: "desc" }
    : sort === "allocated_desc" ? { totalAllocated: "desc" }
    : sort === "resolvesAt_asc" ? { resolvesAt: "asc" }
    : { closesAt: "asc" };

  const [total, questions] = await Promise.all([
    prisma.predictionQuestion.count({ where }),
    prisma.predictionQuestion.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        author: { select: { nickname: true, email: true } },
        category: { select: { name: true } },
        options: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, label: true, participantCount: true, totalAllocated: true } },
      },
    }),
  ]);

  return { total, questions, page };
}

export default async function AdminPredictionsQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const { total, questions, page } = await getQueue(sp);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ ...sp, ...overrides });
    return `/admin/predictions/queue?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-[var(--color-accent-primary)]" />
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">결과 확정 큐</h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">
            마감된 예측 문제 — 결과를 확정하거나 무효 처리해 주세요
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] px-4 py-2 text-center">
          <p className="text-2xl font-bold text-amber-700">{total}</p>
          <p className="text-xs text-amber-600">결과 대기</p>
        </div>
      </div>

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
        <form method="GET" action="/admin/predictions/queue" className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="제목·작성자 검색"
            className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-1.5 text-sm w-52 focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
          <select name="sort" defaultValue={sp.sort ?? "closesAt_asc"} className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-2 py-1.5 text-sm focus:outline-none">
            <option value="closesAt_asc">마감일 가까운 순</option>
            <option value="resolvesAt_asc">결과 확정일 가까운 순</option>
            <option value="participants_desc">참여자 많은 순</option>
            <option value="allocated_desc">총 배분 점수 큰 순</option>
          </select>
          <button type="submit" className="bg-[var(--color-accent-primary)] text-white text-sm px-4 py-1.5 rounded-[var(--radius-md)] hover:opacity-90">검색</button>
          <a href="/admin/predictions/queue" className="text-sm text-[var(--color-text-secondary)] px-3 py-1.5 hover:text-[var(--color-text-primary)]">초기화</a>
        </form>
      </div>

      <div className="space-y-2">
        {questions.length === 0 ? (
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] py-16 flex flex-col items-center gap-3">
            <ClipboardCheck className="h-10 w-10 text-[var(--color-text-tertiary)]" />
            <p className="text-[var(--color-text-secondary)]">결과 대기 중인 문제가 없습니다.</p>
          </div>
        ) : questions.map((q) => {
          const closedDaysAgo = q.closesAt
            ? Math.floor((Date.now() - new Date(q.closesAt).getTime()) / 86400000)
            : null;
          const resolvesAt = q.resolvesAt ? new Date(q.resolvesAt) : null;
          const isOverdue = resolvesAt && resolvesAt < new Date();

          return (
            <Link
              key={q.id}
              href={`/admin/predictions/${q.id}`}
              className="block bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 hover:border-[var(--color-accent-primary)] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] px-2 py-0.5 rounded-full">
                      {q.category?.name ?? "—"}
                    </span>
                    {isOverdue && (
                      <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-medium">
                        확정 기한 초과
                      </span>
                    )}
                    {closedDaysAgo !== null && closedDaysAgo >= 0 && (
                      <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {closedDaysAgo === 0 ? "오늘 마감" : `${closedDaysAgo}일 전 마감`}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-[var(--color-text-primary)] leading-snug line-clamp-2 group-hover:text-[var(--color-accent-primary)] transition-colors">
                    {q.title}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {q.options.map((opt) => (
                      <span key={opt.id} className="text-xs bg-[var(--color-surface-muted)] px-2 py-0.5 rounded text-[var(--color-text-secondary)]">
                        {opt.label}
                        <span className="text-[var(--color-text-tertiary)] ml-1">({opt.participantCount}명)</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <div className="flex items-center gap-3 text-sm text-[var(--color-text-secondary)]">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {q.totalParticipants.toLocaleString()}명
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      {q.totalAllocated.toLocaleString()}점
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">
                    {q.author.nickname} ({q.author.email})
                  </div>
                  {resolvesAt && (
                    <div className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-[var(--color-text-secondary)]"}`}>
                      확정 기한: {resolvesAt.toLocaleDateString("ko-KR")}
                    </div>
                  )}
                  <ChevronRight className="h-4 w-4 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-primary)] transition-colors" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {page > 1 && (
            <a href={buildUrl({ page: String(page - 1) })} className="text-sm text-[var(--color-accent-primary)] hover:underline">← 이전</a>
          )}
          <span className="text-sm text-[var(--color-text-secondary)]">{page} / {totalPages}</span>
          {page < totalPages && (
            <a href={buildUrl({ page: String(page + 1) })} className="text-sm text-[var(--color-accent-primary)] hover:underline">다음 →</a>
          )}
        </div>
      )}
    </div>
  );
}
