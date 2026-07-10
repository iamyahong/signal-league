import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import { UserStatus, ScoreLedgerType } from "@prisma/client";

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      betaActive,
      pendingBeta,
      suspended,
      todayNew,
      totalIssuedScore,
      totalAvailableScore,
      recentAdjustments,
      recentAuditLogs,
      dailySignups,
      planDistribution,
      pendingPlanDistribution,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { status: UserStatus.BETA_ACTIVE } }),
      prisma.user.count({ where: { status: UserStatus.PENDING_BETA } }),
      prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
      prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.scoreLedger.aggregate({
        where: { amount: { gt: 0 }, deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.userProfile.aggregate({ _sum: { availableScore: true } }),
      prisma.scoreLedger.count({
        where: {
          type: { in: [ScoreLedgerType.ADMIN_ADJUST_ADD, ScoreLedgerType.ADMIN_ADJUST_SUBTRACT] },
          createdAt: { gte: sevenDaysAgo },
          deletedAt: null,
        },
      }),
      prisma.auditLog.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { actor: { select: { nickname: true } } },
      }),
      prisma.$queryRaw<Array<{ day: string; count: bigint }>>`
        SELECT DATE("createdAt") as day, COUNT(*) as count
        FROM users
        WHERE "createdAt" >= ${sevenDaysAgo} AND "deletedAt" IS NULL
        GROUP BY DATE("createdAt")
        ORDER BY day
      `,
      prisma.subscription.groupBy({
        by: ["planId"],
        where: { status: "BETA_ACTIVE", deletedAt: null },
        _count: { _all: true },
      }),
      prisma.user.groupBy({
        by: ["desiredPlanCode"],
        where: { status: UserStatus.PENDING_BETA, deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    const planIds = planDistribution.map((p) => p.planId);
    const plans = planIds.length
      ? await prisma.plan.findMany({ where: { id: { in: planIds } } })
      : [];

    return NextResponse.json({
      stats: {
        totalUsers,
        betaActive,
        pendingBeta,
        suspended,
        todayNew,
        totalIssuedScore: totalIssuedScore._sum.amount ?? 0,
        totalAvailableScore: totalAvailableScore._sum.availableScore ?? 0,
        recentAdjustments,
      },
      recentAuditLogs,
      dailySignups: dailySignups.map((d) => ({ day: String(d.day), count: Number(d.count) })),
      planDistribution: planDistribution.map((p) => ({
        planCode: plans.find((pl) => pl.id === p.planId)?.code ?? p.planId,
        count: p._count._all,
      })),
      pendingPlanDistribution: pendingPlanDistribution.map((p) => ({
        planCode: p.desiredPlanCode,
        count: p._count._all,
      })),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
