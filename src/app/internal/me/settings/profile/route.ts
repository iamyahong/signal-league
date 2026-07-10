import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const FORBIDDEN_PATTERN = /(?:관리자|운영자|admin|administrator|operator|system)/i;

const schema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, "닉네임을 입력해 주세요.")
    .min(2, "닉네임은 2자 이상이어야 합니다.")
    .max(20, "닉네임은 20자 이하여야 합니다.")
    .regex(/^[a-zA-Z0-9가-힣_]+$/, "닉네임에 허용되지 않는 문자가 포함되어 있습니다.")
    .refine((v) => !FORBIDDEN_PATTERN.test(v), "사용할 수 없는 표현이 포함되어 있습니다.")
    .optional(),
  bio: z.string().max(300).optional(),
  favoriteCategories: z.array(z.string()).max(6).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "잘못된 요청입니다.", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );

  const userId = session.user.id;
  const { nickname, bio, favoriteCategories } = parsed.data;

  if (nickname !== undefined && nickname !== session.user.nickname) {
    const existing = await prisma.user.findUnique({ where: { nickname } });
    if (existing && existing.id !== userId)
      return NextResponse.json({ error: "이미 사용 중인 닉네임입니다." }, { status: 409 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastNicknameChangedAt: true },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (user?.lastNicknameChangedAt && user.lastNicknameChangedAt > thirtyDaysAgo) {
      return NextResponse.json(
        { error: "닉네임은 30일에 한 번만 변경할 수 있습니다." },
        { status: 429 }
      );
    }

    await prisma.user.update({
      where: { id: userId },
      data: { nickname, lastNicknameChangedAt: new Date() },
    });
  }

  const profileData: Record<string, unknown> = {};
  if (bio !== undefined) profileData.bio = bio;
  if (favoriteCategories !== undefined)
    profileData.favoriteCategories = favoriteCategories;

  if (Object.keys(profileData).length > 0) {
    await prisma.userProfile.update({ where: { userId }, data: profileData });
  }

  return NextResponse.json({ success: true });
}
