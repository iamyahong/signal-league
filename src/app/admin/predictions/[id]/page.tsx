import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { StatusBadge, CategoryBadge } from "@/components/prediction/StatusBadge";
import { QuestionDetailClient } from "./_components/QuestionDetailClient";
import { ArrowLeft, ExternalLink } from "lucide-react";

async function getQuestionData(id: string) {
  const [question, auditLogs, reports] = await Promise.all([
    prisma.predictionQuestion.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            nickname: true,
            email: true,
            createdAt: true,
            profile: { select: { availableScore: true } },
          },
        },
        category: { select: { id: true, name: true, slug: true } },
        options: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.auditLog.findMany({
      where: { targetId: id, targetType: "PredictionQuestion", deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { actor: { select: { nickname: true } } },
    }),
    prisma.report.findMany({
      where: { targetId: id, targetType: "QUESTION", deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: { reporter: { select: { nickname: true, email: true } } },
    }),
  ]);

  if (!question) return null;

  const prevNext = await prisma.predictionQuestion.findMany({
    where: { status: "PENDING_REVIEW", deletedAt: null },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true },
  });
  const currentIdx = prevNext.findIndex((q) => q.id === id);
  const prev = currentIdx > 0 ? prevNext[currentIdx - 1] : null;
  const next = currentIdx >= 0 && currentIdx < prevNext.length - 1 ? prevNext[currentIdx + 1] : null;

  return { question, auditLogs, reports, prev, next };
}

const ACTION_LABELS: Record<string, string> = {
  QUESTION_APPROVE: "승인", QUESTION_REJECT: "반려", QUESTION_HIDE: "숨김 처리",
  QUESTION_FORCE_CLOSE: "강제 마감", QUESTION_SUBMIT: "문제 신청",
};

const STATUS_KO: Record<string, string> = {
  PENDING_REVIEW: "검토 중", OPEN: "진행 중", CLOSED: "마감", RESOLVED: "결과 확정",
  VOIDED: "무효", REJECTED: "반려", HIDDEN: "숨김", DRAFT: "작성 중",
};

