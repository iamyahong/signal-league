import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AppHeaderClient } from "./AppHeaderClient";
import { UserStatus } from "@prisma/client";

export async function AppHeader() {
  const session = await auth();
  if (!session?.user) return null;

  const userId = session.user.id;

  const [profile, notifications, unreadCount] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userId },
      select: { availableScore: true },
    }),
    prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId, isRead: false, deletedAt: null },
    }),
  ]);

  const roles = (session.user.roles as string[]) || [];
  const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR");
  const isBetaActive =
    session.user.status === UserStatus.BETA_ACTIVE ||
    session.user.status === UserStatus.ACTIVE;

  return (
    <AppHeaderClient
      nickname={session.user.nickname}
      score={profile?.availableScore ?? 0}
      isAdmin={isAdmin}
      isBetaActive={isBetaActive}
      notifications={notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }))}
      unreadCount={unreadCount}
    />
  );
}
