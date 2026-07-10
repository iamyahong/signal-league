import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { passwordResetTemplate } from "@/lib/emailTemplates";
import { z } from "zod";
import crypto from "crypto";

const schema = z.object({
  email: z.string().email("올바른 이메일 형식을 입력해 주세요"),
});

const SUCCESS_MSG = "해당 이메일로 가입된 계정이 있다면 재설정 링크를 발송했습니다.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, nickname: true, passwordHash: true },
    });

    // 계정 존재 여부 노출 방지: 항상 동일 응답
    if (!user || !user.passwordHash) {
      return NextResponse.json({ message: SUCCESS_MSG });
    }

    // 기존 미사용 토큰 무효화
    await prisma.passwordReset.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1시간

    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt },
    });

    const tmpl = passwordResetTemplate({ nickname: user.nickname ?? "회원", token });
    await sendEmail({ to: email, ...tmpl, type: "PASSWORD_RESET", userId: user.id });

    return NextResponse.json({ message: SUCCESS_MSG });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ message: SUCCESS_MSG });
  }
}
