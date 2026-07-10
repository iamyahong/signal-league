import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ReportStatus, ReportTargetType } from "@prisma/client";
import { ProcessReportForm } from "./_components/ProcessReportForm";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<ReportStatus, { label: string; color: string }> = {
  PENDING:         { label: "대기",      color: "text-amber-600 bg-amber-50 border-amber-200" },
  REVIEWING:       { label: "검토 중",   color: "text-blue-600 bg-blue-50 border-blue-200" },
  RESOLVED:        { label: "처리됨",    color: "text-green-600 bg-green-50 border-green-200" },
  DISMISSED:       { label: "기각",      color: "text-gray-500 bg-gray-100 border-gray-200" },
  ACCEPTED:        { label: "수락",      color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  NEEDS_MORE_INFO: { label: "추가 검토", color: "text-purple-600 bg-purple-50 border-purple-200" },
};

const TARGET_LABELS: Record<ReportTargetType, string> = {
  QUESTION: "예측 문제",
  COMMENT:  "댓글",
  USER:     "사용자",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminReportDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[]) || [];
  const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR");
  if (!isAdmin) redirect("/home");

  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: { reporter: { select: { id: true, nickname: true, email: true } } },
  });

  if (!report) notFound();

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
    if (comment) {
      targetPreview = {
        type: "COMMENT",
        id: comment.id,
        content: comment.content,
        isHidden: comment.isHidden,
        isDeleted: !!comment.deletedAt,
        isAdminDeleted: !!comment.deletedByAdminId,
        createdAt: comment.createdAt.toISOString(),
        user: comment.user,
        question: comment.question,
      };
    }
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
    if (question) {
      targetPreview = {
        type: "QUESTION",
        id: question.id,
        title: question.title,
        status: question.status,
        createdAt: question.createdAt.toISOString(),
        author: question.author,
        category: question.category,
      };
    }
  } else if (report.targetType === ReportTargetType.USER) {
    const user = await prisma.user.findUnique({
      where: { id: report.targetId },
      select: { id: true, nickname: true, email: true, status: true, createdAt: true },
    });
    if (user) {
      targetPreview = {
        type: "USER",
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      };
    }
  }

  const isProcessed =
    report.status === ReportStatus.ACCEPTED || report.status === ReportStatus.DISMISSED;
  const badge = STATUS_LABELS[report.status] ?? { label: report.status, color: "text-gray-500 bg-gray-100 border-gray-200" };

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/reports" className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-3">
          <ArrowLeft className="h-4 w-4" />신고 목록
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">신고 상세</h1>
          <span className={`text-xs font-medium border rounded-full px-2.5 py-0.5 ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-2xl">
        {/* Report info */}
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">신고 정보</h2>
          <div className="space-y-2 text-sm">
            <div className="flex gap-3">
              <span className="w-24 text-[var(--color-text-secondary)] shrink-0">신고 대상</span>
              <span className="font-medium">{TARGET_LABELS[report.targetType]}</span>
            </div>
            <div className="flex gap-3">
              <span className="w-24 text-[var(--color-text-secondary)] shrink-0">신고 사유</span>
              <span className="text-[var(--color-text-primary)]">{report.reason}</span>
            </div>
            <div className="flex gap-3">
              <span className="w-24 text-[var(--color-text-secondary)] shrink-0">신고자</span>
              <span>
                {report.reporter.nickname}
                <span className="text-[var(--color-text-tertiary)] ml-1 text-xs">({report.reporter.email})</span>
              </span>
            </div>
            <div className="flex gap-3">
              <span className="w-24 text-[var(--color-text-secondary)] shrink-0">신고일</span>
              <span className="text-[var(--color-text-secondary)]">
                {new Date(report.createdAt).toLocaleString("ko-KR")}
              </span>
            </div>
            {report.reviewNote && (
              <div className="flex gap-3">
                <span className="w-24 text-[var(--color-text-secondary)] shrink-0">검토 메모</span>
                <span>{report.reviewNote}</span>
              </div>
            )}
          </div>
        </div>

        {/* Target preview */}
        {targetPreview && (
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">신고 대상 미리보기</h2>
            {targetPreview.type === "COMMENT" && (
              <div className="space-y-2 text-sm">
                <div className="rounded-lg bg-gray-50 p-3 text-[var(--color-text-primary)]">
                  {(targetPreview.isAdminDeleted as boolean) ? (
                    <span className="italic text-[var(--color-text-tertiary)]">운영자에 의해 삭제된 댓글</span>
                  ) : (targetPreview.isDeleted as boolean) ? (
                    <span className="italic text-[var(--color-text-tertiary)]">사용자에 의해 삭제된 댓글</span>
                  ) : (
                    targetPreview.content as string
                  )}
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  작성자: {(targetPreview.user as { nickname: string }).nickname} |
                  문제: {(targetPreview.question as { title: string }).title}
                </p>
                {(targetPreview.isAdminDeleted as boolean) && (
                  <p className="text-xs text-red-500">이미 운영자에 의해 삭제된 댓글입니다.</p>
                )}
              </div>
            )}
            {targetPreview.type === "QUESTION" && (
              <div className="space-y-2 text-sm">
                <Link
                  href={`/predictions/${targetPreview.id as string}`}
                  className="font-medium text-[var(--color-accent-primary)] hover:underline"
                >
                  {targetPreview.title as string}
                </Link>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  상태: {targetPreview.status as string} |
                  카테고리: {(targetPreview.category as { name: string }).name} |
                  작성자: {(targetPreview.author as { nickname: string }).nickname}
                </p>
              </div>
            )}
            {targetPreview.type === "USER" && (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{targetPreview.nickname as string}</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  이메일: {targetPreview.email as string} | 상태: {targetPreview.status as string}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Process form */}
        {isProcessed ? (
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">처리 결과</h2>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="w-24 text-[var(--color-text-secondary)] shrink-0">처리 결과</span>
                <span className="font-medium">{badge.label}</span>
              </div>
              {report.processingReason && (
                <div className="flex gap-3">
                  <span className="w-24 text-[var(--color-text-secondary)] shrink-0">처리 사유</span>
                  <span>{report.processingReason}</span>
                </div>
              )}
              {report.processedAt && (
                <div className="flex gap-3">
                  <span className="w-24 text-[var(--color-text-secondary)] shrink-0">처리일시</span>
                  <span className="text-[var(--color-text-secondary)]">
                    {new Date(report.processedAt).toLocaleString("ko-KR")}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <ProcessReportForm reportId={report.id} targetType={report.targetType} />
        )}
      </div>
    </div>
  );
}
