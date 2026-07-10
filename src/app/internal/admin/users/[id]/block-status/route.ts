import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = (session.user.roles as string[]) || [];
  if (!roles.includes("SUPER_ADMIN") && !roles.includes("OPERATOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      nickname: true,
      emailBlocked: true,
      emailBlockedAt: true,
      emailBlockedReason: true,
      softBounceCount: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    emailBlocked: user.emailBlocked,
    emailBlockedAt: user.emailBlockedAt?.toISOString() ?? null,
    emailBlockedReason: user.emailBlockedReason,
    softBounceCount: user.softBounceCount,
  });
}
