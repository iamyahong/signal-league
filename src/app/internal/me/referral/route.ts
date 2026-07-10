import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const userId = session.user.id;

  const [user, referrals, bonusEvents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, referralBonusGrantedAt: true },
    }),
    prisma.referral.findMany({
      where: { fromUserId: userId, deletedAt: null },
      include: {
        toUser: {
          select: {
            id: true,
            nickname: true,
            firstParticipationAt: true,
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referralEvent.findMany({
      where: { referrerUserId: userId, eventType: "BONUS_GRANTED" },
    }),
  ]);

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const totalBonus = bonusEvents.reduce((sum, e) => sum + (e.bonusAmount ?? 0), 0);

  return NextResponse.json({
    referralCode: user.referralCode,
    totalReferrals: referrals.length,
    totalBonusEarned: totalBonus,
    referrals: referrals.map((r) => ({
      id: r.id,
      nickname: r.toUser.nickname,
      joinedAt: r.toUser.createdAt,
      firstParticipatedAt: r.toUser.firstParticipationAt,
      bonusGiven: r.bonusGiven,
      bonusAmount: r.bonusAmount,
    })),
  });
}
