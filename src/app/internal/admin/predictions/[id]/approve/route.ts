import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { approveQuestion } from "@/lib/prediction/admin/approveQuestion";
import { sendEmailNotification } from "@/lib/emailNotification";
import { questionApprovedTemplate } from "@/lib/emailTemplates";
import { z } from "zod";

const bodySchema = z.object({
  memo: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const emailData = await prisma.$transaction(async (tx) => {
      return approveQuestion(
        { questionId: id, adminId: session.user.id, memo: parsed.data.memo },
        tx
      );
    });

    // 트랜잭션 완료 후 이메일 발송
    const author = await prisma.user.findUnique({
      where: { id: emailData.authorId },
      select: { nickname: true },
    });
    if (author) {
      void sendEmailNotification({
        userId: emailData.authorId,
        type: "QUESTION_APPROVED",
        ...questionApprovedTemplate({
          nickname: author.nickname,
          questionTitle: emailData.questionTitle,
          questionId: emailData.questionId,
        }),
        preferenceKey: "questionApproved",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
