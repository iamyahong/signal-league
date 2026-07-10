import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { QuestionStatus } from "@prisma/client";
import { Clock, AlertCircle, CheckCircle, BarChart2 } from "lucide-react";
import { StatusBadge, CategoryBadge } from "@/components/prediction/StatusBadge";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ filter?: string; sort?: string; page?: string }>;
}

export default async function AdminResultsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const filter = sp.filter ?? "";
  const sort = sp.sort ?? "oldest";
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const pageSize = 20;

  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const baseWhere = {
    status: QuestionStatus.CLOSED,
    deletedAt: null,
    ...(filter === "overdue" ? { resolvesAt: { lte: now } } : {}),
    ...(filter === "newly-closed" ? { lastAutoClosedAt: { gte: last24h } } : {}),
  };

  const orderBy =
    sort === "participants" ? { totalParticipants: "desc" as const }
    : sort === "resolves"  ? { resolvesAt: "asc" as const }
    : { closesAt: "asc" as const };

  const [questions, total, closedCount, overdueCount, newlyClosedCount, todayResolved] =
    await Promise.all([
      prisma.predictionQuestion.findMany({
        where: baseWhere,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          category: { select: { slug: true, name: true } },
          author: { select: { nickname: true } },
          options: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
        },
      }),
      prisma.predictionQuestion.count({ where: baseWhere }),
      prisma.predictionQuestion.count({ where: { status: QuestionStatus.CLOSED, deletedAt: null } }),
      prisma.predictionQuestion.count({
        where: { status: QuestionStatus.CLOSED, deletedAt: null, resolvesAt: { lte: now } },
      }),
      prisma.auditLog.count({
        where: { action: "AUTO_CLOSE_QUESTION", createdAt: { gte: last24h }, deletedAt: null },
      }),
      prisma.predictionQuestion.count({
        where: {
          status: { in: [QuestionStatus.RESOLVED, QuestionStatus.VOIDED] },
          deletedAt: null,
          resolvedAt: { gte: startOfToday },
        },
      }),
    ]);

  const totalPages = Math.ceil(total / pageSize);

  function timeAgo(d: Date | null) {
    if (!d) return "—";
    const diff = now.getTime() - new Date(d).getTime();
    const h = Math.floor(diff / (1000 * 60 * 60));
    if (h < 24) return `${h}시간 전`;
    return `${Math.floor(h / 24)}일 전`;
  }

  const SORT_OPTS = [
    { value: "oldest", label: "마감 오래된 순" },
    { value: "participants", label: "참여자 많은 순" },
    { value: "resolves", label: "확정 예정일 임박 순" },
  ];
  const FILTER_OPTS = [
    { value: "", label: "전체" },
    { value: "overdue", label: "지연" },
    { value: "newly-closed", label: "신규 자동 마감" },
  ];

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams({ filter, sort, page: String(page), ...overrides });
    return `/admin/results?${p.toString()}`;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">결과 확정 대기 큐</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">마감된 예측 문제의 결과를 확정하세요.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "결과 확정 대기", value: closedCount, icon: Clock, color: "text-blue-600" },
          { label: "결과 확정 지연", value: overdueCount, icon: AlertCircle, color: "text-red-500", highlight: overdueCount > 0 },
          { label: "자동 마감 신규", value: newlyClosedCount, icon: Clock, color: "text-amber-600" },
          { label: "오늘 처리 완료", value: todayResolved, icon: CheckCircle, color: "text-green-600" },
        ].map(({ label, value, icon: Icon, color, highlight }) => (
          <div key={label} className={`bg-white rounded-[var(--radius-xl)] border p-4 ${highlight ? "border-red-300 bg-red-50" : "border-[var(--color-border-default)]"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs text-[var(--color-text-secondary)]">{label}</span>
            </div>
            <p className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-[var(--color-text-primary)]"}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTS.map((f) => (
            <Link
              key={f.value}
              href={buildHref({ filter: f.value, page: "1" })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                filter === f.value
                  ? "bg-[var(--color-accent-primary)] text-white border-transparent"
                  : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <select
          className="text-sm border border-[var(--color-border-default)] rounded-lg px-3 py-1.5"
          value={sort}
          onChange={(e) => { window.location.href = buildHref({ sort: e.target.value, page: "1" }); }}
        >
          {SORT_OPTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {questions.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-[var(--color-border-default)]">
          <CheckCircle className="mx-auto h-10 w-10 text-green-400 mb-3" />
          <p className="text-[var(--color-text-tertiary)]">결과 확정 대기 중인 예측이 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">예측 문제</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden md:table-cell">마감</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden lg:table-cell">확정 예정일</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)]">참여자</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden sm:table-cell">배분 점수</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)]">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {questions.map((q) => {
                const isOverdue = q.resolvesAt && new Date(q.resolvesAt) <= now;
                return (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CategoryBadge slug={q.category.slug} name={q.category.name} />
                      </div>
                      <Link href={`/admin/predictions/${q.id}`} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] mt-1 block line-clamp-2">
                        {q.title}
                      </Link>
                      <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{q.author.nickname}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)] hidden md:table-cell text-xs">
                      {q.closesAt ? timeAgo(q.closesAt) : "—"}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {q.resolvesAt ? (
                        <span className={`text-xs font-medium ${isOverdue ? "text-red-600" : "text-[var(--color-text-secondary)]"}`}>
                          {isOverdue ? "⚠ " : ""}{new Date(q.resolvesAt).toLocaleDateString("ko-KR")}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-text-tertiary)]">미정</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{q.totalParticipants.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text-secondary)] hidden sm:table-cell">{q.totalAllocated.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/predictions/${q.id}`}
                        className="inline-flex items-center gap-1 text-xs bg-[var(--color-accent-primary)] text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        처리하기
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {page > 1 && <Link href={buildHref({ page: String(page - 1) })} className="px-3 py-1.5 rounded-lg border text-sm">이전</Link>}
          <span className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)]">{page} / {totalPages}</span>
          {page < totalPages && <Link href={buildHref({ page: String(page + 1) })} className="px-3 py-1.5 rounded-lg border text-sm">다음</Link>}
        </div>
      )}
    </div>
  );
}
