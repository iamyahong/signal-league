import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ReportStatus, ReportTargetType, Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ReportStatus, { label: string; color: string }> = {
  PENDING:         { label: "대기",      color: "text-amber-600 bg-amber-50" },
  REVIEWING:       { label: "검토 중",   color: "text-blue-600 bg-blue-50" },
  RESOLVED:        { label: "처리됨",    color: "text-green-600 bg-green-50" },
  DISMISSED:       { label: "기각",      color: "text-gray-500 bg-gray-100" },
  ACCEPTED:        { label: "수락",      color: "text-emerald-600 bg-emerald-50" },
  NEEDS_MORE_INFO: { label: "추가 검토", color: "text-purple-600 bg-purple-50" },
};

const TARGET_LABELS: Record<ReportTargetType, string> = {
  QUESTION: "예측 문제",
  COMMENT:  "댓글",
  USER:     "사용자",
};

const STATUS_FILTERS = [
  { value: "",                label: "전체" },
  { value: "PENDING",         label: "대기" },
  { value: "REVIEWING",       label: "검토 중" },
  { value: "ACCEPTED",        label: "수락" },
  { value: "DISMISSED",       label: "기각" },
  { value: "NEEDS_MORE_INFO", label: "추가 검토" },
];

interface Props {
  searchParams: Promise<{ page?: string; status?: string; targetType?: string }>;
}

export default async function AdminReportsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[]) || [];
  const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR");
  if (!isAdmin) redirect("/home");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const pageSize = 30;
  const statusFilter = sp.status ?? "";
  const targetTypeFilter = sp.targetType ?? "";

  const validStatuses = Object.values(ReportStatus);
  const validTargetTypes = Object.values(ReportTargetType);

  const where: Prisma.ReportWhereInput = {
    deletedAt: null,
    ...(statusFilter && validStatuses.includes(statusFilter as ReportStatus)
      ? { status: statusFilter as ReportStatus }
      : {}),
    ...(targetTypeFilter && validTargetTypes.includes(targetTypeFilter as ReportTargetType)
      ? { targetType: targetTypeFilter as ReportTargetType }
      : {}),
  };

  const [total, items, pendingCount] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        reporter: { select: { id: true, nickname: true } },
      },
    }),
    prisma.report.count({ where: { status: ReportStatus.PENDING, deletedAt: null } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">신고 처리</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            전체 신고 목록을 확인하고 처리합니다.
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="bg-red-100 text-red-700 text-sm font-medium rounded-lg px-3 py-1.5">
            미처리 {pendingCount}건
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/reports?${f.value ? `status=${f.value}` : ""}${targetTypeFilter ? `&targetType=${targetTypeFilter}` : ""}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              statusFilter === f.value
                ? "bg-[var(--color-accent-primary)] text-white border-transparent"
                : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50"
            }`}
          >
            {f.label}
          </Link>
        ))}
        <span className="text-[var(--color-text-tertiary)] text-xs self-center px-1">|</span>
        {Object.entries(TARGET_LABELS).map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/reports?${statusFilter ? `status=${statusFilter}&` : ""}${targetTypeFilter === value ? "" : `targetType=${value}`}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              targetTypeFilter === value
                ? "bg-gray-700 text-white border-transparent"
                : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-gray-400"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)]">
          <p className="text-[var(--color-text-tertiary)]">신고 내역이 없습니다.</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[var(--color-border-default)] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-default)] bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">대상</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">신고 사유</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden sm:table-cell">신고자</th>
                    <th className="text-center px-4 py-3 font-medium text-[var(--color-text-secondary)]">상태</th>
                    <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden md:table-cell">신고일</th>
                    <th className="text-center px-4 py-3 font-medium text-[var(--color-text-secondary)]">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-default)]">
                  {items.map((r) => {
                    const badge = STATUS_LABELS[r.status] ?? { label: r.status, color: "text-gray-500 bg-gray-100" };
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-100 text-[var(--color-text-secondary)] rounded px-1.5 py-0.5 mr-1">
                            {TARGET_LABELS[r.targetType]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[var(--color-text-primary)] line-clamp-1 max-w-[240px]">
                            {r.reason}
                          </p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell text-[var(--color-text-secondary)]">
                          {r.reporter.nickname}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--color-text-tertiary)] hidden md:table-cell text-xs">
                          {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            href={`/admin/reports/${r.id}`}
                            className="text-xs text-[var(--color-accent-primary)] hover:underline font-medium"
                          >
                            상세 보기
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex justify-center gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/reports?${statusFilter ? `status=${statusFilter}&` : ""}${targetTypeFilter ? `targetType=${targetTypeFilter}&` : ""}page=${page - 1}`}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm hover:bg-gray-50"
                >
                  이전
                </Link>
              )}
              <span className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)]">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={`/admin/reports?${statusFilter ? `status=${statusFilter}&` : ""}${targetTypeFilter ? `targetType=${targetTypeFilter}&` : ""}page=${page + 1}`}
                  className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm hover:bg-gray-50"
                >
                  다음
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
