import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { verifyEmailTemplate } from "@/lib/emailTemplates";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  void req;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, nickname: true, emailVerifiedAt: true },
    });

    if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    if (user.emailVerifiedAt) {
      return NextResponse.json({ error: "이미 이메일 인증이 완료되었습니다." }, { status: 400 });
    }

    // 기존 미사용 토큰 무효화
    await prisma.emailVerification.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerification.create({
      data: { userId, email: user.email, token, expiresAt },
    });

    const tmpl = verifyEmailTemplate({ nickname: user.nickname ?? "회원", token });
    await sendEmail({ to: user.email, ...tmpl, type: "VERIFY_EMAIL", userId });

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "서버 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
