import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import { ScoreLedgerType } from "@prisma/client";

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const issueTypes = [ScoreLedgerType.PLAN_GRANT, ScoreLedgerType.ADMIN_ADJUST_ADD, ScoreLedgerType.REFERRAL_BONUS];
    const consumeTypes = [ScoreLedgerType.QUESTION_CREATE_COST, ScoreLedgerType.PREDICTION_ALLOCATE, ScoreLedgerType.PREDICTION_LOSE];
    const refundTypes = [ScoreLedgerType.QUESTION_VOID_REFUND, ScoreLedgerType.QUESTION_CREATE_REFUND];

    const [
      totalIssued,
      totalConsumed,
      totalRefunded,
      adminAdjustTotal,
      totalAvailable,
      byType,
      largeIncreases,
      frequentAdminAdjust,
    ] = await Promise.all([
      prisma.scoreLedger.aggregate({
        where: { type: { in: issueTypes }, deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.scoreLedger.aggregate({
        where: { type: { in: consumeTypes }, deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.scoreLedger.aggregate({
        where: { type: { in: refundTypes }, deletedAt: null },
        _sum: { amount: true },
      }),
      prisma.scoreLedger.aggregate({
        where: {
          type: { in: [ScoreLedgerType.ADMIN_ADJUST_ADD, ScoreLedgerType.ADMIN_ADJUST_SUBTRACT] },
          deletedAt: null,
        },
        _sum: { amount: true },
      }),
      prisma.userProfile.aggregate({ _sum: { availableScore: true } }),
      prisma.scoreLedger.groupBy({
        by: ["type"],
        where: { deletedAt: null },
        _count: { _all: true },
        _sum: { amount: true },
      }),
      prisma.$queryRaw<Array<{ userId: string; nickname: string; totalIncrease: bigint }>>`
        SELECT sl."userId", up_user.nickname, SUM(sl.amount) as "totalIncrease"
        FROM score_ledgers sl
        JOIN users up_user ON sl."userId" = up_user.id
        WHERE sl.amount > 0 AND sl."createdAt" >= ${yesterday} AND sl."deletedAt" IS NULL
        GROUP BY sl."userId", up_user.nickname
        HAVING SUM(sl.amount) >= 5000
        ORDER BY "totalIncrease" DESC
        LIMIT 10
      `,
      prisma.$queryRaw<Array<{ actorId: string; nickname: string; count: bigint }>>`
        SELECT al."actorId", u.nickname, COUNT(*) as count
        FROM audit_logs al
        JOIN users u ON al."actorId" = u.id
        WHERE al.action IN ('SCORE_ADJUST_ADD', 'SCORE_ADJUST_SUBTRACT')
          AND al."createdAt" >= ${sevenDaysAgo}
          AND al."deletedAt" IS NULL
        GROUP BY al."actorId", u.nickname
        HAVING COUNT(*) >= 5
        ORDER BY count DESC
      `,
    ]);

    return NextResponse.json({
      kpi: {
        totalIssued: totalIssued._sum.amount ?? 0,
        totalConsumed: Math.abs(totalConsumed._sum.amount ?? 0),
        totalRefunded: totalRefunded._sum.amount ?? 0,
        adminAdjustTotal: adminAdjustTotal._sum.amount ?? 0,
        totalAvailable: totalAvailable._sum.availableScore ?? 0,
      },
      byType: byType.map((b) => ({
        type: b.type,
        count: b._count._all,
        total: b._sum.amount ?? 0,
      })),
      alerts: {
        largeIncreases: largeIncreases.map((r) => ({
          userId: r.userId,
          nickname: r.nickname,
          totalIncrease: Number(r.totalIncrease),
        })),
        frequentAdminAdjust: frequentAdminAdjust.map((r) => ({
          actorId: r.actorId,
          nickname: r.nickname,
          count: Number(r.count),
        })),
      },
    });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
