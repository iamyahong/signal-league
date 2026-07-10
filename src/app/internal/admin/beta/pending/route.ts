import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import { UserStatus } from "@prisma/client";

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      where: { status: UserStatus.PENDING_BETA, deletedAt: null },
      include: {
        profile: { select: { favoriteCategories: true, joinPurpose: true } },
        subscription: { include: { plan: true } },
        referredBy: { select: { nickname: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ users });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
