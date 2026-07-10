import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";
import { UserStatus } from "@prisma/client";
import { sendEmailNotification } from "@/lib/emailNotification";
import { accountUnsuspendedTemplate } from "@/lib/emailTemplates";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  try {
    const session = await requireAdmin();
    const adminId = session.user.id;
    const { reason } = await req.json() as { reason: string };

    if (!reason?.trim()) {
      return NextResponse.json({ error: "정지 해제 사유를 입력해 주세요." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true, nickname: true } });
    if (!targetUser) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    if (targetUser.status !== UserStatus.SUSPENDED) {
      return NextResponse.json({ error: "정지된 회원이 아닙니다." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: UserStatus.BETA_ACTIVE, suspensionReason: null },
      });
      await tx.notification.create({
        data: {
          userId,
          type: "ACCOUNT_UNSUSPENDED",
          title: "계정 이용 제한이 해제되었습니다",
          body: "계정 이용 제한이 해제되었습니다. 다시 Signal League를 이용하실 수 있습니다.",
          data: { adminId },
        },
      });
      await createAuditLog({
        actorId: adminId,
        action: "USER_UNSUSPEND",
        targetType: "USER",
        targetId: userId,
        before: { status: UserStatus.SUSPENDED },
        after: { status: UserStatus.BETA_ACTIVE, reason },
      }, tx);
    });

    // 이메일 — 트랜잭션 commit 후, 차단 우회 (SYSTEM_EMAIL_TYPES)
    const tpl = accountUnsuspendedTemplate({ nickname: targetUser.nickname });
    await sendEmailNotification({
      userId,
      type: "ACCOUNT_UNSUSPENDED",
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
      forceEmailRegardlessOfPreference: true,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    const msg = e instanceof Error ? e.message : "서버 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
