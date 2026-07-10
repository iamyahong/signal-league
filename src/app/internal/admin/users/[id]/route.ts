import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  try {
    await requireAdmin();

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        roles: true,
        subscription: { include: { plan: true } },
        scoreLedgers: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 20,
        },
        auditLogs: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { actor: { select: { nickname: true, email: true } } },
        },
        referredBy: { select: { nickname: true, email: true } },
      },
    });

    if (!user) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });

    return NextResponse.json({ user });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
