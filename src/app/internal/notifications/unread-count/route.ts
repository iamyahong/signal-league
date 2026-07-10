import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const count = await prisma.notification.count({
    where: { userId: session.user.id, isRead: false, deletedAt: null },
  });

  return NextResponse.json({ count });
}
