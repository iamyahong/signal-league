import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ParticipationStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ParticipationStatus, { label: string; color: string }> = {
  ACTIVE:   { label: "결과 대기", color: "text-blue-600 bg-blue-50" },
  WON:      { label: "적중",     color: "text-green-600 bg-green-50" },
  LOST:     { label: "비적중",   color: "text-red-500 bg-red-50" },
  REFUNDED: { label: "환불",     color: "text-amber-600 bg-amber-50" },
  CANCELED: { label: "취소/무효", color: "text-gray-500 bg-gray-100" },
};

const STATUS_FILTERS = [
  { value: "",          label: "전체" },
  { value: "ACTIVE",   label: "결과 대기" },
  { value: "WON",      label: "적중" },
  { value: "LOST",     label: "비적중" },
  { value: "REFUNDED", label: "환불" },
  { value: "CANCELED", label: "취소/무효" },
];

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function MyPredictionsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const pageSize = 20;
  const statusFilter = sp.status as ParticipationStatus | undefined;
  const validStatuses = Object.values(ParticipationStatus);
  const status = statusFilter && validStatuses.includes(statusFilter) ? statusFilter : undefined;

  const userId = session.user.id;

  const where = {
    userId,
    deletedAt: null,
    ...(status ? { status } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.predictionParticipation.count({ where }),
    prisma.predictionParticipation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        question: {
          select: {
            id: true,
            title: true,
            status: true,
            closesAt: true,
            resolvedAt: true,
            category: { select: { slug: true, name: true } },
          },
        },
        option: { select: { id: true, label: true } },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">참여 내역</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">내가 참여한 예측 문제 목록입니다.</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/me/predictions?status=${f.value}` : "/me/predictions"}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
              (sp.status ?? "") === f.value
                ? "bg-[var(--color-accent-primary)] text-white border-transparent"
                : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)]">
          <p className="text-[var(--color-text-tertiary)] mb-2">참여한 예측 문제가 없습니다.</p>
          <Link href="/predictions" className="text-sm text-[var(--color-accent-primary)] hover:underline">
            예측 문제 둘러보기
          </Link>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[var(--color-border-default)] bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border-default)] bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">예측 문제</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden sm:table-cell">카테고리</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">선택 옵션</th>
                    <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)]">배분 점수</th>
                    <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden md:table-cell">결과 점수</th>
                    <th className="text-center px-4 py-3 font-medium text-[var(--color-text-secondary)]">상태</th>
                    <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden lg:table-cell">참여일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-default)]">
                  {items.map((p) => {
                    const badge = STATUS_LABELS[p.status] ?? { label: p.status, color: "text-gray-500 bg-gray-100" };
                    return (
                      <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/predictions/${p.questionId}`}
                            className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] line-clamp-2"
                          >
                            {p.question.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className="text-xs text-[var(--color-text-secondary)]">{p.question.category.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-gray-100 text-[var(--color-text-secondary)] rounded px-2 py-0.5">
                            {p.option.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text-secondary)]">
                          {p.allocatedScore.toLocaleString()}점
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums hidden md:table-cell">
                          {p.earnedScore != null ? (
                            <span className={p.earnedScore >= p.allocatedScore ? "text-green-600 font-semibold" : "text-red-500"}>
                              {p.earnedScore.toLocaleString()}점
                            </span>
                          ) : (
                            <span className="text-[var(--color-text-tertiary)]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[var(--color-text-tertiary)] hidden lg:table-cell text-xs">
                          {new Date(p.createdAt).toLocaleDateString("ko-KR")}
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
                  href={`/me/predictions?${status ? `status=${status}&` : ""}page=${page - 1}`}
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
                  href={`/me/predictions?${status ? `status=${status}&` : ""}page=${page + 1}`}
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
