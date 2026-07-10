import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { KPICard } from "../_components/KPICard";
import { ScoreLedgerType } from "@prisma/client";
import { SCORE_TYPE_LABELS } from "@/lib/constants/scoreLedger";
import { AlertTriangle } from "lucide-react";

async function getScoreStats() {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const issueTypes = [ScoreLedgerType.PLAN_GRANT, ScoreLedgerType.ADMIN_ADJUST_ADD, ScoreLedgerType.REFERRAL_BONUS];
  const consumeTypes = [ScoreLedgerType.QUESTION_CREATE_COST, ScoreLedgerType.PREDICTION_ALLOCATE, ScoreLedgerType.PREDICTION_LOSE];
  const refundTypes = [ScoreLedgerType.QUESTION_VOID_REFUND, ScoreLedgerType.QUESTION_CREATE_REFUND];

  const [totalIssued, totalConsumed, totalRefunded, adminAdjust, totalAvailable, byType, largeIncreases, frequentAdmins] =
    await Promise.all([
      prisma.scoreLedger.aggregate({ where: { type: { in: issueTypes }, deletedAt: null }, _sum: { amount: true } }),
      prisma.scoreLedger.aggregate({ where: { type: { in: consumeTypes }, deletedAt: null }, _sum: { amount: true } }),
      prisma.scoreLedger.aggregate({ where: { type: { in: refundTypes }, deletedAt: null }, _sum: { amount: true } }),
      prisma.scoreLedger.aggregate({
        where: { type: { in: [ScoreLedgerType.ADMIN_ADJUST_ADD, ScoreLedgerType.ADMIN_ADJUST_SUBTRACT] }, deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.userProfile.aggregate({ _sum: { availableScore: true } }),
      prisma.scoreLedger.groupBy({ by: ["type"], where: { deletedAt: null }, _count: { _all: true }, _sum: { amount: true } }),
      prisma.$queryRaw<Array<{ userId: string; nickname: string; totalIncrease: bigint }>>`
        SELECT sl."userId", u.nickname, SUM(sl.amount) as "totalIncrease"
        FROM score_ledgers sl JOIN users u ON sl."userId" = u.id
        WHERE sl.amount > 0 AND sl."createdAt" >= ${yesterday} AND sl."deletedAt" IS NULL
        GROUP BY sl."userId", u.nickname HAVING SUM(sl.amount) >= 5000
        ORDER BY "totalIncrease" DESC LIMIT 10
      `,
      prisma.$queryRaw<Array<{ actorId: string; nickname: string; count: bigint }>>`
        SELECT al."actorId", u.nickname, COUNT(*) as count
        FROM audit_logs al JOIN users u ON al."actorId" = u.id
        WHERE al.action IN ('SCORE_ADJUST_ADD', 'SCORE_ADJUST_SUBTRACT')
          AND al."createdAt" >= ${sevenDaysAgo} AND al."deletedAt" IS NULL
        GROUP BY al."actorId", u.nickname HAVING COUNT(*) >= 5 ORDER BY count DESC
      `,
    ]);

  return {
    kpi: {
      totalIssued: totalIssued._sum.amount ?? 0,
      totalConsumed: Math.abs(totalConsumed._sum.amount ?? 0),
      totalRefunded: totalRefunded._sum.amount ?? 0,
      adminAdjust: adminAdjust._sum.amount ?? 0,
      totalAvailable: totalAvailable._sum.availableScore ?? 0,
    },
    byType: byType.map((b) => ({ type: b.type, count: b._count._all, total: b._sum.amount ?? 0 })),
    largeIncreases: largeIncreases.map((r) => ({ userId: r.userId, nickname: r.nickname, total: Number(r.totalIncrease) })),
    frequentAdmins: frequentAdmins.map((r) => ({ actorId: r.actorId, nickname: r.nickname, count: Number(r.count) })),
  };
}

export default async function AdminScoresPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { kpi, byType, largeIncreases, frequentAdmins } = await getScoreStats();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">점수 관리</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">전체 점수 발행 및 소진 현황</p>
        </div>
        <Link href="/admin/scores/ledger" className="inline-flex items-center h-8 px-3 rounded-[var(--radius-md)] text-sm border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition-colors">
          전체 점수 원장 →
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KPICard label="총 발행 점수" value={`${kpi.totalIssued.toLocaleString()}점`} accent />
        <KPICard label="총 보유 점수" value={`${kpi.totalAvailable.toLocaleString()}점`} />
        <KPICard label="총 소진 점수" value={`${kpi.totalConsumed.toLocaleString()}점`} />
        <KPICard label="총 반환 점수" value={`${kpi.totalRefunded.toLocaleString()}점`} />
        <KPICard label="수동 조정 합계" value={`${kpi.adminAdjust > 0 ? "+" : ""}${kpi.adminAdjust.toLocaleString()}점`} />
      </div>

      {(largeIncreases.length > 0 || frequentAdmins.length > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-xl)] p-4">
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <h2 className="text-sm font-semibold text-amber-800">주의 감지</h2>
          </div>
          <div className="space-y-2">
            {largeIncreases.map((u) => (
              <p key={u.userId} className="text-xs text-amber-700">
                <Link href={`/admin/users/${u.userId}`} className="font-medium underline">{u.nickname}</Link>
                {" "}— 최근 24시간 +{u.total.toLocaleString()}점 증가
              </p>
            ))}
            {frequentAdmins.map((a) => (
              <p key={a.actorId} className="text-xs text-amber-700">
                관리자 <Link href={`/admin/users/${a.actorId}`} className="font-medium underline">{a.nickname}</Link>
                {" "}— 최근 7일 수동 조정 {a.count}건
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">유형별 분포</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)]">
                <th className="pb-2 text-left text-xs font-medium text-[var(--color-text-secondary)]">유형</th>
                <th className="pb-2 text-right text-xs font-medium text-[var(--color-text-secondary)]">건수</th>
                <th className="pb-2 text-right text-xs font-medium text-[var(--color-text-secondary)]">합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {byType.sort((a, b) => Math.abs(b.total) - Math.abs(a.total)).map((row) => (
                <tr key={row.type}>
                  <td className="py-2 text-[var(--color-text-primary)]">{SCORE_TYPE_LABELS[row.type] ?? row.type}</td>
                  <td className="py-2 text-right tabular-nums text-[var(--color-text-secondary)]">{row.count.toLocaleString()}건</td>
                  <td className={`py-2 text-right tabular-nums font-medium ${row.total >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {row.total >= 0 ? "+" : ""}{row.total.toLocaleString()}점
                  </td>
                </tr>
              ))}
              {byType.length === 0 && (
                <tr><td colSpan={3} className="py-8 text-center text-[var(--color-text-tertiary)]">데이터 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
