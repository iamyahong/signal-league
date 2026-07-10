import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { calcResolvePreview } from "@/lib/prediction/admin/calcResolvePreview";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  correctOptionId: z.string().uuid(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }

  const { id: questionId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  try {
    const preview = await prisma.$transaction(async (tx) => {
      return calcResolvePreview(questionId, parsed.data.correctOptionId, tx);
    });
    return NextResponse.json(preview);
  } catch (e: unknown) {
    if (e instanceof Error)
      return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: "미리보기 계산 중 오류가 발생했습니다." }, { status: 500 });
  }
}
