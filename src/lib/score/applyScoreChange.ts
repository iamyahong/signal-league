import prisma from "@/lib/prisma";
import { ScoreLedgerType, Prisma } from "@prisma/client";

interface ApplyScoreChangeParams {
  userId: string;
  type: ScoreLedgerType;
  amount: number;
  description: string;
  referenceId?: string;
  referenceType?: string;
  createdByUserId?: string;
  isSystemGenerated: boolean;
  tx?: Prisma.TransactionClient;
}

interface ApplyScoreChangeResult {
  ledgerId: string;
  balanceBefore: number;
  balanceAfter: number;
}

async function _applyScoreChange(
  params: ApplyScoreChangeParams,
  client: Prisma.TransactionClient | typeof prisma
): Promise<ApplyScoreChangeResult> {
  const profile = await (client as Prisma.TransactionClient).userProfile.findUniqueOrThrow({
    where: { userId: params.userId },
    select: { availableScore: true, totalScore: true },
  });

  const balanceBefore = profile.availableScore;
  const balanceAfter = balanceBefore + params.amount;

  if (balanceAfter < 0) {
    throw new Error(
      `잔액이 부족합니다. 현재 보유 점수: ${balanceBefore.toLocaleString()}점, 차감 요청: ${Math.abs(params.amount).toLocaleString()}점`
    );
  }

  const ledger = await (client as Prisma.TransactionClient).scoreLedger.create({
    data: {
      userId: params.userId,
      type: params.type,
      amount: params.amount,
      balanceAfter,
      description: params.description,
      referenceId: params.referenceId,
      referenceType: params.referenceType,
    },
  });

  const profileUpdate: Prisma.UserProfileUpdateInput = {
    availableScore: balanceAfter,
  };
  if (params.amount > 0) {
    profileUpdate.totalScore = { increment: params.amount };
  }

  await (client as Prisma.TransactionClient).userProfile.update({
    where: { userId: params.userId },
    data: profileUpdate,
  });

  return { ledgerId: ledger.id, balanceBefore, balanceAfter };
}

export async function applyScoreChange(
  params: ApplyScoreChangeParams
): Promise<ApplyScoreChangeResult> {
  if (params.tx) {
    return _applyScoreChange(params, params.tx);
  }

  return prisma.$transaction(async (tx) => {
    return _applyScoreChange(params, tx);
  });
}
