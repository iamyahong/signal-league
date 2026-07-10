import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }

  const { searchParams } = req.nextUrl;

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 50;
  const skip = (page - 1) * limit;

  const type = searchParams.get("type") || undefined;
  const status = searchParams.get("status") || undefined;
  const toEmail = searchParams.get("toEmail") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

  const allowedSorts = ["createdAt", "type", "status", "sentAt"];
  const orderField = allowedSorts.includes(sortBy) ? sortBy : "createdAt";

  const where: import("@prisma/client").Prisma.EmailLogWhereInput = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(toEmail ? { toEmail: { contains: toEmail, mode: "insensitive" } } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
          },
        }
      : {}),
  };

  try {
    const [logs, total, statsAll] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { [orderField]: sortOrder },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          toEmail: true,
          userId: true,
          subject: true,
          status: true,
          resendId: true,
          errorMsg: true,
          meta: true,
          sentAt: true,
          deliveredAt: true,
          bouncedAt: true,
          complainedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.emailLog.count({ where }),
      prisma.emailLog.groupBy({
        by: ["status"],
        where,
        _count: { status: true },
      }),
    ]);

    const statMap = Object.fromEntries(statsAll.map((s) => [s.status, s._count.status]));
    const totalAll = Object.values(statMap).reduce((a, b) => a + b, 0);
    const delivered = statMap["DELIVERED"] ?? 0;
    const bounced = statMap["BOUNCED"] ?? 0;
    const complained = statMap["COMPLAINED"] ?? 0;

    return NextResponse.json({
      logs: logs.map((l) => ({
        ...l,
        sentAt: l.sentAt?.toISOString() ?? null,
        deliveredAt: l.deliveredAt?.toISOString() ?? null,
        bouncedAt: l.bouncedAt?.toISOString() ?? null,
        complainedAt: l.complainedAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats: {
        total: totalAll,
        delivered,
        bounced,
        complained,
        deliveryRate: totalAll > 0 ? (delivered / totalAll) * 100 : 0,
        bounceRate: totalAll > 0 ? (bounced / totalAll) * 100 : 0,
        complaintRate: totalAll > 0 ? (complained / totalAll) * 100 : 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "발송 내역을 불러오지 못했습니다." }, { status: 500 });
  }
}
