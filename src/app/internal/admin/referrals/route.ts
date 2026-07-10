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

  const [referrals, total, bonusGranted] = await Promise.all([
    prisma.referral.findMany({
      where: { deletedAt: null },
      include: {
        fromUser: { select: { id: true, nickname: true, email: true } },
        toUser: {
          select: {
            id: true,
            nickname: true,
            email: true,
            createdAt: true,
            firstParticipationAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.referral.count({ where: { deletedAt: null } }),
    prisma.referral.count({ where: { bonusGiven: true, deletedAt: null } }),
  ]);

  const conversionRate = total > 0 ? Math.round((bonusGranted / total) * 100) : 0;

  return NextResponse.json({
    referrals,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    stats: { total, bonusGranted, conversionRate },
  });
}
