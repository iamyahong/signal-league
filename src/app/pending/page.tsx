import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { PendingHeader } from "@/components/layout/PendingHeader";
import { PendingClient } from "./PendingClient";
import { Suspense } from "react";

export default async function PendingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status !== "PENDING_BETA") {
    if (session.user.status === "SUSPENDED") redirect("/suspended");
    redirect("/home");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      profile: true,
      subscription: { include: { plan: true } },
      accounts: { select: { provider: true } },
    },
  });

  if (!user) redirect("/login");

  const plans = await prisma.plan.findMany({ where: { isActive: true }, orderBy: { priceKrw: "asc" } });

  const isEmailVerified = !!user.emailVerifiedAt;
  const isGoogleUser = user.accounts.some((a) => a.provider === "google");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface-muted)]">
      <PendingHeader />
      <main className="flex-1 flex items-start justify-center p-4 pt-8">
        <Suspense>
          <PendingClient
            user={{
              id: user.id,
              email: user.email,
              nickname: user.nickname ?? "",
              desiredPlanCode: user.desiredPlanCode,
              createdAt: user.createdAt,
              profile: user.profile,
              subscription: user.subscription,
            }}
            plans={plans}
            isEmailVerified={isEmailVerified}
            isGoogleUser={isGoogleUser}
          />
        </Suspense>
      </main>
    </div>
  );
}
