import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

function isAdmin(roles: string[]) {
  return roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR") || roles.includes("READ_ONLY");
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = (session.user.roles as string[]) ?? [];
  if (!isAdmin(roles)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const yesterday24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [latestSnapshot, activeUserCount, profileAgg, maxProfile, snapshotMeta, highScorers] = await Promise.all([
    prisma.rankingSnapshot.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.user.count({ where: { status: { in: ["BETA_ACTIVE", "ACTIVE"] }, deletedAt: null } }),
    prisma.userProfile.aggregate({
      where: { user: { status: { in: ["BETA_ACTIVE", "ACTIVE"] }, deletedAt: null } },
      _avg: { totalScore: true },
    }),
    prisma.userProfile.findFirst({
      where: { user: { status: { in: ["BETA_ACTIVE", "ACTIVE"] }, deletedAt: null } },
      orderBy: { totalScore: "desc" },
      select: { totalScore: true, user: { select: { nickname: true } } },
    }),
    prisma.rankingSnapshot.groupBy({
      by: ["periodType", "categoryCode", "createdAt"],
      _count: { userId: true },
      _avg: { score: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.scoreLedger.groupBy({
      by: ["userId"],
      where: { type: "PREDICTION_WIN", createdAt: { gte: yesterday24h }, deletedAt: null },
      _sum: { amount: true },
      having: { amount: { _sum: { gte: 10000 } } },
    }),
  ]);

  const highScoreUserIds = highScorers.map((h) => h.userId);
  const highScoreUsers = highScoreUserIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: highScoreUserIds } },
    select: { id: true, nickname: true, email: true },
  }) : [];
  const highScoreMap = new Map(highScoreUsers.map((u) => [u.id, u]));

  const suspiciousHighScore = highScorers.map((h) => ({
    userId: h.userId,
    nickname: highScoreMap.get(h.userId)?.nickname ?? "—",
    winAmount24h: h._sum.amount ?? 0,
  }));

  const highAccuracyUsers = await prisma.userProfile.findMany({
    where: {
      totalPredictions: { gte: 50 },
      user: { status: { in: ["BETA_ACTIVE", "ACTIVE"] }, deletedAt: null },
    },
    select: { userId: true, correctPredictions: true, totalPredictions: true, user: { select: { nickname: true } } },
  });

  const suspiciousHighAccuracy = highAccuracyUsers
    .filter((p) => p.totalPredictions > 0 && p.correctPredictions / p.totalPredictions >= 0.95)
    .map((p) => ({
      userId: p.userId,
      nickname: p.user.nickname,
      accuracy: Math.round((p.correctPredictions / p.totalPredictions) * 100),
      totalPredictions: p.totalPredictions,
    }));

  return NextResponse.json({
    latestSnapshotAt: latestSnapshot?.createdAt ?? null,
    activeUserCount,
    avgTotalScore: Math.round(profileAgg._avg.totalScore ?? 0),
    maxTotalScore: maxProfile?.totalScore ?? 0,
    maxScoreNickname: maxProfile?.user.nickname ?? "—",
    snapshotMeta,
    suspiciousHighScore,
    suspiciousHighAccuracy,
  });
}
