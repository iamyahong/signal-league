import { requireAdmin, AdminAuthError } from "@/lib/admin/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { ReportTargetType } from "@prisma/client";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch (e) {
    if (e instanceof AdminAuthError)
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    return NextResponse.json({ error: "오류가 발생했습니다." }, { status: 500 });
  }

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      reporter: { select: { id: true, nickname: true, email: true } },
    },
  });

  if (!report)
    return NextResponse.json({ error: "신고를 찾을 수 없습니다." }, { status: 404 });

  let targetPreview: Record<string, unknown> | null = null;

  if (report.targetType === ReportTargetType.COMMENT) {
    const comment = await prisma.comment.findUnique({
      where: { id: report.targetId },
      select: {
        id: true,
        content: true,
        commentType: true,
        isHidden: true,
        deletedAt: true,
        deletedByAdminId: true,
        createdAt: true,
        user: { select: { id: true, nickname: true } },
        question: { select: { id: true, title: true } },
      },
    });
    targetPreview = comment
      ? {
          type: "COMMENT",
          id: comment.id,
          content: comment.content,
          commentType: comment.commentType,
          isHidden: comment.isHidden,
          deletedAt: comment.deletedAt?.toISOString() ?? null,
          deletedByAdminId: comment.deletedByAdminId,
          createdAt: comment.createdAt.toISOString(),
          user: comment.user,
          question: comment.question,
        }
      : null;
  } else if (report.targetType === ReportTargetType.QUESTION) {
    const question = await prisma.predictionQuestion.findUnique({
      where: { id: report.targetId },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        author: { select: { id: true, nickname: true } },
        category: { select: { slug: true, name: true } },
      },
    });
    targetPreview = question
      ? {
          type: "QUESTION",
          id: question.id,
          title: question.title,
          status: question.status,
          createdAt: question.createdAt.toISOString(),
          author: question.author,
          category: question.category,
        }
      : null;
  } else if (report.targetType === ReportTargetType.USER) {
    const user = await prisma.user.findUnique({
      where: { id: report.targetId },
      select: {
        id: true,
        nickname: true,
        email: true,
        status: true,
        createdAt: true,
      },
    });
    targetPreview = user
      ? {
          type: "USER",
          id: user.id,
          nickname: user.nickname,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt.toISOString(),
        }
      : null;
  }

  return NextResponse.json({
    id: report.id,
    targetType: report.targetType,
    targetId: report.targetId,
    reason: report.reason,
    status: report.status,
    reviewedBy: report.reviewedBy,
    reviewedAt: report.reviewedAt?.toISOString() ?? null,
    reviewNote: report.reviewNote,
    processedAt: report.processedAt?.toISOString() ?? null,
    processedByAdminId: report.processedByAdminId,
    processingReason: report.processingReason,
    processingResolution: report.processingResolution,
    notifyReporter: report.notifyReporter,
    notifyReportedUser: report.notifyReportedUser,
    userVisibleResolutionMessage: report.userVisibleResolutionMessage,
    createdAt: report.createdAt.toISOString(),
    reporter: report.reporter,
    targetPreview,
  });
}
