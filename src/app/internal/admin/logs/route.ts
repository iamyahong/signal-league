import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    return NextResponse.json({ error: "인증 오류" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 50;
  const skip = (page - 1) * limit;

  const action = searchParams.get("action") || undefined;
  const actorId = searchParams.get("actorId") || undefined;
  const targetType = searchParams.get("targetType") || undefined;
  const dateFrom = searchParams.get("dateFrom") || undefined;
  const dateTo = searchParams.get("dateTo") || undefined;
  const ipAddress = searchParams.get("ipAddress") || undefined;

  const where = {
    deletedAt: null,
    ...(action ? { action } : {}),
    ...(actorId ? { actorId } : {}),
    ...(targetType ? { targetType } : {}),
    ...(ipAddress ? { ipAddress: { contains: ipAddress } } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
          },
        }
      : {}),
  };

  const [logs, total, todayCount, weekCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: { select: { id: true, nickname: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.count({
      where: {
        deletedAt: null,
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.auditLog.count({
      where: {
        deletedAt: null,
        createdAt: { gte: new Date(Date.now() - 7 * 86400000) },
      },
    }),
  ]);

  const topActions = await prisma.auditLog.groupBy({
    by: ["action"],
    _count: { action: true },
    where: { deletedAt: null, createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    orderBy: { _count: { action: "desc" } },
    take: 3,
  });

  return NextResponse.json({
    logs,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    kpi: { todayCount, weekCount, topActions: topActions.map((a) => ({ action: a.action, count: a._count.action })) },
  });
}
