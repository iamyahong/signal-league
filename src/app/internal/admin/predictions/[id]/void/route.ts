import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { voidQuestion } from "@/lib/prediction/admin/voidQuestion";
import { sendEmailNotification } from "@/lib/emailNotification";
import { questionVoidedTemplate } from "@/lib/emailTemplates";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  voidReason: z.string().min(1).max(500),
  userVisibleMessage: z.string().min(1).max(300),
  refundCreatorCost: z.boolean(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }

  const { id: questionId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "잘못된 요청입니다.", details: parsed.error.flatten() }, { status: 400 });

  try {
    const emailData = await prisma.$transaction(async (tx) => {
      return voidQuestion(
        {
          questionId,
          adminId: session.user.id,
          voidReason: parsed.data.voidReason,
          userVisibleMessage: parsed.data.userVisibleMessage,
          refundCreatorCost: parsed.data.refundCreatorCost,
        },
        tx
      );
    }, { timeout: 30000 });

    // 트랜잭션 완료 후 이메일 병렬 발송
    const emailJobs: Promise<void>[] = [];

    // 참여자 전체
    for (const p of emailData.participants) {
      emailJobs.push(
        sendEmailNotification({
          userId: p.userId,
          type: "QUESTION_VOIDED",
          ...questionVoidedTemplate({
            nickname: p.nickname,
            questionTitle: emailData.questionTitle,
            reason: emailData.userVisibleMessage,
            role: "PARTICIPANT",
            refundedScore: p.refundedScore,
          }),
          forceEmailRegardlessOfPreference: true,
        })
      );
    }

    // 작성자 — 작성자가 참여자이기도 한 경우 PARTICIPANT 메일이 이미 발송되므로 AUTHOR 메일 스킵
    const isAuthorAlsoParticipant = emailData.participants.some(
      (p) => p.userId === emailData.authorId
    );

    if (!isAuthorAlsoParticipant) {
      emailJobs.push(
        sendEmailNotification({
          userId: emailData.authorId,
          type: "QUESTION_VOIDED",
          ...questionVoidedTemplate({
            nickname: emailData.authorNickname,
            questionTitle: emailData.questionTitle,
            reason: emailData.userVisibleMessage,
            role: "AUTHOR",
          }),
          forceEmailRegardlessOfPreference: true,
        })
      );
    }

    void Promise.allSettled(emailJobs);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message.includes("OPEN 또는 CLOSED"))
        return NextResponse.json({ error: e.message }, { status: 409 });
      if (e.message.includes("찾을 수 없"))
        return NextResponse.json({ error: e.message }, { status: 404 });
    }
    return NextResponse.json({ error: "무효 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
