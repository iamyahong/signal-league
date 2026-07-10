import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, requireSuperAdmin, AdminAuthError } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";

export async function GET(_req: NextRequest) {
  try {
    await requireAdmin();
    const settings = await prisma.serviceSetting.findMany({ where: { deletedAt: null }, orderBy: { key: "asc" } });
    const admins = await prisma.userRole.findMany({
      where: { deletedAt: null },
      include: { user: { select: { id: true, email: true, nickname: true, status: true } } },
    });
    return NextResponse.json({ settings, admins });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const adminId = session.user.id;
    const { key, value, reason } = await req.json() as { key: string; value: string; reason: string };

    if (!key || value === undefined) {
      return NextResponse.json({ error: "키와 값을 입력해 주세요." }, { status: 400 });
    }
    if (!reason?.trim()) {
      return NextResponse.json({ error: "변경 사유를 입력해 주세요." }, { status: 400 });
    }

    const existing = await prisma.serviceSetting.findUnique({ where: { key } });
    if (!existing) return NextResponse.json({ error: "설정 항목을 찾을 수 없습니다." }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.serviceSetting.update({ where: { key }, data: { value } });
      await createAuditLog({
        actorId: adminId,
        action: "SETTINGS_UPDATE",
        targetType: "SETTING",
        targetId: existing.id,
        before: { key, value: existing.value },
        after: { key, value, reason },
      }, tx);
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
