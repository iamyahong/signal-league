import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user)
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId: session.user.id, deletedAt: null },
  });

  if (!notification)
    return NextResponse.json({ error: "알림을 찾을 수 없습니다." }, { status: 404 });

  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  return NextResponse.json({ success: true });
}
