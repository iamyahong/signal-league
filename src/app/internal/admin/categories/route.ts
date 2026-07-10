import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireSuperAdmin, AdminAuthError } from "@/lib/admin/auth";
import { createAuditLog } from "@/lib/admin/audit";
import prisma from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "슬러그는 소문자·숫자·하이픈만 사용 가능합니다."),
  name: z.string().min(1, "카테고리명을 입력해 주세요."),
  description: z.string().optional(),
});

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });

  const counts = await Promise.all(
    categories.map((c) =>
      prisma.predictionQuestion.count({ where: { categoryId: c.id, deletedAt: null } })
    )
  );

  const result = categories.map((c, i) => ({ ...c, questionCount: counts[i] }));
  return NextResponse.json({ categories: result });
}

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireSuperAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({ where: { slug: parsed.data.slug } });
  if (existing) {
    return NextResponse.json({ error: "이미 존재하는 슬러그입니다." }, { status: 409 });
  }

  const maxOrder = await prisma.category.aggregate({
    where: { deletedAt: null },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? 0) + 1;

  const category = await prisma.category.create({
    data: { ...parsed.data, sortOrder },
  });

  await createAuditLog({
    actorId: session.user.id,
    action: "CATEGORY_CREATE",
    targetType: "Category",
    targetId: category.id,
    before: undefined,
    after: { slug: category.slug, name: category.name, sortOrder },
  });

  return NextResponse.json({ category }, { status: 201 });
}
