import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { AppHeader } from "@/components/layout/AppHeader";
import { SettingsClient } from "./_components/SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status === "PENDING_BETA") redirect("/pending");
  if (session.user.status === "SUSPENDED") redirect("/suspended");

  const userId = session.user.id;

  const [user, profile, categories] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        nickname: true,
        lastNicknameChangedAt: true,
        passwordHash: true,
        desiredPlanCode: true,
        createdAt: true,
      },
    }),
    prisma.userProfile.findUnique({
      where: { userId },
      select: {
        bio: true,
        favoriteCategories: true,
        notificationPreferences: true,
      },
    }),
    prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <>
      <AppHeader />
      <main>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-[var(--color-text-primary)]">설정</h1>
              <p className="text-sm text-[var(--color-text-secondary)]">계정 및 알림 설정을 관리합니다.</p>
            </div>

            <SettingsClient
              email={user.email}
              nickname={user.nickname}
              hasPassword={!!user.passwordHash}
              lastNicknameChangedAt={user.lastNicknameChangedAt?.toISOString() ?? null}
              desiredPlanCode={user.desiredPlanCode}
              createdAt={user.createdAt.toISOString()}
              bio={profile?.bio ?? null}
              favoriteCategories={profile?.favoriteCategories ?? []}
              notificationPreferences={(profile?.notificationPreferences as Record<string, { inApp: boolean; email: boolean }>) ?? null}
              allCategories={categories}
            />
          </div>
        </div>
      </main>
    </>
  );
}
