import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const userId = session.user.id;

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        lastNicknameChangedAt: true,
        createdAt: true,
        passwordHash: true,
        desiredPlanCode: true,
      },
    }),
    prisma.userProfile.findUnique({
      where: { userId },
      select: {
        bio: true,
        avatarUrl: true,
        favoriteCategories: true,
        joinPurpose: true,
        notificationPreferences: true,
      },
    }),
  ]);

  if (!user)
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  return NextResponse.json({
    email: user.email,
    nickname: user.nickname,
    hasPassword: !!user.passwordHash,
    lastNicknameChangedAt: user.lastNicknameChangedAt?.toISOString() ?? null,
    desiredPlanCode: user.desiredPlanCode,
    createdAt: user.createdAt.toISOString(),
    bio: profile?.bio ?? null,
    avatarUrl: profile?.avatarUrl ?? null,
    favoriteCategories: profile?.favoriteCategories ?? [],
    joinPurpose: profile?.joinPurpose ?? null,
    notificationPreferences: (profile?.notificationPreferences as Record<string, { inApp: boolean; email: boolean }>) ?? null,
  });
}
