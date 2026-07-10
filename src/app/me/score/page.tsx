import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ScoreLedgerType, Prisma } from "@prisma/client";
import { SCORE_TYPE_LABELS } from "@/lib/constants/scoreLedger";
import { ScorePageClient } from "./_components/ScorePageClient";

interface Props {
  searchParams: Promise<{ type?: string | string[]; direction?: string; period?: string; page?: string }>;
}

async function getScoreData(userId: string, types: ScoreLedgerType[], direction: string, period: string, page: number) {
  const pageSize = 30;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodStart =
    period === "today" ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) :
    period === "7d" ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
    period === "30d" ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) : null;

  const where: Prisma.ScoreLedgerWhereInput = {
    userId, deletedAt: null,
    ...(types.length > 0 && { type: { in: types } }),
    ...(direction === "increase" && { amount: { gt: 0 } }),
    ...(direction === "decrease" && { amount: { lt: 0 } }),
    ...(periodStart && { createdAt: { gte: periodStart } }),
  };

  const [profile, total, entries, monthlyIssued, monthlyUsed] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId }, select: { availableScore: true, totalScore: true } }),
    prisma.scoreLedger.count({ where }),
    prisma.scoreLedger.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.scoreLedger.aggregate({
      where: { userId, createdAt: { gte: startOfMonth }, amount: { gt: 0 }, deletedAt: null }, _sum: { amount: true },
    }),
    prisma.scoreLedger.aggregate({
      where: { userId, createdAt: { gte: startOfMonth }, amount: { lt: 0 }, deletedAt: null }, _sum: { amount: true },
    }),
  ]);

  return {
    summary: {
      availableScore: profile?.availableScore ?? 0,
      totalScore: profile?.totalScore ?? 0,
      monthlyIssued: monthlyIssued._sum.amount ?? 0,
      monthlyUsed: Math.abs(monthlyUsed._sum.amount ?? 0),
    },
    entries: entries.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      balanceAfter: e.balanceAfter,
      balanceBefore: e.balanceAfter - e.amount,
      description: e.description,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    totalPages: Math.ceil(total / pageSize),
    page,
  };
}

export const dynamic = "force-dynamic";

export default async function MeScorePage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const rawTypes = Array.isArray(sp.type) ? sp.type : sp.type ? [sp.type] : [];
  const types = rawTypes.filter((t) => Object.values(ScoreLedgerType).includes(t as ScoreLedgerType)) as ScoreLedgerType[];
  const direction = sp.direction ?? "all";
  const period = sp.period ?? "all";
  const page = Math.max(1, parseInt(sp.page ?? "1"));

  const data = await getScoreData(session.user.id, types, direction, period, page);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">점수 내역</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">내 점수 변동 내역을 확인합니다.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">현재 보유 점수</p>
          <p className="text-2xl font-bold text-[var(--color-accent-primary)] mt-1 tabular-nums">{data.summary.availableScore.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">누적 점수</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1 tabular-nums">{data.summary.totalScore.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">이번 달 지급</p>
          <p className="text-2xl font-bold text-green-600 mt-1 tabular-nums">+{data.summary.monthlyIssued.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">이번 달 사용</p>
          <p className="text-2xl font-bold text-[var(--color-text-secondary)] mt-1 tabular-nums">{data.summary.monthlyUsed.toLocaleString()}</p>
        </div>
      </div>

      <ScorePageClient
        entries={data.entries}
        total={data.total}
        totalPages={data.totalPages}
        currentPage={data.page}
        currentTypes={types}
        currentDirection={direction}
        currentPeriod={period}
      />
    </>
  );
}
