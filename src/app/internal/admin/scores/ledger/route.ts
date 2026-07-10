import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import { ScoreLedgerType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = req.nextUrl;

    const search = searchParams.get("search") ?? "";
    const types = searchParams.getAll("type") as ScoreLedgerType[];
    const direction = searchParams.get("direction") ?? "all";
    const period = searchParams.get("period") ?? "all";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = 50;

    const now = new Date();
    const periodStart =
      period === "today" ? new Date(now.getFullYear(), now.getMonth(), now.getDate()) :
      period === "7d" ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) :
      period === "30d" ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) : null;

    let userIds: string[] | null = null;
    if (search) {
      const matchUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { nickname: { contains: search, mode: "insensitive" } },
          ],
        },
        select: { id: true },
        take: 50,
      });
      userIds = matchUsers.map((u) => u.id);
    }

    const where: import("@prisma/client").Prisma.ScoreLedgerWhereInput = {
      deletedAt: null,
      ...(userIds !== null && { userId: { in: userIds } }),
      ...(types.length > 0 && { type: { in: types } }),
      ...(direction === "increase" && { amount: { gt: 0 } }),
      ...(direction === "decrease" && { amount: { lt: 0 } }),
      ...(periodStart && { createdAt: { gte: periodStart } }),
    };

    const [total, entries] = await Promise.all([
      prisma.scoreLedger.count({ where }),
      prisma.scoreLedger.findMany({
        where,
        include: {
          user: { select: { id: true, nickname: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      entries: entries.map((e) => ({
        ...e,
        balanceBefore: e.balanceAfter - e.amount,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
