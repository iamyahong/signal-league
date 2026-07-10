import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ScoreLedgerType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = req.nextUrl;
  const types = searchParams.getAll("type") as ScoreLedgerType[];
  const direction = searchParams.get("direction") ?? "all";
  const period = searchParams.get("period") ?? "all";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 30;

  const now = new Date();
  const periodStart =
    period === "today" ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) :
    period === "7d" ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
    period === "30d" ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) : null;

  const where: import("@prisma/client").Prisma.ScoreLedgerWhereInput = {
    userId,
    deletedAt: null,
    ...(types.length > 0 && { type: { in: types } }),
    ...(direction === "increase" && { amount: { gt: 0 } }),
    ...(direction === "decrease" && { amount: { lt: 0 } }),
    ...(periodStart && { createdAt: { gte: periodStart } }),
  };

  const [profile, total, entries] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: { availableScore: true, totalScore: true },
    }),
    prisma.scoreLedger.count({ where }),
    prisma.scoreLedger.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyStats = await prisma.scoreLedger.aggregate({
    where: { userId, createdAt: { gte: startOfMonth }, deletedAt: null },
    _sum: { amount: true },
  });
  const monthlyIssued = await prisma.scoreLedger.aggregate({
    where: { userId, createdAt: { gte: startOfMonth }, amount: { gt: 0 }, deletedAt: null },
    _sum: { amount: true },
  });
  const monthlyUsed = await prisma.scoreLedger.aggregate({
    where: { userId, createdAt: { gte: startOfMonth }, amount: { lt: 0 }, deletedAt: null },
    _sum: { amount: true },
  });

  return NextResponse.json({
    summary: {
      availableScore: profile?.availableScore ?? 0,
      totalScore: profile?.totalScore ?? 0,
      monthlyIssued: monthlyIssued._sum.amount ?? 0,
      monthlyUsed: Math.abs(monthlyUsed._sum.amount ?? 0),
    },
    entries: entries.map((e) => ({
      ...e,
      balanceBefore: e.balanceAfter - e.amount,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
