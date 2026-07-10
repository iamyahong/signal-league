import { auth } from "@/lib/auth";
import { DEFAULT_PREFERENCES, isNewStructure } from "@/lib/notificationPreferences";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const channelSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
});

const preferencesSchema = z.object({
  questionApproved: channelSchema,
  questionRejected: channelSchema,
  resultConfirmed: channelSchema,
  betaApproved: channelSchema,
  questionVoided: channelSchema,
});

const requestSchema = z.object({
  notificationPreferences: preferencesSchema,
});

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { notificationPreferences: true },
  });

  const raw = profile?.notificationPreferences as Record<string, unknown> | null;

  return NextResponse.json({
    notificationPreferences: isNewStructure(raw) ? raw : DEFAULT_PREFERENCES,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const prefs = parsed.data.notificationPreferences;

  if (
    !prefs.betaApproved.inApp ||
    !prefs.betaApproved.email ||
    !prefs.questionVoided.email
  ) {
    return NextResponse.json(
      { error: "INVALID_PREFERENCES", message: "운영상 필수 알림은 끌 수 없습니다." },
      { status: 400 }
    );
  }

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: { notificationPreferences: prefs },
  });

  return NextResponse.json({ success: true });
}
