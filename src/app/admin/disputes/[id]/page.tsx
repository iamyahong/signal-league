import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { ArrowLeft, Users, TrendingUp } from "lucide-react";
import { DisputeProcessButton } from "./_components/DisputeProcessButton";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  REVIEWING: "bg-blue-100 text-blue-700 border-blue-200",
  ACCEPTED: "bg-green-100 text-green-700 border-green-200",
  REJECTED: "bg-gray-100 text-gray-600 border-gray-200",
  NEEDS_MORE_INFO: "bg-purple-100 text-purple-700 border-purple-200",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "처리 대기", REVIEWING: "검토 중", ACCEPTED: "수락", REJECTED: "기각", NEEDS_MORE_INFO: "추가 검토",
};

function isAdmin(roles: string[]) {
  return roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR") || roles.includes("READ_ONLY");
}

function canProcess(roles: string[]) {
  return roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR");
}

interface Props { params: Promise<{ id: string }> }

export default async function AdminDisputeDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const roles = (session.user.roles as string[]) ?? [];
  if (!isAdmin(roles)) redirect("/admin");

  const { id } = await params;

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, nickname: true, email: true } },
      question: {
        select: {
          id: true, title: true, status: true, resolvedAt: true, totalParticipants: true, totalAllocated: true,
          options: { where: { deletedAt: null }, select: { id: true, label: true, participantCount: true, isResolved: true } },
        },
      },
    },
  });

  if (!dispute) notFound();

  const otherDisputeCount = await prisma.dispute.count({
    where: { questionId: dispute.questionId, id: { not: id }, deletedAt: null },
  });

  const isProcessed = ["ACCEPTED", "REJECTED"].includes(dispute.status);

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <Link href="/admin/disputes" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-3">
          <ArrowLeft className="h-4 w-4" />이의제기 목록
        </Link>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">이의제기 상세</h1>
      </div>

      <div className={`border rounded-[var(--radius-xl)] p-4 ${STATUS_COLORS[dispute.status] ?? "bg-gray-100"}`}>
        <span className="text-sm font-semibold">{STATUS_LABELS[dispute.status] ?? dispute.status}</span>
        {dispute.processedAt && (
          <span className="text-xs ml-2 opacity-70">
            {new Date(dispute.processedAt).toLocaleDateString("ko-KR")} 처리 완료
          </span>
        )}
      </div>

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">이의제기 정보</h2>
        <div className="space-y-2 text-sm">
          <div className="flex gap-2">
            <span className="text-[var(--color-text-tertiary)] w-20 shrink-0">제출자</span>
            <span>{dispute.user.nickname} ({dispute.user.email})</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[var(--color-text-tertiary)] w-20 shrink-0">제출일</span>
            <span>{new Date(dispute.createdAt).toLocaleDateString("ko-KR")}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-[var(--color-text-tertiary)] w-20 shrink-0">사유</span>
            <p className="flex-1 leading-relaxed whitespace-pre-wrap">{dispute.reason}</p>
          </div>
          {dispute.evidence && (
            <div className="flex gap-2">
              <span className="text-[var(--color-text-tertiary)] w-20 shrink-0">보강 자료</span>
              <a href={dispute.evidence} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent-primary)] hover:underline break-all">{dispute.evidence}</a>
            </div>
          )}
          {otherDisputeCount > 0 && (
            <div className="flex gap-2">
              <span className="text-[var(--color-text-tertiary)] w-20 shrink-0">관련</span>
              <span className="text-amber-600 font-medium">같은 문제에 {otherDisputeCount}건의 다른 이의제기 있음</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">대상 문제</h2>
          <Link href={`/admin/predictions/${dispute.question.id}`} className="text-xs text-[var(--color-accent-primary)] hover:underline">
            문제 관리 →
          </Link>
        </div>
        <p className="font-medium text-[var(--color-text-primary)]">{dispute.question.title}</p>
        <div className="flex gap-4 text-sm text-[var(--color-text-secondary)]">
          <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{dispute.question.totalParticipants}명</span>
          <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />{dispute.question.totalAllocated.toLocaleString()}점</span>
          <span>상태: <strong>{dispute.question.status}</strong></span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {dispute.question.options.map((opt) => (
            <div key={opt.id} className={`p-2 rounded-[var(--radius-md)] text-xs border ${opt.isResolved ? "border-green-300 bg-green-50" : "border-[var(--color-border-default)]"}`}>
              <span className="font-medium">{opt.label}</span>
              {opt.isResolved && <span className="ml-1 text-green-600 font-bold">✓ 정답</span>}
              <p className="text-[var(--color-text-tertiary)]">{opt.participantCount}명</p>
            </div>
          ))}
        </div>
      </div>

      {isProcessed && dispute.userVisibleResolutionMessage && (
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 space-y-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">처리 결과</h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex gap-2">
              <span className="text-[var(--color-text-tertiary)] w-24 shrink-0">결과 액션</span>
              <span className="font-medium">{dispute.resultAction === "VOIDED" ? "무효 처리됨" : "기존 결과 유지"}</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[var(--color-text-tertiary)] w-24 shrink-0">처리 사유</span>
              <p className="flex-1 whitespace-pre-wrap">{dispute.processingReason}</p>
            </div>
            <div className="flex gap-2">
              <span className="text-[var(--color-text-tertiary)] w-24 shrink-0">사용자 메시지</span>
              <p className="flex-1 whitespace-pre-wrap">{dispute.userVisibleResolutionMessage}</p>
            </div>
          </div>
        </div>
      )}

      {!isProcessed && canProcess(roles) && (
        <DisputeProcessButton disputeId={id} questionStatus={dispute.question.status} />
      )}
    </div>
  );
}
