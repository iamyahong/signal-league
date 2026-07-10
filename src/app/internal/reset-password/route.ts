import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1, "토큰이 없습니다"),
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .max(100, "비밀번호가 너무 깁니다"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, password } = schema.parse(body);

    const record = await prisma.passwordReset.findUnique({ where: { token } });

    if (!record) {
      return NextResponse.json({ error: "유효하지 않은 재설정 링크입니다." }, { status: 400 });
    }
    if (record.usedAt) {
      return NextResponse.json({ error: "이미 사용된 링크입니다." }, { status: 400 });
    }
    if (record.expiresAt < new Date()) {
      return NextResponse.json({ error: "만료된 링크입니다. 비밀번호 찾기를 다시 시도해 주세요." }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.passwordReset.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0].message }, { status: 400 });
    }
    const msg = e instanceof Error ? e.message : "서버 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
