import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { EmailStatsClient } from "./_components/EmailStatsClient";

export const dynamic = "force-dynamic";

const DEFAULT_DAYS = 7;

export default async function AdminEmailStatsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const roles = (session.user.roles as string[]) || [];
  if (!roles.includes("SUPER_ADMIN") && !roles.includes("OPERATOR")) redirect("/login");

  const sp = await searchParams;
  const days = parseInt(sp.days ?? String(DEFAULT_DAYS));
  const validDays = [7, 30, 90].includes(days) ? days : DEFAULT_DAYS;
  const dateFrom = sp.dateFrom
    ? new Date(sp.dateFrom)
    : new Date(Date.now() - validDays * 86400000);
  const dateTo = sp.dateTo ? new Date(sp.dateTo + "T23:59:59.999Z") : new Date();

  const where = { createdAt: { gte: dateFrom, lte: dateTo } };

  const [statsByStatus, statsByType, dailyRaw, blockedUserCount] = await Promise.all([
    prisma.emailLog.groupBy({ by: ["status"], where, _count: { status: true } }),
    prisma.emailLog.groupBy({ by: ["type", "status"], where, _count: { _all: true } }),
    prisma.$queryRaw<{ date: string; status: string; count: bigint }[]>`
      SELECT
        TO_CHAR(DATE_TRUNC('day', "createdAt"), 'YYYY-MM-DD') AS date,
        status,
        COUNT(*) AS count
      FROM email_logs
      WHERE "createdAt" >= ${dateFrom} AND "createdAt" <= ${dateTo}
      GROUP BY DATE_TRUNC('day', "createdAt"), status
      ORDER BY DATE_TRUNC('day', "createdAt") ASC
    `,
    prisma.user.count({ where: { emailBlocked: true } }),
  ]);

  const blockReasonRaw = await prisma.user.groupBy({
    by: ["emailBlockedReason"],
    where: { emailBlocked: true },
    _count: { emailBlockedReason: true },
  });

  const statMap = Object.fromEntries(statsByStatus.map((s) => [s.status, s._count.status]));
  const total = Object.values(statMap).reduce((a, b) => a + b, 0);
  const delivered = statMap["DELIVERED"] ?? 0;
  const bounced = statMap["BOUNCED"] ?? 0;
  const complained = statMap["COMPLAINED"] ?? 0;

  const typeMap: Record<string, Record<string, number>> = {};
  for (const row of statsByType) {
    if (!typeMap[row.type]) typeMap[row.type] = {};
    typeMap[row.type][row.status] = row._count._all;
  }
  const typeData = Object.entries(typeMap).map(([type, statusCounts]) => ({
    type,
    ...statusCounts,
    total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
  }));

  const dailyMap: Record<string, Record<string, number>> = {};
  for (const row of dailyRaw) {
    if (!dailyMap[row.date]) dailyMap[row.date] = {};
    dailyMap[row.date][row.status] = Number(row.count);
  }
  const dailyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  const blockReasonData = blockReasonRaw.map((r) => ({
    reason: r.emailBlockedReason ?? "UNKNOWN",
    count: r._count.emailBlockedReason,
  }));

  return (
    <EmailStatsClient
      summary={{
        total,
        delivered,
        bounced,
        complained,
        blocked: statMap["BLOCKED"] ?? 0,
        failed: statMap["FAILED"] ?? 0,
        deliveryRate: total > 0 ? (delivered / total) * 100 : 0,
        bounceRate: total > 0 ? (bounced / total) * 100 : 0,
        complaintRate: total > 0 ? (complained / total) * 100 : 0,
        blockedUserCount,
      }}
      dailyData={dailyData}
      typeData={typeData}
      blockReasonData={blockReasonData}
      filters={{
        days: validDays,
        dateFrom: sp.dateFrom ?? "",
        dateTo: sp.dateTo ?? "",
      }}
    />
  );
}
