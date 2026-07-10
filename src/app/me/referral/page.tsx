import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { ReferralDashboard } from "./_components/ReferralDashboard";

export const dynamic = "force-dynamic";

export default async function ReferralPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [user, referrals, bonusEvents] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, nickname: true, referralBonusGrantedAt: true },
    }),
    prisma.referral.findMany({
      where: { fromUserId: userId, deletedAt: null },
      include: {
        toUser: {
          select: {
            nickname: true,
            createdAt: true,
            firstParticipationAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.referralEvent.findMany({
      where: { referrerUserId: userId, eventType: "BONUS_GRANTED" },
    }),
  ]);

  if (!user) redirect("/login");

  const totalBonus = bonusEvents.reduce((sum, e) => sum + (e.bonusAmount ?? 0), 0);

  return (
    <ReferralDashboard
      referralCode={user.referralCode}
      userId={userId}
      totalReferrals={referrals.length}
      totalBonusEarned={totalBonus}
      referrals={referrals.map((r) => ({
        nickname: r.toUser.nickname,
        joinedAt: r.toUser.createdAt.toISOString(),
        firstParticipatedAt: r.toUser.firstParticipationAt?.toISOString() ?? null,
        bonusGiven: r.bonusGiven,
        bonusAmount: r.bonusAmount,
      }))}
    />
  );
}
