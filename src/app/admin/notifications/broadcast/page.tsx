import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { UserStatus } from "@prisma/client";
import { BroadcastForm } from "./_components/BroadcastForm";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const roles = (session.user.roles as string[]) || [];
  if (!roles.includes("SUPER_ADMIN") && !roles.includes("OPERATOR")) redirect("/home");

  const [activeCount, plans] = await Promise.all([
    prisma.user.count({ where: { status: UserStatus.BETA_ACTIVE, deletedAt: null } }),
    prisma.plan.findMany({ select: { code: true, name: true }, orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">공지 발송</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          현재 활성 회원 {activeCount.toLocaleString()}명에게 인앱 알림 또는 이메일을 발송합니다.
        </p>
      </div>
      <BroadcastForm plans={plans} />
    </div>
  );
}
