import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { verifyEmailTemplate } from "@/lib/emailTemplates";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  newEmail: z.string().email("올바른 이메일 형식을 입력해 주세요"),
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const body = await req.json();
    const { newEmail, password } = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, nickname: true, passwordHash: true },
    });
    if (!user) return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

    if (!user.passwordHash) {
      return NextResponse.json({ error: "Google 계정은 이메일을 변경할 수 없습니다." }, { status: 400 });
    }

    const bcrypt = (await import("bcryptjs")).default;
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 400 });

    if (newEmail === user.email) {
      return NextResponse.json({ error: "현재 이메일과 동일합니다." }, { status: 400 });
    }

    const taken = await prisma.user.findUnique({ where: { email: newEmail } });
    if (taken) return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 400 });

    // 기존 미사용 인증 토큰 무효화
    await prisma.emailVerification.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 새 이메일로 인증 토큰 생성 (이메일 변경 확인 전까지 기존 이메일 유지)
    await prisma.emailVerification.create({
      data: { userId: user.id, email: newEmail, token, expiresAt },
    });

    const tmpl = verifyEmailTemplate({ nickname: user.nickname ?? "회원", token });
    await sendEmail({ to: newEmail, ...tmpl, type: "VERIFY_EMAIL", userId: user.id });

    return NextResponse.json({ message: "새 이메일 주소로 인증 링크를 발송했습니다. 인증 완료 후 이메일이 변경됩니다." });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "서버 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
