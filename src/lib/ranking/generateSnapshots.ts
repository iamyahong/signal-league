import prisma from "@/lib/prisma";
import { getRankingCombinations, calcScoresForCombination } from "./calcRankingScore";

export interface GenerateSnapshotsResult {
  snapshotsCreated: number;
  usersProcessed: number;
  durationMs: number;
  combinationsProcessed: number;
}

export async function generateSnapshots(): Promise<GenerateSnapshotsResult> {
  const startTime = Date.now();
  const now = new Date();

  const activeUsers = await prisma.user.findMany({
    where: { status: { in: ["BETA_ACTIVE", "ACTIVE"] }, deletedAt: null },
    select: { id: true },
  });

  const activeUserIds = activeUsers.map((u) => u.id);

  if (activeUserIds.length === 0) {
    return { snapshotsCreated: 0, usersProcessed: 0, durationMs: Date.now() - startTime, combinationsProcessed: 0 };
  }

  const categories = await prisma.category.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, slug: true },
    orderBy: { sortOrder: "asc" },
  });

  const combinations = getRankingCombinations(now, categories);

  let totalSnapshots = 0;

  await prisma.$transaction(
    async (tx) => {
      for (const combo of combinations) {
        await tx.rankingSnapshot.deleteMany({
          where: {
            periodType: combo.periodType,
            periodKey: combo.periodKey,
            categoryId: combo.categoryId ?? null,
          },
        });
      }

      const snapshotData: {
        periodType: string;
        periodKey: string;
        categoryId: string | null;
        categoryCode: string | null;
        userId: string;
        rank: number;
        score: number;
        totalPredictions: number;
        correctPredictions: number;
        accuracy: number;
      }[] = [];

      const userStatMap = new Map<
        string,
        {
          allTimeRank?: number;
          allTimeScore?: number;
          monthlyRank?: number;
          monthlyScore?: number;
          weeklyRank?: number;
          weeklyScore?: number;
          totalPredictions?: number;
          correctPredictions?: number;
          accuracy?: number;
        }
      >();

      for (const combo of combinations) {
        const scores = await calcScoresForCombination(tx, combo, activeUserIds, now);
        const sorted = [...scores].sort((a, b) => b.score - a.score);

        sorted.forEach((entry, idx) => {
          const rank = idx + 1;
          snapshotData.push({
            periodType: combo.periodType,
            periodKey: combo.periodKey,
            categoryId: combo.categoryId,
            categoryCode: combo.categoryCode,
            userId: entry.userId,
            rank,
            score: entry.score,
            totalPredictions: entry.totalPredictions,
            correctPredictions: entry.correctPredictions,
            accuracy: entry.accuracy,
          });

          if (!combo.categoryId) {
            const existing = userStatMap.get(entry.userId) ?? {};
            if (combo.periodType === "ALL_TIME") {
              existing.allTimeRank = rank;
              existing.allTimeScore = entry.score;
              existing.totalPredictions = entry.totalPredictions;
              existing.correctPredictions = entry.correctPredictions;
              existing.accuracy = entry.accuracy;
            } else if (combo.periodType === "MONTHLY") {
              existing.monthlyRank = rank;
              existing.monthlyScore = entry.score;
            } else if (combo.periodType === "WEEKLY") {
              existing.weeklyRank = rank;
              existing.weeklyScore = entry.score;
            }
            userStatMap.set(entry.userId, existing);
          }
        });
      }

      if (snapshotData.length > 0) {
        await tx.rankingSnapshot.createMany({ data: snapshotData });
        totalSnapshots = snapshotData.length;
      }

      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const periodKey = `${year}-${month}`;

      for (const [userId, stats] of userStatMap.entries()) {
        await tx.userRankingStat.upsert({
          where: { userId_periodType_periodKey: { userId, periodType: "MONTHLY", periodKey } },
          create: {
            userId,
            periodType: "MONTHLY",
            periodKey,
            totalRank: stats.allTimeRank ?? null,
            totalScore: stats.allTimeScore ?? 0,
            monthlyRank: stats.monthlyRank ?? null,
            monthlyScore: stats.monthlyScore ?? 0,
            weeklyRank: stats.weeklyRank ?? null,
            weeklyScore: stats.weeklyScore ?? 0,
            accuracy: stats.accuracy ?? 0,
          },
          update: {
            totalRank: stats.allTimeRank ?? null,
            totalScore: stats.allTimeScore ?? 0,
            monthlyRank: stats.monthlyRank ?? null,
            monthlyScore: stats.monthlyScore ?? 0,
            weeklyRank: stats.weeklyRank ?? null,
            weeklyScore: stats.weeklyScore ?? 0,
            accuracy: stats.accuracy ?? 0,
          },
        });
      }
    },
    { timeout: 60000 }
  );

  return {
    snapshotsCreated: totalSnapshots,
    usersProcessed: activeUserIds.length,
    durationMs: Date.now() - startTime,
    combinationsProcessed: combinations.length,
  };
}
