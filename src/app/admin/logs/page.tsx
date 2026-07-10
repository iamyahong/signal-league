import prisma from "@/lib/prisma";
import { AdminLogsClient } from "./_components/AdminLogsClient";

export const dynamic = "force-dynamic";

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const limit = 50;
  const skip = (page - 1) * limit;

  const action = sp.action || undefined;
  const actorId = sp.actorId || undefined;
  const targetType = sp.targetType || undefined;
  const dateFrom = sp.dateFrom || undefined;
  const dateTo = sp.dateTo || undefined;
  const ipAddress = sp.ipAddress || undefined;

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

  const serializedLogs = logs.map((l) => ({
    id: l.id,
    action: l.action,
    targetType: l.targetType,
    targetId: l.targetId,
    before: l.before,
    after: l.after,
    ipAddress: l.ipAddress,
    userAgent: l.userAgent,
    createdAt: l.createdAt.toISOString(),
    actor: l.actor
      ? { id: l.actor.id, nickname: l.actor.nickname, email: l.actor.email }
      : null,
  }));

  return (
    <AdminLogsClient
      logs={serializedLogs}
      pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
      kpi={{
        todayCount,
        weekCount,
        topActions: topActions.map((a) => ({ action: a.action, count: a._count.action })),
      }}
      filters={{ action, actorId, targetType, dateFrom, dateTo, ipAddress }}
    />
  );
}
