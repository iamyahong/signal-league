import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ReportStatus, ReportTargetType, Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = 30;
  const statusFilter = searchParams.get("status") ?? "";
  const targetTypeFilter = searchParams.get("targetType") ?? "";
  const q = searchParams.get("q") ?? "";

  const validStatuses = Object.values(ReportStatus);
  const validTargetTypes = Object.values(ReportTargetType);

  const where: Prisma.ReportWhereInput = {
    deletedAt: null,
    ...(statusFilter && validStatuses.includes(statusFilter as ReportStatus)
      ? { status: statusFilter as ReportStatus }
      : {}),
    ...(targetTypeFilter &&
    validTargetTypes.includes(targetTypeFilter as ReportTargetType)
      ? { targetType: targetTypeFilter as ReportTargetType }
      : {}),
    ...(q ? { reason: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.report.count({ where }),
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        reporter: { select: { id: true, nickname: true, email: true } },
      },
    }),
  ]);

  return NextResponse.json({
    items: items.map((r) => ({
      id: r.id,
      targetType: r.targetType,
      targetId: r.targetId,
      reason: r.reason,
      status: r.status,
      reviewedBy: r.reviewedBy,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      processedAt: r.processedAt?.toISOString() ?? null,
      processingResolution: r.processingResolution,
      createdAt: r.createdAt.toISOString(),
      reporter: r.reporter,
    })),
    total,
    page,
    totalPages: Math.ceil(total / pageSize),
  });
}
