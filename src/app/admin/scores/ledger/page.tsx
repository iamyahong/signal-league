import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ScoreLedgerType } from "@prisma/client";
import { SCORE_TYPE_LABELS } from "@/lib/constants/scoreLedger";
import { ScoreLedgerFilter } from "./_components/ScoreLedgerFilter";

interface Props {
  searchParams: Promise<{
    search?: string; type?: string | string[]; direction?: string; period?: string; page?: string;
  }>;
}

async function getLedger(search: string, types: ScoreLedgerType[], direction: string, period: string, page: number) {
  const pageSize = 50;
  const now = new Date();
  const periodStart =
    period === "today" ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) :
    period === "7d" ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
    period === "30d" ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) : null;

  let userIds: string[] | null = null;
  if (search) {
    const matched = await prisma.user.findMany({
      where: { OR: [{ email: { contains: search, mode: "insensitive" } }, { nickname: { contains: search, mode: "insensitive" } }] },
      select: { id: true }, take: 50,
    });
    userIds = matched.map((u) => u.id);
  }

  const where: import("@prisma/client").Prisma.ScoreLedgerWhereInput = {
    deletedAt: null,
    ...(userIds !== null && { userId: { in: userIds } }),
    ...(types.length > 0 && { type: { in: types } }),
    ...(direction === "increase" && { amount: { gt: 0 } }),
    ...(direction === "decrease" && { amount: { lt: 0 } }),
    ...(periodStart && { createdAt: { gte: periodStart } }),
  };

  const [total, entries] = await Promise.all([
    prisma.scoreLedger.count({ where }),
    prisma.scoreLedger.findMany({
      where,
      include: { user: { select: { id: true, nickname: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { entries, total, totalPages: Math.ceil(total / pageSize) };
}

export default async function ScoreLedgerPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const search = sp.search ?? "";
  const rawTypes = Array.isArray(sp.type) ? sp.type : sp.type ? [sp.type] : [];
  const types = rawTypes.filter((t) => Object.values(ScoreLedgerType).includes(t as ScoreLedgerType)) as ScoreLedgerType[];
  const direction = sp.direction ?? "all";
  const period = sp.period ?? "all";
  const page = Math.max(1, parseInt(sp.page ?? "1"));

  const { entries, total, totalPages } = await getLedger(search, types, direction, period, page);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">점수 원장</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">총 {total.toLocaleString()}건</p>
      </div>

      <ScoreLedgerFilter currentSearch={search} currentTypes={types} currentDirection={direction} currentPeriod={period} />

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">일시</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">회원</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">유형</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-secondary)]">변동</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-secondary)]">변동 전</th>
                <th className="px-4 py-3 text-right font-medium text-[var(--color-text-secondary)]">변동 후</th>
                <th className="px-4 py-3 text-left font-medium text-[var(--color-text-secondary)]">사유</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {entries.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-[var(--color-text-tertiary)]">조건에 맞는 내역이 없습니다.</td></tr>
              ) : entries.map((e) => {
                const before = e.balanceAfter - e.amount;
                return (
                  <tr key={e.id} className="hover:bg-[var(--color-surface-muted)]">
                    <td className="px-4 py-3 text-[var(--color-text-tertiary)] whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${e.user.id}`} className="text-[var(--color-accent-primary)] hover:underline font-medium">{e.user.nickname}</Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] font-medium">
                        {SCORE_TYPE_LABELS[e.type] ?? e.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${e.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {e.amount > 0 ? "+" : ""}{e.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text-secondary)]">{before.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{e.balanceAfter.toLocaleString()}</td>
                    <td className="px-4 py-3 text-[var(--color-text-tertiary)] max-w-[160px] truncate" title={e.description ?? ""}>
                      {e.description ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/scores/ledger?search=${search}&direction=${direction}&period=${period}&page=${p}${types.map((t) => `&type=${t}`).join("")}`}
              className={`w-8 h-8 flex items-center justify-center rounded text-sm ${p === page ? "bg-[var(--color-accent-primary)] text-white font-medium" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"}`}
            >
              {p}
            </Link>
          ))}
          {totalPages > 10 && <span className="text-[var(--color-text-tertiary)] text-sm">… 총 {totalPages}페이지</span>}
        </div>
      )}
    </div>
  );
}
