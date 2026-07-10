import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { UserStatus } from "@prisma/client";

const schema = z.object({
  reason: z.string().max(500).optional(),
  password: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true, status: true },
  });

  if (!user)
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });

  if (user.status === UserStatus.DELETED)
    return NextResponse.json({ error: "이미 탈퇴한 계정입니다." }, { status: 409 });

  if (user.passwordHash && parsed.data.password) {
    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid)
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 401 }
      );
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      status: UserStatus.DELETED,
      deletedAt: new Date(),
      deletionReason: parsed.data.reason ?? null,
    },
  });

  return NextResponse.json({ success: true });
}
