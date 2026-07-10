import prisma from "@/lib/prisma";
import { EmailLogsClient } from "./_components/EmailLogsClient";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 7;

export default async function AdminEmailLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;

  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const limit = 50;
  const skip = (page - 1) * limit;

  const type = sp.type || undefined;
  const status = sp.status || undefined;
  const toEmail = sp.toEmail || undefined;
  const sortBy = ["createdAt", "type", "status", "sentAt"].includes(sp.sortBy ?? "")
    ? sp.sortBy
    : "createdAt";
  const sortOrder = sp.sortOrder === "asc" ? ("asc" as const) : ("desc" as const);

  const defaultFrom = new Date(Date.now() - DEFAULT_DAYS * 86400000)
    .toISOString()
    .slice(0, 10);
  const dateFrom = sp.dateFrom || defaultFrom;
  const dateTo = sp.dateTo || undefined;

  const where: import("@prisma/client").Prisma.EmailLogWhereInput = {
    ...(type ? { type } : {}),
    ...(status ? { status } : {}),
    ...(toEmail ? { toEmail: { contains: toEmail, mode: "insensitive" } } : {}),
    createdAt: {
      gte: new Date(dateFrom),
      ...(dateTo ? { lte: new Date(dateTo + "T23:59:59.999Z") } : {}),
    },
  };

  const [logs, total, statsAll] = await Promise.all([
    prisma.emailLog.findMany({
      where,
      orderBy: { [sortBy ?? "createdAt"]: sortOrder },
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

  const serialized = logs.map((l) => ({
    ...l,
    meta: l.meta as Record<string, unknown> | null,
    sentAt: l.sentAt?.toISOString() ?? null,
    deliveredAt: l.deliveredAt?.toISOString() ?? null,
    bouncedAt: l.bouncedAt?.toISOString() ?? null,
    complainedAt: l.complainedAt?.toISOString() ?? null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  }));

  return (
    <EmailLogsClient
      logs={serialized}
      pagination={{ page, limit, total, totalPages: Math.ceil(total / limit) }}
      stats={{
        total: totalAll,
        delivered,
        bounced,
        complained,
        deliveryRate: totalAll > 0 ? (delivered / totalAll) * 100 : 0,
        bounceRate: totalAll > 0 ? (bounced / totalAll) * 100 : 0,
        complaintRate: totalAll > 0 ? (complained / totalAll) * 100 : 0,
      }}
      filters={{ type, status, toEmail, dateFrom, dateTo, sortBy, sortOrder }}
    />
  );
}
