import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { QuestionStatus, Prisma } from "@prisma/client";
import { PredictionsListClient } from "./_components/PredictionsListClient";
import { StatusBadge } from "@/components/prediction/StatusBadge";
import { FileText, ClipboardList } from "lucide-react";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  { value: "PENDING_REVIEW", label: "검토 중" },
  { value: "OPEN", label: "진행 중" },
  { value: "CLOSED", label: "마감" },
  { value: "RESOLVED", label: "결과 확정" },
  { value: "VOIDED", label: "무효" },
  { value: "REJECTED", label: "반려" },
  { value: "HIDDEN", label: "숨김" },
];

const SORT_OPTIONS = [
  { value: "createdAt_desc", label: "생성일 최신순" },
  { value: "createdAt_asc", label: "생성일 오래된순" },
  { value: "closesAt_asc", label: "마감 가까운순" },
  { value: "participants_desc", label: "참여자 많은순" },
  { value: "totalAllocated_desc", label: "총 배분 점수 큰순" },
];

const PAGE_SIZE = 25;

async function getData(searchParams: Record<string, string>) {
  const q = searchParams.q ?? "";
  const statusStr = searchParams.status ?? "";
  const categoryId = searchParams.categoryId ?? "";
  const period = (searchParams.period ?? "") as "" | "today" | "7d" | "30d";
  const sort = (searchParams.sort ?? "createdAt_desc") as string;
  const page = Math.max(1, parseInt(searchParams.page ?? "1") || 1);
  const now = new Date();

  const where: Prisma.PredictionQuestionWhereInput = { deletedAt: null };
  if (statusStr) where.status = statusStr as QuestionStatus;
  if (categoryId) where.categoryId = categoryId;
  if (period === "today") where.createdAt = { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
  else if (period === "7d") where.createdAt = { gte: new Date(now.getTime() - 7 * 86400000) };
  else if (period === "30d") where.createdAt = { gte: new Date(now.getTime() - 30 * 86400000) };
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

  const [total, questions, categories, pendingCount] = await Promise.all([
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
    prisma.category.findMany({ where: { deletedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    prisma.predictionQuestion.count({ where: { status: QuestionStatus.PENDING_REVIEW, deletedAt: null } }),
  ]);

  return { total, questions, categories, pendingCount, page, sort };
}

export default async function AdminPredictionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const { total, questions, categories, pendingCount, page, sort } = await getData(sp);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ ...sp, ...overrides });
    return `/admin/predictions?${params.toString()}`;
  };

  const serialized = questions.map((q) => ({
    ...q,
    createdAt: q.createdAt.toISOString(),
    closesAt: q.closesAt?.toISOString() ?? null,
    resolvesAt: q.resolvesAt?.toISOString() ?? null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">예측 문제 관리</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">전체 예측 문제 목록</p>
        </div>
        {pendingCount > 0 && (
          <Link
            href="/admin/predictions/review"
            className="flex items-center gap-2 bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-[var(--radius-lg)] hover:bg-amber-600 transition-colors"
          >
            <ClipboardList className="h-4 w-4" />
            검토 대기 {pendingCount}건
          </Link>
        )}
      </div>

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 space-y-3">
        <form method="GET" action="/admin/predictions" className="flex flex-wrap gap-2">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="제목·작성자 검색"
            className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-1.5 text-sm w-52 focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
          <select name="status" defaultValue={sp.status ?? ""} className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-2 py-1.5 text-sm focus:outline-none">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select name="categoryId" defaultValue={sp.categoryId ?? ""} className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-2 py-1.5 text-sm focus:outline-none">
            <option value="">카테고리 전체</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="period" defaultValue={sp.period ?? ""} className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-2 py-1.5 text-sm focus:outline-none">
            <option value="">기간 전체</option>
            <option value="today">오늘</option>
            <option value="7d">7일</option>
            <option value="30d">30일</option>
          </select>
          <select name="sort" defaultValue={sort} className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-2 py-1.5 text-sm focus:outline-none">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="submit" className="bg-[var(--color-accent-primary)] text-white text-sm px-4 py-1.5 rounded-[var(--radius-md)] hover:opacity-90">검색</button>
          <a href="/admin/predictions" className="text-sm text-[var(--color-text-secondary)] px-3 py-1.5 hover:text-[var(--color-text-primary)]">초기화</a>
        </form>
      </div>

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <span className="text-sm text-[var(--color-text-secondary)]">총 {total.toLocaleString()}건</span>
          <div className="flex gap-1.5 ml-2">
            {STATUS_OPTIONS.filter((o) => o.value).map((o) => {
              const isActive = sp.status === o.value;
              return isActive ? (
                <StatusBadge key={o.value} status={o.value as QuestionStatus} />
              ) : null;
            })}
          </div>
        </div>

        <PredictionsListClient questions={serialized} />

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
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
    </div>
  );
}
