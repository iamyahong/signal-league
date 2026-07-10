import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roles = (session.user.roles as string[]) || [];
  if (!roles.includes("SUPER_ADMIN") && !roles.includes("OPERATOR")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: userId } = await params;
  let reason: string | null = null;
  try {
    const body = await req.json();
    reason = typeof body.reason === "string" ? body.reason.trim() || null : null;
  } catch {
    // body 없어도 허용
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, emailBlocked: true, emailBlockedReason: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!user.emailBlocked) {
    return NextResponse.json({
      success: true,
      alreadyUnblocked: true,
      message: "이미 차단되지 않은 사용자입니다.",
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        emailBlocked: false,
        emailBlockedAt: null,
        emailBlockedReason: null,
        softBounceCount: 0,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: session.user!.id,
        action: "ADMIN_UNBLOCK_EMAIL",
        targetType: "USER",
        targetId: userId,
        after: {
          reason,
          previousBlockedReason: user.emailBlockedReason,
        },
      },
    });
  });

  return NextResponse.json({ success: true, alreadyUnblocked: false });
}
