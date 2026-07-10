import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  if (!code || code.length < 4) {
    return NextResponse.json({ error: "유효하지 않은 코드입니다." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { referralCode: code.toUpperCase(), deletedAt: null },
    select: { id: true, nickname: true },
  });

  if (!user) {
    return NextResponse.json({ error: "추천인을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ id: user.id, nickname: user.nickname });
}
