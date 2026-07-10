import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { UserStatus } from "@prisma/client";
import { PLAN_LABELS } from "@/lib/constants/scoreLedger";
import { BetaPendingClient } from "./_components/BetaPendingClient";

async function getPendingUsers() {
  return prisma.user.findMany({
    where: { status: UserStatus.PENDING_BETA, deletedAt: null },
    include: {
      profile: { select: { favoriteCategories: true, joinPurpose: true } },
      subscription: { include: { plan: { select: { code: true } } } },
      referredBy: { select: { nickname: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export default async function BetaPendingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const users = await getPendingUsers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">베타 승인 대기</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {users.length === 0 ? "대기 중인 신청이 없습니다." : `${users.length}건 대기 중 — 오래된 순으로 표시됩니다.`}
        </p>
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] py-16 text-center">
          <p className="text-sm text-[var(--color-text-tertiary)]">모든 베타 신청이 처리되었습니다.</p>
        </div>
      ) : (
        <BetaPendingClient
          users={users.map((u) => ({
            id: u.id,
            email: u.email,
            nickname: u.nickname,
            createdAt: u.createdAt.toISOString(),
            desiredPlanCode: u.desiredPlanCode,
            categories: u.profile?.favoriteCategories ?? [],
            joinPurpose: u.profile?.joinPurpose ?? null,
            referredBy: u.referredBy?.nickname ?? null,
          }))}
        />
      )}
    </div>
  );
}
