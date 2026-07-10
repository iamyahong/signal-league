import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { resolveQuestion } from "@/lib/prediction/admin/resolveQuestion";
import { sendEmailNotification } from "@/lib/emailNotification";
import { resultConfirmedTemplate } from "@/lib/emailTemplates";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  correctOptionId: z.string().uuid(),
  resolutionMemo: z.string().min(1).max(1000),
  resolutionEvidenceUrl: z.string().url().optional().or(z.literal("")),
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
      return resolveQuestion(
        {
          questionId,
          adminId: session.user.id,
          correctOptionId: parsed.data.correctOptionId,
          resolutionMemo: parsed.data.resolutionMemo,
          resolutionEvidenceUrl: parsed.data.resolutionEvidenceUrl || undefined,
        },
        tx
      );
    }, { timeout: 30000 });

    // 트랜잭션 완료 후 이메일 병렬 발송
    const emailJobs: Promise<void>[] = [];

    // 적중자
    for (const hit of emailData.hits) {
      emailJobs.push(
        sendEmailNotification({
          userId: hit.userId,
          type: "RESULT_CONFIRMED",
          ...resultConfirmedTemplate({
            nickname: hit.nickname,
            questionTitle: emailData.questionTitle,
            questionId: emailData.questionId,
            role: "HIT",
            scoreChange: hit.earnedScore,
            winningChoice: emailData.correctOptionLabel,
          }),
          preferenceKey: "resultConfirmed",
        })
      );
    }

    // 비적중자
    for (const miss of emailData.misses) {
      emailJobs.push(
        sendEmailNotification({
          userId: miss.userId,
          type: "RESULT_CONFIRMED",
          ...resultConfirmedTemplate({
            nickname: miss.nickname,
            questionTitle: emailData.questionTitle,
            questionId: emailData.questionId,
            role: "MISS",
            scoreChange: -miss.allocatedScore,
            winningChoice: emailData.correctOptionLabel,
          }),
          preferenceKey: "resultConfirmed",
        })
      );
    }

    // 작성자 — 작성자가 참여자이기도 한 경우 HIT/MISS 메일이 이미 발송되므로 AUTHOR 메일 스킵
    const isAuthorAlsoParticipant = [
      ...emailData.hits,
      ...emailData.misses,
    ].some((p) => p.userId === emailData.authorId);

    if (!isAuthorAlsoParticipant) {
      emailJobs.push(
        sendEmailNotification({
          userId: emailData.authorId,
          type: "RESULT_CONFIRMED",
          ...resultConfirmedTemplate({
            nickname: emailData.authorNickname,
            questionTitle: emailData.questionTitle,
            questionId: emailData.questionId,
            role: "AUTHOR",
            winningChoice: emailData.correctOptionLabel,
          }),
          preferenceKey: "resultConfirmed",
        })
      );
    }

    void Promise.allSettled(emailJobs);

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message.includes("CLOSED 상태에서만"))
        return NextResponse.json({ error: e.message }, { status: 409 });
      if (e.message.includes("속하지 않습니다"))
        return NextResponse.json({ error: e.message }, { status: 400 });
      if (e.message.includes("찾을 수 없"))
        return NextResponse.json({ error: e.message }, { status: 404 });
    }
    return NextResponse.json({ error: "결과 확정 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
