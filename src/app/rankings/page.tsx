import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import prisma from "@/lib/prisma";
import { getUserRankingStats } from "@/lib/ranking/getUserRanking";
import { RankingTable } from "@/components/ranking/RankingTable";
import Link from "next/link";
import { Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

const PERIOD_LABELS = { ALL_TIME: "누적", MONTHLY: "월간", WEEKLY: "주간" } as const;
type PeriodType = keyof typeof PERIOD_LABELS;

const CATEGORY_OPTIONS = [
  { code: "", name: "전체" },
  { code: "economy", name: "경제·금융" },
  { code: "international", name: "국제정세" },
  { code: "society", name: "사회" },
  { code: "tech", name: "기술·AI" },
  { code: "culture", name: "문화·엔터" },
  { code: "sports", name: "스포츠" },
];

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const status = session.user.status as string;
  if (!["BETA_ACTIVE", "ACTIVE"].includes(status)) redirect("/pending");

  const sp = await searchParams;
  const periodType = (sp.periodType ?? "ALL_TIME") as PeriodType;
  const categoryCode = sp.categoryCode ?? "";

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const weekNum = getISOWeek(now);
  const periodKey =
    periodType === "ALL_TIME" ? "all"
    : periodType === "MONTHLY" ? `${year}-${month}`
    : `${year}-W${String(weekNum).padStart(2, "0")}`;

  const userId = session.user.id;

  const whereSnap = {
    periodType,
    periodKey,
    deletedAt: null as null,
    categoryCode: categoryCode || null,
    categoryId: categoryCode ? undefined : null as null,
  };

  const [snapshots, myRankingStat] = await Promise.all([
    prisma.rankingSnapshot.findMany({
      where: whereSnap,
      orderBy: { rank: "asc" },
      take: 100,
      select: { userId: true, rank: true, score: true, accuracy: true, totalPredictions: true, correctPredictions: true },
    }),
    getUserRankingStats(userId),
  ]);

  const userIds = snapshots.map((s) => s.userId);
  const users = userIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, nickname: true, subscription: { select: { plan: { select: { code: true } } } } },
  }) : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows = snapshots.map((s) => ({
    rank: s.rank,
    userId: s.userId,
    nickname: userMap.get(s.userId)?.nickname ?? "—",
    planCode: userMap.get(s.userId)?.subscription?.plan?.code ?? null,
    score: s.score,
    accuracy: s.accuracy,
    totalPredictions: s.totalPredictions,
    correctPredictions: s.correctPredictions,
  }));

  const myEntry = rows.find((r) => r.userId === userId);
  let myRankBeyondTop: number | null = null;
  if (!myEntry) {
    const mySnap = await prisma.rankingSnapshot.findFirst({
      where: { ...whereSnap, userId },
      select: { rank: true },
    });
    myRankBeyondTop = mySnap?.rank ?? null;
  }

  const buildUrl = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ periodType, categoryCode, ...overrides });
    return `/rankings?${params.toString()}`;
  };

  return (
    <>
      <AppHeader />
      <main>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="h-6 w-6 text-[var(--color-accent-primary)]" />
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">랭킹</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
                <div className="flex flex-wrap gap-2 mb-3">
                  {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((pt) => (
                    <Link
                      key={pt}
                      href={buildUrl({ periodType: pt })}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${periodType === pt ? "bg-[var(--color-accent-primary)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)]"}`}
                    >
                      {PERIOD_LABELS[pt]}
                    </Link>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <Link
                      key={cat.code}
                      href={buildUrl({ categoryCode: cat.code })}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${categoryCode === cat.code ? "bg-slate-700 text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)]"}`}
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {PERIOD_LABELS[periodType]} 랭킹 TOP {rows.length}
                    {categoryCode && (
                      <span className="text-[var(--color-text-tertiary)] ml-1.5 font-normal">
                        — {CATEGORY_OPTIONS.find((c) => c.code === categoryCode)?.name}
                      </span>
                    )}
                  </h2>
                  <span className="text-xs text-[var(--color-text-tertiary)]">{periodKey}</span>
                </div>
                <RankingTable rows={rows} myUserId={userId} myRankBeyondTop={myRankBeyondTop} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">내 랭킹</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">누적</span>
                    <span className="font-bold">
                      {myRankingStat.allTimeRank ? `${myRankingStat.allTimeRank}위` : "—"}
                      <span className="text-xs text-[var(--color-text-tertiary)] ml-1.5">/ {myRankingStat.allTimeScore.toLocaleString()}점</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">월간</span>
                    <span className="font-bold">
                      {myRankingStat.monthlyRank ? `${myRankingStat.monthlyRank}위` : "—"}
                      <span className="text-xs text-[var(--color-text-tertiary)] ml-1.5">/ +{myRankingStat.monthlyScore.toLocaleString()}점</span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">주간</span>
                    <span className="font-bold">
                      {myRankingStat.weeklyRank ? `${myRankingStat.weeklyRank}위` : "—"}
                      <span className="text-xs text-[var(--color-text-tertiary)] ml-1.5">/ +{myRankingStat.weeklyScore.toLocaleString()}점</span>
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-border-default)] pt-2 mt-2">
                    <span className="text-[var(--color-text-secondary)]">정확도</span>
                    <span className="font-medium">
                      {myRankingStat.totalPredictions === 0 ? "—" : `${Math.round(myRankingStat.accuracy * 100)}%`}
                      <span className="text-xs text-[var(--color-text-tertiary)] ml-1.5">
                        ({myRankingStat.correctPredictions}/{myRankingStat.totalPredictions})
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-xl)] p-4 text-sm text-[var(--color-text-secondary)] leading-relaxed">
                <p className="font-semibold text-[var(--color-text-primary)] mb-1">랭킹 안내</p>
                <ul className="space-y-1 text-xs">
                  <li>• 랭킹은 매일 자동 갱신됩니다.</li>
                  <li>• 누적 랭킹: 전체 누적 점수 기준</li>
                  <li>• 월간: 이번 달 적중 점수 합계</li>
                  <li>• 주간: 최근 7일 적중 점수 합계</li>
                  <li>• 점수는 비금전성 서비스 점수입니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
