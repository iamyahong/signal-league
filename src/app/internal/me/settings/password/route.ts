import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "비밀번호는 영문+숫자 포함 8자 이상이어야 합니다." },
      { status: 400 }
    );

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  if (!user?.passwordHash)
    return NextResponse.json(
      { error: "소셜 로그인 계정은 비밀번호를 변경할 수 없습니다." },
      { status: 400 }
    );

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid)
    return NextResponse.json(
      { error: "현재 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  });

  return NextResponse.json({ success: true });
}