export default async function AdminPredictionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const data = await getQuestionData(id);
  if (!data) notFound();

  const { question: q, auditLogs, reports, prev, next } = data;
  const sourceUrls = q.sourceUrls as string[] | null;

  const serializedQuestion = {
    id: q.id,
    title: q.title,
    status: q.status,
    totalParticipants: q.totalParticipants,
    totalAllocated: q.totalAllocated,
    creatorCost: q.creatorCost,
    closesAt: q.closesAt?.toISOString() ?? null,
    resolvesAt: q.resolvesAt?.toISOString() ?? null,
    category: q.category,
    author: { nickname: q.author.nickname, email: q.author.email },
    options: q.options.map((o) => ({
      id: o.id,
      label: o.label,
      participantCount: o.participantCount,
      totalAllocated: o.totalAllocated,
    })),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin/predictions" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm text-[var(--color-text-secondary)]">예측 문제 관리</span>
        <span className="text-[var(--color-text-tertiary)]">/</span>
        <span className="text-sm text-[var(--color-text-primary)] font-medium truncate max-w-[200px]">{q.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
            <div className="flex items-start gap-2 mb-3">
              <StatusBadge status={q.status} />
              <CategoryBadge slug={q.category.slug} name={q.category.name} />
            </div>
            <h1 className="text-lg font-bold text-[var(--color-text-primary)] leading-snug mb-3">{q.title}</h1>

            <div className="text-sm space-y-1.5">
              <div className="flex gap-2">
                <span className="text-[var(--color-text-tertiary)] w-20 shrink-0">작성자</span>
                <span>
                  <Link href={`/admin/users/${q.author.id}`} className="text-[var(--color-accent-primary)] hover:underline font-medium">
                    {q.author.nickname}
                  </Link>
                  <span className="text-[var(--color-text-tertiary)] ml-1.5">{q.author.email}</span>
                </span>
              </div>
              <div className="flex gap-2">
                <span className="text-[var(--color-text-tertiary)] w-20 shrink-0">신청일</span>
                <span>{q.createdAt.toLocaleString("ko-KR")}</span>
              </div>
              {q.approvedAt && (
                <div className="flex gap-2">
                  <span className="text-[var(--color-text-tertiary)] w-20 shrink-0">승인일</span>
                  <span>{q.approvedAt.toLocaleString("ko-KR")}</span>
                </div>
              )}
              {q.rejectedAt && (
                <div className="flex gap-2">
                  <span className="text-[var(--color-text-tertiary)] w-20 shrink-0">반려일</span>
                  <span>{q.rejectedAt.toLocaleString("ko-KR")}</span>
                </div>
              )}
              {q.hiddenAt && (
                <div className="flex gap-2">
                  <span className="text-[var(--color-text-tertiary)] w-20 shrink-0">숨김일</span>
                  <span>{q.hiddenAt.toLocaleString("ko-KR")}</span>
                </div>
              )}
              {q.forceClosedAt && (
                <div className="flex gap-2">
                  <span className="text-[var(--color-text-tertiary)] w-20 shrink-0">강제 마감</span>
                  <span>{q.forceClosedAt.toLocaleString("ko-KR")}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">문제 정보</h2>
            {q.description && (
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-1">설명</p>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-line">{q.description}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[var(--color-text-tertiary)] mb-1.5">선택지</p>
              <div className="space-y-1">
                {q.options.map((opt, i) => (
                  <div key={opt.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-[var(--color-surface-muted)] flex items-center justify-center text-xs font-medium text-[var(--color-text-secondary)]">{i + 1}</span>
                    <span className="font-medium">{opt.label}</span>
                    {opt.description && <span className="text-[var(--color-text-tertiary)]">— {opt.description}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-0.5">참여 마감일</p>
                <p>{q.closesAt ? q.closesAt.toLocaleDateString("ko-KR") : "미지정"}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-0.5">결과 확정 예정일</p>
                <p>{q.resolvesAt ? q.resolvesAt.toLocaleDateString("ko-KR") : "미지정"}</p>
              </div>
            </div>
            {q.resolutionCriteria && (
              <div className="bg-blue-50 border border-blue-200 rounded-[var(--radius-lg)] p-3">
                <p className="text-xs font-semibold text-blue-700 mb-1">결과 확정 기준</p>
                <p className="text-xs text-blue-800 leading-relaxed">{q.resolutionCriteria}</p>
              </div>
            )}
            {sourceUrls && sourceUrls.length > 0 && (
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)] mb-1">참고 출처</p>
                <div className="space-y-1">
                  {sourceUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-[var(--color-accent-primary)] hover:underline">
                      <ExternalLink className="h-3 w-3" />
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">비용·참여 현황</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)]">생성 비용</p>
                <p className="text-sm font-semibold">{q.creatorCost.toLocaleString()}점</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)]">작성자 보유 점수</p>
                <p className="text-sm font-semibold">{(q.author.profile?.availableScore ?? 0).toLocaleString()}점</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)]">총 참여자</p>
                <p className="text-sm font-semibold">{q.totalParticipants.toLocaleString()}명</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-tertiary)]">총 배분 점수</p>
                <p className="text-sm font-semibold">{q.totalAllocated.toLocaleString()}점</p>
              </div>
            </div>
            {q.options.some((o) => o.participantCount > 0) && (
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <div key={opt.id} className="text-xs">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[var(--color-text-secondary)]">{opt.label}</span>
                      <span className="text-[var(--color-text-tertiary)]">{opt.participantCount}명 · {opt.totalAllocated.toLocaleString()}점</span>
                    </div>
                    <div className="h-1.5 bg-[var(--color-surface-muted)] rounded-full">
                      <div
                        className="h-full bg-[var(--color-accent-primary)] rounded-full"
                        style={{ width: `${q.totalAllocated > 0 ? (opt.totalAllocated / q.totalAllocated) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">상태 변경 이력</h2>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">이력이 없습니다.</p>
            ) : (
              <div className="divide-y divide-[var(--color-border-default)]">
                {auditLogs.map((log) => {
                  const after = log.after as Record<string, unknown> | null;
                  return (
                    <div key={log.id} className="py-2.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--color-text-primary)]">{ACTION_LABELS[log.action] ?? log.action}</span>
                          {log.actor && <span className="text-[var(--color-text-tertiary)] text-xs">by {log.actor.nickname}</span>}
                        </div>
                        <time className="text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </time>
                      </div>
                      {!!after?.memo && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">메모: {String(after.memo)}</p>}
                      {!!after?.rejectionReason && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">사유: {String(after.rejectionReason)}</p>}
                      {!!after?.userVisibleRejectionMessage && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">표시 메시지: {String(after.userVisibleRejectionMessage)}</p>}
                      {after?.refunded !== undefined && (
                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                          생성 비용: {after.refunded ? `반환 (${String(after.refundAmount)}점)` : "미반환"}
                        </p>
                      )}
                      {!!after?.hiddenReason && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">숨김 사유: {String(after.hiddenReason)}</p>}
                      {!!after?.forceCloseReason && <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">강제 마감 사유: {String(after.forceCloseReason)}</p>}
                      {!!after?.status && (
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                          상태 변경: {STATUS_KO[String(after.status)] ?? String(after.status)}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {reports.length > 0 && (
            <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">신고 이력 ({reports.length}건)</h2>
              <div className="divide-y divide-[var(--color-border-default)]">
                {reports.map((r) => (
                  <div key={r.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.reporter.nickname}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                        {r.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{r.reason}</p>
                    <time className="text-xs text-[var(--color-text-tertiary)]">
                      {new Date(r.createdAt).toLocaleString("ko-KR")}
                    </time>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-2">신고 처리 기능은 다음 단계에서 추가될 예정입니다.</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <QuestionDetailClient question={serializedQuestion} prev={prev} next={next} />
        </div>
      </div>
    </div>
  );
}
