import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const userId = session.user.id;

  const [profile, recentLedgers, unreadCount, recentNotifications] =
    await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId },
        select: {
          availableScore: true,
          totalScore: true,
          totalPredictions: true,
          correctPredictions: true,
          bio: true,
          favoriteCategories: true,
        },
      }),
      prisma.scoreLedger.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          amount: true,
          balanceAfter: true,
          description: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { userId, isRead: false, deletedAt: null },
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
    ]);

  return NextResponse.json({
    profile: {
      availableScore: profile?.availableScore ?? 0,
      totalScore: profile?.totalScore ?? 0,
      totalPredictions: profile?.totalPredictions ?? 0,
      correctPredictions: profile?.correctPredictions ?? 0,
      bio: profile?.bio ?? null,
      favoriteCategories: profile?.favoriteCategories ?? [],
    },
    recentLedgers: recentLedgers.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    unreadNotifications: unreadCount,
    recentNotifications: recentNotifications.map((n) => ({
      ...n,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}
