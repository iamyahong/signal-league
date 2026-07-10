import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { nickname: true, profile: { select: { totalScore: true } } },
  });

  if (!user) return { title: "Signal League" };

  const snapshot = await prisma.rankingSnapshot.findFirst({
    where: { userId, periodType: "ALL_TIME", deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { rank: true },
  });

  const rank = snapshot?.rank;
  const title = `${user.nickname}님의 Signal League 랭킹`;
  const description = rank
    ? `전체 ${rank}위 · 총 ${(user.profile?.totalScore ?? 0).toLocaleString()}점`
    : `총 ${(user.profile?.totalScore ?? 0).toLocaleString()}점`;

  const ogImageUrl = `/internal/og/ranking/${userId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      siteName: "Signal League",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function RankingSharePage({ params }: Props) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      nickname: true,
      profile: {
        select: {
          totalScore: true,
          correctPredictions: true,
          totalPredictions: true,
        },
      },
    },
  });

  if (!user) notFound();

  const snapshot = await prisma.rankingSnapshot.findFirst({
    where: { userId, periodType: "ALL_TIME", deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { rank: true },
  });

  const rank = snapshot?.rank;
  const total = user.profile?.totalPredictions ?? 0;
  const correct = user.profile?.correctPredictions ?? 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/20">
          <span className="text-xs font-semibold text-[var(--color-accent-primary)] tracking-wider">SIGNAL LEAGUE</span>
        </div>

        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-8 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4">
            {user.nickname.slice(0, 1)}
          </div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-1">{user.nickname}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">Signal League 예측가</p>

          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] p-3">
              <div className="text-lg font-bold text-yellow-500">{rank ? `#${rank}` : "—"}</div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">전체 순위</div>
            </div>
            <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] p-3">
              <div className="text-lg font-bold text-emerald-500">{(user.profile?.totalScore ?? 0).toLocaleString()}</div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">총 점수</div>
            </div>
            <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] p-3">
              <div className="text-lg font-bold text-blue-500">{accuracy}%</div>
              <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">적중률</div>
            </div>
          </div>

          <Link
            href="/signup"
            className="block w-full py-3 px-4 rounded-[var(--radius-lg)] bg-[var(--color-accent-primary)] text-white text-sm font-semibold text-center hover:opacity-90 transition-opacity"
          >
            나도 Signal League 시작하기
          </Link>
        </div>

        <p className="text-xs text-[var(--color-text-tertiary)]">
          Signal League — 예측력 리그 플랫폼
        </p>
      </div>
    </div>
  );
}
