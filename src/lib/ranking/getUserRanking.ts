import prisma from "@/lib/prisma";

export interface UserRankingStats {
  allTimeRank: number | null;
  allTimeScore: number;
  monthlyRank: number | null;
  monthlyScore: number;
  weeklyRank: number | null;
  weeklyScore: number;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
}

export async function getUserRankingStats(userId: string): Promise<UserRankingStats> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const periodKey = `${year}-${month}`;

  const stat = await prisma.userRankingStat.findUnique({
    where: { userId_periodType_periodKey: { userId, periodType: "MONTHLY", periodKey } },
  });

  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { totalPredictions: true, correctPredictions: true },
  });

  return {
    allTimeRank: stat?.totalRank ?? null,
    allTimeScore: stat?.totalScore ?? 0,
    monthlyRank: stat?.monthlyRank ?? null,
    monthlyScore: stat?.monthlyScore ?? 0,
    weeklyRank: stat?.weeklyRank ?? null,
    weeklyScore: stat?.weeklyScore ?? 0,
    accuracy: stat?.accuracy ?? 0,
    totalPredictions: profile?.totalPredictions ?? 0,
    correctPredictions: profile?.correctPredictions ?? 0,
  };
}
