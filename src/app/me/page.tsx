import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { TrendingUp, BarChart2, FileQuestion, Bell, ArrowRight, Trophy } from "lucide-react";
import { SCORE_TYPE_LABELS } from "@/lib/constants/scoreLedger";
import { ScoreLedgerType } from "@prisma/client";
import { getUserRankingStats } from "@/lib/ranking/getUserRanking";

export const dynamic = "force-dynamic";

function AccuracyBadge({ correct, total }: { correct: number; total: number }) {
  if (total === 0) return <span className="text-[var(--color-text-tertiary)]">—</span>;
  const pct = Math.round((correct / total) * 100);
  return (
    <span className={pct >= 60 ? "text-green-600 font-bold" : "text-[var(--color-text-primary)] font-bold"}>
      {pct}%
    </span>
  );
}

export default async function MePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    profile,
    recentLedgers,
    unreadCount,
    recentNotifications,
    myQuestionCount,
    monthIssuedAgg,
    monthUsedAgg,
    rankingStats,
  ] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: {
        availableScore: true,
        totalScore: true,
        totalPredictions: true,
        correctPredictions: true,
      },
    }),
    prisma.scoreLedger.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, isRead: false, deletedAt: null } }),
    prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        createdAt: true,
      },
    }),
    prisma.predictionQuestion.count({ where: { authorId: userId, deletedAt: null } }),
    prisma.scoreLedger.aggregate({
      where: { userId, amount: { gt: 0 }, createdAt: { gte: startOfMonth }, deletedAt: null },
      _sum: { amount: true },
    }),
    prisma.scoreLedger.aggregate({
      where: { userId, amount: { lt: 0 }, createdAt: { gte: startOfMonth }, deletedAt: null },
      _sum: { amount: true },
    }),
    getUserRankingStats(userId),
  ]);

  const stats = {
    availableScore: profile?.availableScore ?? 0,
    totalScore: profile?.totalScore ?? 0,
    totalPredictions: profile?.totalPredictions ?? 0,
    correctPredictions: profile?.correctPredictions ?? 0,
    monthIssued: monthIssuedAgg._sum.amount ?? 0,
    monthUsed: Math.abs(monthUsedAgg._sum.amount ?? 0),
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">마이페이지</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {session.user.nickname}님의 활동 현황입니다.
        </p>
      </div>

      {/* KPI — Row 1: 점수 현황 */}
      <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">점수 현황</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">현재 보유 점수</p>
          <p className="text-2xl font-bold text-[var(--color-accent-primary)] mt-1 tabular-nums">
            {stats.availableScore.toLocaleString()}
          </p>
          <Link href="/me/score" className="text-xs text-[var(--color-accent-primary)] hover:underline mt-1 inline-block">
            내역 보기 →
          </Link>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">누적 점수</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1 tabular-nums">
            {stats.totalScore.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">이번 달 지급</p>
          <p className="text-2xl font-bold text-green-600 mt-1 tabular-nums">
            +{stats.monthIssued.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">이번 달 사용</p>
          <p className="text-2xl font-bold text-red-500 mt-1 tabular-nums">
            -{stats.monthUsed.toLocaleString()}
          </p>
        </div>
      </div>

      {/* KPI — Row 2: 활동 현황 */}
      {/* 랭킹 현황 */}
      <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">랭킹 현황</p>
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--color-accent-primary)]" />
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">내 랭킹</h2>
          </div>
          <Link href="/rankings" className="text-xs text-[var(--color-accent-primary)] hover:underline flex items-center gap-1">
            전체 랭킹 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="text-center p-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)]">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">누적</p>
            <p className="font-bold text-[var(--color-text-primary)]">{rankingStats.allTimeRank ? `${rankingStats.allTimeRank}위` : "—"}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{rankingStats.allTimeScore.toLocaleString()}점</p>
          </div>
          <div className="text-center p-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)]">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">월간</p>
            <p className="font-bold text-[var(--color-text-primary)]">{rankingStats.monthlyRank ? `${rankingStats.monthlyRank}위` : "—"}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">+{rankingStats.monthlyScore.toLocaleString()}점</p>
          </div>
          <div className="text-center p-3 rounded-[var(--radius-lg)] bg-[var(--color-surface-muted)]">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-1">주간</p>
            <p className="font-bold text-[var(--color-text-primary)]">{rankingStats.weeklyRank ? `${rankingStats.weeklyRank}위` : "—"}</p>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">+{rankingStats.weeklyScore.toLocaleString()}점</p>
          </div>
        </div>
        {rankingStats.totalPredictions === 0 && (
          <p className="text-xs text-[var(--color-text-tertiary)] mt-3 text-center">예측에 참여하면 랭킹이 생성됩니다.</p>
        )}
      </div>

      <p className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-2">활동 현황</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">예측 참여</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1 tabular-nums">
            {stats.totalPredictions.toLocaleString()}
          </p>
          <Link href="/me/predictions" className="text-xs text-[var(--color-accent-primary)] hover:underline mt-1 inline-block">
            참여 내역 →
          </Link>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">총 만든 문제</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1 tabular-nums">
            {myQuestionCount.toLocaleString()}
          </p>
          <Link href="/me/questions" className="text-xs text-[var(--color-accent-primary)] hover:underline mt-1 inline-block">
            문제 목록 →
          </Link>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">예측 정확도</p>
          <p className="text-2xl mt-1">
            <AccuracyBadge correct={stats.correctPredictions} total={stats.totalPredictions} />
          </p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
            {stats.correctPredictions} / {stats.totalPredictions}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent score entries */}
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--color-accent-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">최근 점수 변동</h2>
            </div>
            <Link href="/me/score" className="text-xs text-[var(--color-accent-primary)] hover:underline flex items-center gap-1">
              전체 보기 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentLedgers.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)] py-4 text-center">점수 변동 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {recentLedgers.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="text-[var(--color-text-secondary)]">
                      {SCORE_TYPE_LABELS[e.type as ScoreLedgerType] ?? e.type}
                    </span>
                    {e.description && (
                      <p className="text-xs text-[var(--color-text-tertiary)] truncate max-w-[180px]">
                        {e.description}
                      </p>
                    )}
                  </div>
                  <span className={`font-semibold tabular-nums ${e.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                    {e.amount > 0 ? "+" : ""}{e.amount.toLocaleString()}점
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[var(--color-accent-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">알림</h2>
              {unreadCount > 0 && (
                <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5 font-medium">
                  {unreadCount}
                </span>
              )}
            </div>
            <Link href="/notifications" className="text-xs text-[var(--color-accent-primary)] hover:underline flex items-center gap-1">
              전체 보기 <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {recentNotifications.length === 0 ? (
            <p className="text-sm text-[var(--color-text-tertiary)] py-4 text-center">알림이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {recentNotifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg p-2.5 text-sm ${n.isRead ? "bg-gray-50" : "bg-blue-50 border border-blue-100"}`}
                >
                  <p className={`font-medium ${n.isRead ? "text-[var(--color-text-secondary)]" : "text-[var(--color-text-primary)]"}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 line-clamp-1">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link href="/me/predictions" className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 flex items-center gap-3 hover:border-[var(--color-accent-primary)]/40 transition-colors">
          <BarChart2 className="h-5 w-5 text-[var(--color-accent-primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">참여 내역</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">내가 참여한 예측 문제</p>
          </div>
        </Link>
        <Link href="/me/questions" className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 flex items-center gap-3 hover:border-[var(--color-accent-primary)]/40 transition-colors">
          <FileQuestion className="h-5 w-5 text-[var(--color-accent-primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">내가 만든 문제</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">총 {myQuestionCount}개 문제 생성</p>
          </div>
        </Link>
        <Link href="/notifications" className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 flex items-center gap-3 hover:border-[var(--color-accent-primary)]/40 transition-colors">
          <Bell className="h-5 w-5 text-[var(--color-accent-primary)]" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">전체 알림</p>
            <p className="text-xs text-[var(--color-text-tertiary)]">
              {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : "읽지 않은 알림 없음"}
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
