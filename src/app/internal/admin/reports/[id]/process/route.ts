import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { processReport, FollowUpActions } from "@/lib/report/processReport";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendEmailNotification } from "@/lib/emailNotification";
import { reportHandledTemplate } from "@/lib/emailTemplates";

const followUpActionsSchema = z.object({
  deleteComment: z.boolean().optional(),
  hideQuestion: z.boolean().optional(),
  warnUser: z.boolean().optional(),
  suspendUser: z.boolean().optional(),
});

const schema = z.object({
  resolution: z.enum(["ACCEPTED", "DISMISSED", "NEEDS_MORE_INFO"]),
  processingReason: z.string().min(1).max(500),
  userVisibleResolutionMessage: z.string().max(300).optional(),
  notifyReporter: z.boolean().optional(),
  notifyReportedUser: z.boolean().optional(),
  followUpActions: followUpActionsSchema.optional(),
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

  const { id: reportId } = await params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  try {
    const result = await prisma.$transaction(async (tx) => {
      return processReport(
        {
          reportId,
          adminId: session.user.id,
          resolution: parsed.data.resolution,
          processingReason: parsed.data.processingReason,
          userVisibleResolutionMessage: parsed.data.userVisibleResolutionMessage,
          notifyReporter: parsed.data.notifyReporter,
          notifyReportedUser: parsed.data.notifyReportedUser,
          followUpActions: parsed.data.followUpActions as FollowUpActions | undefined,
        },
        tx
      );
    });

    // 이메일 — 트랜잭션 commit 후
    if (result.reporterId && result.reporterNickname && parsed.data.notifyReporter) {
      const tpl = reportHandledTemplate({
        nickname: result.reporterNickname,
        resolution: result.resolution,
      });
      await sendEmailNotification({
        userId: result.reporterId,
        type: "REPORT_HANDLED",
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        preferenceKey: "REPORT_HANDLED",
      });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "이미 처리된 신고입니다.")
      return NextResponse.json({ error: e.message }, { status: 409 });
    if (e instanceof Error && e.message === "신고를 찾을 수 없습니다.")
      return NextResponse.json({ error: e.message }, { status: 404 });
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
