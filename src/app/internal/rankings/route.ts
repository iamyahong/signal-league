import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

const PAGE_SIZE = 100;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = session.user.status as string;
  if (!["BETA_ACTIVE", "ACTIVE"].includes(status)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const periodType = sp.get("periodType") ?? "ALL_TIME";
  const categoryCode = sp.get("categoryCode") ?? "";

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const weekNum = getISOWeek(now);
  const periodKey =
    periodType === "ALL_TIME" ? "all"
    : periodType === "MONTHLY" ? `${year}-${month}`
    : `${year}-W${String(weekNum).padStart(2, "0")}`;

  const where: Record<string, unknown> = {
    periodType,
    periodKey,
    deletedAt: null,
  };

  if (categoryCode) {
    where.categoryCode = categoryCode;
  } else {
    where.categoryId = null;
  }

  const snapshots = await prisma.rankingSnapshot.findMany({
    where,
    orderBy: { rank: "asc" },
    take: PAGE_SIZE,
    select: {
      userId: true,
      rank: true,
      score: true,
      totalPredictions: true,
      correctPredictions: true,
      accuracy: true,
    },
  });

  const userIds = snapshots.map((s) => s.userId);
  const users = userIds.length > 0 ? await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      nickname: true,
      subscription: { select: { plan: { select: { code: true } } } },
    },
  }) : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  const rows = snapshots.map((s) => {
    const u = userMap.get(s.userId);
    return {
      rank: s.rank,
      userId: s.userId,
      nickname: u?.nickname ?? "—",
      planCode: u?.subscription?.plan?.code ?? null,
      score: s.score,
      accuracy: s.accuracy,
      totalPredictions: s.totalPredictions,
      correctPredictions: s.correctPredictions,
    };
  });

  const myEntry = session.user.id ? rows.find((r) => r.userId === session.user.id) : null;

  let myRankBeyondTop: number | null = null;
  if (!myEntry) {
    const mySnap = await prisma.rankingSnapshot.findFirst({
      where: { ...where, userId: session.user.id },
      select: { rank: true },
    });
    myRankBeyondTop = mySnap?.rank ?? null;
  }

  return NextResponse.json({ rows, myEntry, myRankBeyondTop, periodType, periodKey, categoryCode });
}

function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
