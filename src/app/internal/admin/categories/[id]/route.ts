import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin, AdminAuthError } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";
import prisma from "@/lib/prisma";
import { z } from "zod";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSuperAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const before = await prisma.category.findUnique({ where: { id } });
  if (!before) {
    return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
  }

  const category = await prisma.category.update({
    where: { id },
    data: parsed.data,
  });

  await createAuditLog({
    actorId: session.user.id,
    action: "CATEGORY_UPDATE",
    targetType: "Category",
    targetId: id,
    before: { name: before.name, isActive: before.isActive, sortOrder: before.sortOrder },
    after: parsed.data as Record<string, unknown>,
  });

  return NextResponse.json({ category });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireSuperAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }

  const { id } = await params;

  const questionCount = await prisma.predictionQuestion.count({
    where: { categoryId: id, deletedAt: null },
  });
  if (questionCount > 0) {
    return NextResponse.json(
      { error: `등록된 예측 문제가 ${questionCount}개 있어 삭제할 수 없습니다. 비활성 처리를 사용해 주세요.` },
      { status: 409 }
    );
  }

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: "카테고리를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.category.update({ where: { id }, data: { deletedAt: new Date() } });

  await createAuditLog({
    actorId: session.user.id,
    action: "CATEGORY_DELETE",
    targetType: "Category",
    targetId: id,
    before: { slug: category.slug, name: category.name },
    after: { deletedAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true });
}
