import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { AppHeader } from "@/components/layout/AppHeader";
import { PLAN_LABELS } from "@/lib/constants/scoreLedger";
import { QuestionStatus } from "@prisma/client";
import { Clock, Users, BarChart2, Plus, Trophy } from "lucide-react";
import { CategoryBadge } from "@/components/prediction/StatusBadge";
import { MiniRankingWidget } from "@/components/ranking/MiniRankingWidget";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status === "PENDING_BETA") redirect("/pending");
  if (session.user.status === "SUSPENDED") redirect("/suspended");

  const userId = session.user.id;
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const isBetaActive = session.user.status === "BETA_ACTIVE" || session.user.status === "ACTIVE";

  const [user, profile, subscription, monthlyIssued, monthlyUsed, closingQuestions, popularQuestions, myParticipationIds, topRankingSnaps, myAllTimeSnap] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } }),
    prisma.userProfile.findUnique({ where: { userId }, select: { availableScore: true, totalScore: true } }),
    prisma.subscription.findUnique({ where: { userId }, select: { betaApprovedAt: true, plan: { select: { code: true, name: true } } } }),
    prisma.scoreLedger.aggregate({ where: { userId, createdAt: { gte: startOfMonth }, amount: { gt: 0 }, deletedAt: null }, _sum: { amount: true } }),
    prisma.scoreLedger.aggregate({ where: { userId, createdAt: { gte: startOfMonth }, amount: { lt: 0 }, deletedAt: null }, _sum: { amount: true } }),
    prisma.predictionQuestion.findMany({
      where: { status: QuestionStatus.OPEN, closesAt: { gte: now, lte: in24h }, deletedAt: null },
      orderBy: { closesAt: "asc" },
      take: 3,
      include: { category: { select: { slug: true, name: true } }, _count: { select: { participations: { where: { deletedAt: null } } } } },
    }),
    prisma.predictionQuestion.findMany({
      where: { status: QuestionStatus.OPEN, deletedAt: null },
      orderBy: { totalParticipants: "desc" },
      take: 3,
      include: { category: { select: { slug: true, name: true } }, _count: { select: { participations: { where: { deletedAt: null } } } } },
    }),
    prisma.predictionParticipation.findMany({
      where: { userId, deletedAt: null },
      select: { questionId: true },
    }),
    prisma.rankingSnapshot.findMany({
      where: { periodType: "ALL_TIME", periodKey: "all", categoryId: null, deletedAt: null },
      orderBy: { rank: "asc" },
      take: 5,
      select: { userId: true, rank: true, score: true },
    }),
    prisma.rankingSnapshot.findFirst({
      where: { periodType: "ALL_TIME", periodKey: "all", categoryId: null, userId, deletedAt: null },
      select: { rank: true },
    }),
  ]);

  const myQIds = new Set(myParticipationIds.map((p) => p.questionId));
  const closingFiltered = closingQuestions.filter((q) => !myQIds.has(q.id));

  const rankingUserIds = topRankingSnaps.map((s) => s.userId);
  const rankingUsers = rankingUserIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: rankingUserIds } },
    select: { id: true, nickname: true },
  }) : [];
  const rankingUserMap = new Map(rankingUsers.map((u) => [u.id, u.nickname]));
  const miniRankingRows = topRankingSnaps.map((s) => ({
    rank: s.rank,
    userId: s.userId,
    nickname: rankingUserMap.get(s.userId) ?? "—",
    score: s.score,
  }));
  const score = profile?.availableScore ?? 0;
  const totalScore = profile?.totalScore ?? 0;
  const planCode = subscription?.plan?.code;
  const planName = planCode ? (PLAN_LABELS[planCode] ?? planCode) : "—";
  const betaApprovedAt = subscription?.betaApprovedAt;

  function diffHours(d: Date): string {
    const h = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60));
    if (h < 1) return "1시간 미만";
    return `${h}시간 후 마감`;
  }

  return (
    <>
      <AppHeader />
      <main>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">안녕하세요, {session.user.nickname}님 👋</h1>
            <p className="text-[var(--color-text-secondary)] mt-1">Signal League 베타 서비스에 오신 것을 환영합니다.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {/* Status card */}
              <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">내 상태 요약</h2>
                  {planCode && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--color-accent-primary)] text-white">{planName}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)]">
                    <p className="text-2xl font-bold text-[var(--color-accent-primary)] tabular-nums">{score.toLocaleString()}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">보유 점수</p>
                  </div>
                  <div className="text-center p-4 bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)]">
                    <p className="text-2xl font-bold text-green-600 tabular-nums">+{(monthlyIssued._sum.amount ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">이번 달 지급</p>
                  </div>
                  <div className="text-center p-4 bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)]">
                    <p className="text-2xl font-bold text-[var(--color-text-secondary)] tabular-nums">{Math.abs(monthlyUsed._sum.amount ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">이번 달 사용</p>
                  </div>
                  <div className="text-center p-4 bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)]">
                    <p className="text-2xl font-bold text-[var(--color-text-primary)] tabular-nums">{totalScore.toLocaleString()}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">누적 점수</p>
                  </div>
                  <div className="text-center p-4 bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)]">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("ko-KR") : "—"}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">가입일</p>
                  </div>
                  {betaApprovedAt && (
                    <div className="text-center p-4 bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)]">
                      <p className="text-sm font-semibold text-[var(--color-text-primary)]">{new Date(betaApprovedAt).toLocaleDateString("ko-KR")}</p>
                      <p className="text-xs text-[var(--color-text-secondary)] mt-1">베타 승인일</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex gap-3">
                  <Link href="/me/score" className="inline-flex items-center h-9 px-4 rounded-[var(--radius-md)] text-sm font-medium bg-[var(--color-accent-primary)] text-white hover:opacity-90 transition-opacity">점수 내역 보기</Link>
                  <Link href="/predictions" className="inline-flex items-center h-9 px-4 rounded-[var(--radius-md)] text-sm font-medium border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition-colors">
                    <BarChart2 className="h-4 w-4 mr-1.5" />예측 문제 보기
                  </Link>
                </div>
              </div>

              {/* Score policy */}
              <div className="bg-blue-50 border border-blue-200 rounded-[var(--radius-xl)] p-4">
                <p className="text-sm font-semibold text-blue-800 mb-1">점수 정책 안내</p>
                <p className="text-sm text-blue-700 leading-relaxed">Signal League의 점수는 비금전성 서비스 점수입니다. 현금, 상품권, 가상자산으로 교환·양도할 수 없으며, 예측 참여·문제 생성·랭킹 산정에만 사용됩니다.</p>
              </div>

              {/* Closing soon widget */}
              {closingFiltered.length > 0 && (
                <div className="bg-white rounded-[var(--radius-xl)] border border-red-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-red-600 flex items-center gap-1.5"><Clock className="h-4 w-4" />마감 임박 예측</h3>
                    <Link href="/predictions?tab=closing" className="text-xs text-[var(--color-accent-primary)] hover:underline">전체 보기</Link>
                  </div>
                  <div className="space-y-2">
                    {closingFiltered.map((q) => (
                      <Link key={q.id} href={`/predictions/${q.id}`} className="flex items-center justify-between p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors group">
                        <div className="flex items-center gap-2 min-w-0">
                          <CategoryBadge slug={q.category.slug} name={q.category.name} />
                          <span className="text-sm font-medium text-[var(--color-text-primary)] truncate group-hover:text-red-600 transition-colors">{q.title}</span>
                        </div>
                        <div className="shrink-0 flex items-center gap-3 ml-2">
                          <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]"><Users className="h-3 w-3" />{q._count.participations}</span>
                          <span className="text-xs font-semibold text-red-500">{diffHours(q.closesAt!)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right sidebar */}
            <div className="space-y-4">
              {/* Popular predictions widget */}
              <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-1.5"><BarChart2 className="h-4 w-4 text-[var(--color-accent-primary)]" />오늘의 인기 예측</h3>
                  <Link href="/predictions?tab=popular" className="text-xs text-[var(--color-accent-primary)] hover:underline">전체 보기</Link>
                </div>
                {popularQuestions.length === 0 ? (
                  <p className="text-xs text-[var(--color-text-tertiary)] text-center py-4">진행 중인 예측 문제가 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {popularQuestions.map((q, i) => (
                      <Link key={q.id} href={`/predictions/${q.id}`} className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-[var(--color-surface-muted)] transition-colors group">
                        <span className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-[var(--color-accent-primary)]/10 text-[10px] font-bold text-[var(--color-accent-primary)]">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--color-text-primary)] line-clamp-2 group-hover:text-[var(--color-accent-primary)] transition-colors">{q.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <CategoryBadge slug={q.category.slug} name={q.category.name} />
                            <span className="flex items-center gap-0.5 text-[10px] text-[var(--color-text-tertiary)]"><Users className="h-3 w-3" />{q._count.participations}명</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Mini Ranking Widget */}
              <MiniRankingWidget rows={miniRankingRows} myUserId={userId} myRank={myAllTimeSnap?.rank ?? null} />

              {/* Quick menu */}
              <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">빠른 메뉴</h3>
                <div className="space-y-1">
                  <Link href="/predictions" className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition-colors">
                    <span>예측 문제</span><span className="text-[var(--color-text-tertiary)]">→</span>
                  </Link>
                  {isBetaActive && (
                    <>
                      <Link href="/predictions/new" className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition-colors">
                        <span className="flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" />문제 만들기</span><span className="text-[var(--color-text-tertiary)]">→</span>
                      </Link>
                      <Link href="/me/questions" className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition-colors">
                        <span>내가 만든 문제</span><span className="text-[var(--color-text-tertiary)]">→</span>
                      </Link>
                    </>
                  )}
                  <Link href="/me/score" className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition-colors">
                    <span>점수 내역</span><span className="text-[var(--color-text-tertiary)]">→</span>
                  </Link>
                  <Link href="/rankings" className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-md)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] transition-colors">
                    <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" />랭킹</span><span className="text-[var(--color-text-tertiary)]">→</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
