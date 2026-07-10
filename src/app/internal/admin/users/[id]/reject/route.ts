import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";
import { UserStatus } from "@prisma/client";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = await params;
  try {
    const session = await requireAdmin();
    const adminId = session.user.id;
    const body = await req.json();
    const { action, reason, userVisibleMessage } = body as {
      action: "hold" | "reject";
      reason: string;
      userVisibleMessage?: string;
    };

    if (!reason?.trim()) {
      return NextResponse.json({ error: "사유를 입력해 주세요." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
    if (targetUser.status !== UserStatus.PENDING_BETA) {
      return NextResponse.json({ error: "베타 승인 대기 상태의 회원만 처리할 수 있습니다." }, { status: 400 });
    }

    const newStatus = action === "reject" ? UserStatus.SUSPENDED : UserStatus.PENDING_BETA;
    const auditAction = action === "reject" ? "BETA_REJECT" : "BETA_HOLD";

    await prisma.$transaction(async (tx) => {
      if (action === "reject") {
        await tx.user.update({
          where: { id: userId },
          data: { status: newStatus, suspensionReason: reason },
        });
      }

      await tx.notification.create({
        data: {
          userId,
          type: action === "reject" ? "BETA_REJECTED" : "BETA_HELD",
          title: action === "reject" ? "베타 신청 거절" : "베타 신청 검토 중",
          body: userVisibleMessage ?? (action === "reject"
            ? "베타 신청이 거절되었습니다. 자세한 내용은 운영자에게 문의해 주세요."
            : "베타 신청이 검토 중입니다. 승인 완료 시 별도 안내 드립니다."),
        },
      });

      await createAuditLog({
        actorId: adminId,
        action: auditAction,
        targetType: "USER",
        targetId: userId,
        before: { status: targetUser.status },
        after: { status: newStatus, reason },
      }, tx);
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    const msg = e instanceof Error ? e.message : "서버 오류";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
