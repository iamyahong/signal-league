import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { Prisma, DisputeStatus } from "@prisma/client";
import { Scale, Clock } from "lucide-react";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "PENDING", label: "대기" },
  { value: "REVIEWING", label: "검토 중" },
  { value: "ACCEPTED", label: "수락" },
  { value: "REJECTED", label: "기각" },
  { value: "NEEDS_MORE_INFO", label: "추가 검토" },
];

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  REVIEWING: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-gray-100 text-gray-600",
  NEEDS_MORE_INFO: "bg-purple-100 text-purple-700",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "대기", REVIEWING: "검토 중", ACCEPTED: "수락", REJECTED: "기각", NEEDS_MORE_INFO: "추가 검토",
};

function isAdmin(roles: string[]) {
  return roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR") || roles.includes("READ_ONLY");
}

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const roles = (session.user.roles as string[]) ?? [];
  if (!isAdmin(roles)) redirect("/admin");

  const sp = await searchParams;
  const statusFilter = sp.status ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1") || 1);

  const where: Prisma.DisputeWhereInput = { deletedAt: null };
  if (statusFilter) where.status = statusFilter as DisputeStatus;

  const [total, disputes, pendingCount] = await Promise.all([
    prisma.dispute.count({ where }),
    prisma.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { nickname: true, email: true } },
        question: { select: { id: true, title: true, status: true } },
      },
    }),
    prisma.dispute.count({ where: { status: "PENDING", deletedAt: null } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ ...sp, ...overrides });
    return `/admin/disputes?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-[var(--color-accent-primary)]" />
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">이의제기 관리</h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">사용자가 제출한 결과 이의제기 목록</p>
        </div>
        {pendingCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] px-4 py-2 text-center">
            <p className="text-xl font-bold text-amber-700">{pendingCount}</p>
            <p className="text-xs text-amber-600 flex items-center gap-1"><Clock className="h-3 w-3" />처리 대기</p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
        <form method="GET" action="/admin/disputes" className="flex flex-wrap gap-2">
          <select name="status" defaultValue={statusFilter} className="border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-2 py-1.5 text-sm focus:outline-none">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <button type="submit" className="bg-[var(--color-accent-primary)] text-white text-sm px-4 py-1.5 rounded-[var(--radius-md)] hover:opacity-90">필터</button>
          <a href="/admin/disputes" className="text-sm text-[var(--color-text-secondary)] px-3 py-1.5 hover:text-[var(--color-text-primary)]">초기화</a>
        </form>
      </div>

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
        <p className="text-xs text-[var(--color-text-tertiary)] mb-3">총 {total}건</p>
        <div className="space-y-2">
          {disputes.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)] text-center py-8">이의제기가 없습니다.</p>
          ) : disputes.map((d) => (
            <Link
              key={d.id}
              href={`/admin/disputes/${d.id}`}
              className="block p-3 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] hover:border-[var(--color-accent-primary)] hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{d.question.title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                    {d.user.nickname} ({d.user.email}) · {new Date(d.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1 line-clamp-1">{d.reason}</p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[d.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[d.status] ?? d.status}
                  </span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">문제: {d.question.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            {page > 1 && <a href={buildUrl({ page: String(page - 1) })} className="text-sm text-[var(--color-accent-primary)] hover:underline">← 이전</a>}
            <span className="text-sm text-[var(--color-text-secondary)]">{page} / {totalPages}</span>
            {page < totalPages && <a href={buildUrl({ page: String(page + 1) })} className="text-sm text-[var(--color-accent-primary)] hover:underline">다음 →</a>}
          </div>
        )}
      </div>
    </div>
  );
}
