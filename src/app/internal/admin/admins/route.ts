import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireSuperAdmin, AdminAuthError } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";
import { UserRoleType } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const adminId = session.user.id;
    const { email, role } = await req.json() as { email: string; role: UserRoleType };

    if (!Object.values(UserRoleType).includes(role)) {
      return NextResponse.json({ error: "유효하지 않은 역할입니다." }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) return NextResponse.json({ error: "해당 이메일의 회원을 찾을 수 없습니다." }, { status: 404 });

    const existing = await prisma.userRole.findFirst({ where: { userId: targetUser.id, deletedAt: null } });
    if (existing) {
      return NextResponse.json({ error: "이미 관리자 역할이 있는 회원입니다." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.create({ data: { userId: targetUser.id, role } });
      await createAuditLog({
        actorId: adminId,
        action: "ADMIN_ROLE_GRANT",
        targetType: "USER",
        targetId: targetUser.id,
        after: { email, role },
      }, tx);
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireSuperAdmin();
    const adminId = session.user.id;
    const { roleId } = await req.json() as { roleId: string };

    const role = await prisma.userRole.findUnique({ where: { id: roleId } });
    if (!role) return NextResponse.json({ error: "역할을 찾을 수 없습니다." }, { status: 404 });
    if (role.userId === adminId) {
      return NextResponse.json({ error: "자기 자신의 관리자 권한을 회수할 수 없습니다." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userRole.delete({ where: { id: roleId } });
      await createAuditLog({
        actorId: adminId,
        action: "ADMIN_ROLE_REVOKE",
        targetType: "USER",
        targetId: role.userId,
        before: { role: role.role },
      }, tx);
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AdminAuthError) return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
