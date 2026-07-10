import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { rejectQuestion } from "@/lib/prediction/admin/rejectQuestion";
import { sendEmailNotification } from "@/lib/emailNotification";
import { questionRejectedTemplate } from "@/lib/emailTemplates";
import { z } from "zod";

const bodySchema = z.object({
  rejectionReason: z.string().min(1, "반려 사유를 입력해 주세요."),
  userVisibleRejectionMessage: z.string().min(1, "작성자 표시 메시지를 입력해 주세요."),
  refund: z.boolean(),
  refundDecisionNote: z.string().max(500).optional(),
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
    const firstError = parsed.error.errors[0]?.message ?? "입력값이 올바르지 않습니다.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  try {
    const emailData = await prisma.$transaction(async (tx) => {
      return rejectQuestion(
        {
          questionId: id,
          adminId: session.user.id,
          rejectionReason: parsed.data.rejectionReason,
          userVisibleRejectionMessage: parsed.data.userVisibleRejectionMessage,
          refund: parsed.data.refund,
          refundDecisionNote: parsed.data.refundDecisionNote,
        },
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
        type: "QUESTION_REJECTED",
        ...questionRejectedTemplate({
          nickname: author.nickname,
          questionTitle: emailData.questionTitle,
          reason: emailData.userVisibleRejectionMessage,
        }),
        preferenceKey: "questionRejected",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "서버 오류가 발생했습니다.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
