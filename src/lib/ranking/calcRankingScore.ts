import { Prisma } from "@prisma/client";

const CATEGORY_SLUGS = ["economy", "international", "society", "tech", "culture", "sports"] as const;
export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export type RankingPeriodType = "ALL_TIME" | "MONTHLY" | "WEEKLY";

export interface UserRankingScore {
  userId: string;
  score: number;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
}

export interface RankingCombination {
  periodType: RankingPeriodType;
  periodKey: string;
  categoryId: string | null;
  categoryCode: string | null;
}

export function getRankingCombinations(
  now: Date,
  categories: { id: string; slug: string }[]
): RankingCombination[] {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const weekNum = getISOWeek(now);
  const weekKey = `${year}-W${String(weekNum).padStart(2, "0")}`;
  const monthKey = `${year}-${month}`;

  const combinations: RankingCombination[] = [];

  for (const periodType of ["ALL_TIME", "MONTHLY", "WEEKLY"] as RankingPeriodType[]) {
    const periodKey =
      periodType === "ALL_TIME" ? "all" : periodType === "MONTHLY" ? monthKey : weekKey;

    combinations.push({ periodType, periodKey, categoryId: null, categoryCode: null });

    for (const cat of categories) {
      combinations.push({ periodType, periodKey, categoryId: cat.id, categoryCode: cat.slug });
    }
  }

  return combinations;
}

export async function calcScoresForCombination(
  tx: Prisma.TransactionClient,
  combo: RankingCombination,
  activeUserIds: string[],
  now: Date
): Promise<UserRankingScore[]> {
  if (activeUserIds.length === 0) return [];

  const { periodType, categoryId } = combo;

  if (periodType === "ALL_TIME" && !categoryId) {
    const profiles = await tx.userProfile.findMany({
      where: { userId: { in: activeUserIds }, deletedAt: null },
      select: { userId: true, totalScore: true, totalPredictions: true, correctPredictions: true },
    });

    return profiles.map((p) => ({
      userId: p.userId,
      score: p.totalScore,
      totalPredictions: p.totalPredictions,
      correctPredictions: p.correctPredictions,
      accuracy: p.totalPredictions > 0 ? p.correctPredictions / p.totalPredictions : 0,
    }));
  }

  const gte =
    periodType === "MONTHLY"
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.getTime() - 7 * 86400000);

  const whereClause: Prisma.ScoreLedgerWhereInput = {
    userId: { in: activeUserIds },
    type: { in: ["PREDICTION_WIN", "SYSTEM_CORRECTION"] },
    createdAt: { gte },
    deletedAt: null,
  };

  if (categoryId) {
    whereClause.referenceType = "PredictionQuestion";
  }

  const ledgers = await tx.scoreLedger.findMany({
    where: whereClause,
    select: {
      userId: true,
      amount: true,
      referenceId: true,
    },
  });

  let filteredLedgers = ledgers;

  if (categoryId) {
    const questionIds = [...new Set(ledgers.map((l) => l.referenceId).filter(Boolean) as string[])];
    if (questionIds.length > 0) {
      const questions = await tx.predictionQuestion.findMany({
        where: { id: { in: questionIds }, categoryId, deletedAt: null },
        select: { id: true },
      });
      const validQIds = new Set(questions.map((q) => q.id));
      filteredLedgers = ledgers.filter((l) => l.referenceId && validQIds.has(l.referenceId));
    } else {
      filteredLedgers = [];
    }
  }

  const scoreMap = new Map<string, number>();
  for (const l of filteredLedgers) {
    scoreMap.set(l.userId, (scoreMap.get(l.userId) ?? 0) + l.amount);
  }

  const profiles = await tx.userProfile.findMany({
    where: { userId: { in: activeUserIds }, deletedAt: null },
    select: { userId: true, totalPredictions: true, correctPredictions: true },
  });

  const profileMap = new Map(profiles.map((p) => [p.userId, p]));

  return activeUserIds.map((uid) => {
    const p = profileMap.get(uid);
    const score = scoreMap.get(uid) ?? 0;
    const totalPredictions = p?.totalPredictions ?? 0;
    const correctPredictions = p?.correctPredictions ?? 0;
    return {
      userId: uid,
      score,
      totalPredictions,
      correctPredictions,
      accuracy: totalPredictions > 0 ? correctPredictions / totalPredictions : 0,
    };
  });
}

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
