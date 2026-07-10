import { Prisma, ScoreLedgerType } from "@prisma/client";
import { applyScoreChange } from "@/lib/score/applyScoreChange";

const REFERRAL_BONUS_AMOUNT = 500;

export async function grantReferralBonus({
  userId,
  tx,
}: {
  userId: string;
  tx: Prisma.TransactionClient;
}): Promise<void> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      firstParticipationAt: true,
      referralBonusGrantedAt: true,
      referredByUserId: true,
      status: true,
    },
  });

  if (!user) return;
  if (user.firstParticipationAt) return;

  const now = new Date();

  await tx.user.update({
    where: { id: userId },
    data: { firstParticipationAt: now },
  });

  if (!user.referredByUserId) return;
  if (user.referralBonusGrantedAt) return;

  const referrer = await tx.user.findUnique({
    where: { id: user.referredByUserId },
    select: { id: true, nickname: true, status: true },
  });

  if (!referrer || referrer.status === "SUSPENDED" || referrer.status === "DELETED") return;

  await applyScoreChange({
    userId,
    type: ScoreLedgerType.REFERRAL_BONUS,
    amount: REFERRAL_BONUS_AMOUNT,
    description: `추천 보너스 — ${referrer.nickname}님의 추천으로 첫 참여`,
    isSystemGenerated: true,
    tx,
  });

  await applyScoreChange({
    userId: referrer.id,
    type: ScoreLedgerType.REFERRAL_BONUS,
    amount: REFERRAL_BONUS_AMOUNT,
    description: `추천 보너스 — ${user.nickname}님이 첫 참여`,
    isSystemGenerated: true,
    tx,
  });

  await tx.user.update({
    where: { id: userId },
    data: { referralBonusGrantedAt: now },
  });

  const referral = await tx.referral.findFirst({
    where: { fromUserId: referrer.id, toUserId: userId },
  });

  if (referral) {
    await tx.referral.update({
      where: { id: referral.id },
      data: { bonusGiven: true, bonusAmount: REFERRAL_BONUS_AMOUNT },
    });
  }

  await tx.referralEvent.createMany({
    data: [
      {
        referrerUserId: referrer.id,
        referredUserId: userId,
        eventType: "FIRST_PARTICIPATION",
      },
      {
        referrerUserId: referrer.id,
        referredUserId: userId,
        eventType: "BONUS_GRANTED",
        bonusAmount: REFERRAL_BONUS_AMOUNT,
      },
    ],
  });

  await tx.notification.createMany({
    data: [
      {
        userId,
        type: "REFERRAL_BONUS",
        title: "추천 보너스 지급",
        body: `${referrer.nickname}님의 추천으로 ${REFERRAL_BONUS_AMOUNT}점이 지급되었습니다.`,
      },
      {
        userId: referrer.id,
        type: "REFERRAL_BONUS",
        title: "추천 보너스 지급",
        body: `${user.nickname}님이 첫 참여를 완료해 ${REFERRAL_BONUS_AMOUNT}점이 지급되었습니다.`,
      },
    ],
  });
}
