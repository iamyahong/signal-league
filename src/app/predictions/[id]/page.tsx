import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AppHeader } from "@/components/layout/AppHeader";
import { StatusBadge, CategoryBadge } from "@/components/prediction/StatusBadge";
import { ReportModal } from "@/components/prediction/ReportModal";
import { OptionDistributionBar } from "../_components/OptionDistributionBar";
import { ParticipateForm } from "../_components/ParticipateForm";
import { CommentSection } from "../_components/CommentSection";
import { ExternalLinkReportButton } from "./_components/ExternalLinkReportButton";
import { Calendar, Users, Clock, ArrowLeft, CheckCircle, XCircle, ExternalLink, AlertTriangle } from "lucide-react";
import { DisputeSubmitButton } from "./_components/DisputeSubmitButton";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export default async function PredictionDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  const question = await prisma.predictionQuestion.findUnique({
    where: { id, deletedAt: null },
    include: {
      category: true,
      author: { select: { id: true, nickname: true } },
      options: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!question) notFound();

  let myParticipation = null;
  let currentScore = 0;
  let myExistingDispute: { id: string; status: string } | null = null;

  if (userId) {
    [myParticipation, currentScore, myExistingDispute] = await Promise.all([
      prisma.predictionParticipation.findUnique({
        where: { questionId_userId: { questionId: id, userId } },
        include: { option: { select: { label: true } } },
      }),
      prisma.userProfile.findUnique({ where: { userId }, select: { availableScore: true } }).then((p) => p?.availableScore ?? 0),
      prisma.dispute.findUnique({
        where: { questionId_userId: { questionId: id, userId } },
        select: { id: true, status: true },
      }),
    ]);
  }

  const now = new Date();
  const closesAt = question.closesAt ? new Date(question.closesAt) : null;
  const resolvesAt = question.resolvesAt ? new Date(question.resolvesAt) : null;
  const isClosingSoon = closesAt && (closesAt.getTime() - now.getTime()) < 24 * 60 * 60 * 1000 && closesAt > now;

  function diffLabel(d: Date | null): string {
    if (!d) return "미정";
    const diff = d.getTime() - now.getTime();
    if (diff <= 0) return "마감됨";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `${hours}시간 후`;
    return `${Math.floor(hours / 24)}일 후`;
  }

  const sourceUrls = (question.sourceUrls as string[] | null) ?? [];
  const isResolved = question.status === "RESOLVED";
  const isVoided = question.status === "VOIDED";

  const correctOption = isResolved && question.resolvedOptionId
    ? question.options.find((o) => o.id === question.resolvedOptionId)
    : null;

  const myIsWinner = myParticipation && correctOption
    ? myParticipation.optionId === correctOption.id
    : null;

  return (
    <>
      <AppHeader />
      <main>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-4">
            <Link href="/predictions" className="inline-flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              <ArrowLeft className="h-4 w-4" />예측 문제 목록
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CategoryBadge slug={question.category.slug} name={question.category.name} />
                    <StatusBadge status={question.status as Parameters<typeof StatusBadge>[0]["status"]} />
                  </div>
                  <ExternalLinkReportButton questionId={id} userId={userId} />
                </div>

                <h1 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">{question.title}</h1>

                <div className="flex flex-wrap gap-4 text-sm text-[var(--color-text-secondary)] mb-6">
                  <span className="flex items-center gap-1"><Users className="h-4 w-4" />{question.author.nickname}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />생성 {new Date(question.createdAt).toLocaleDateString("ko-KR")}</span>
                  {closesAt && (
                    <span className={`flex items-center gap-1 ${isClosingSoon ? "text-red-500 font-semibold" : ""}`}>
                      <Clock className="h-4 w-4" />마감 {closesAt.toLocaleDateString("ko-KR")} ({diffLabel(closesAt)})
                    </span>
                  )}
                  {isResolved && question.resolvedAt && (
                    <span className="flex items-center gap-1 text-green-600 font-medium">
                      <CheckCircle className="h-4 w-4" />결과 확정 {new Date(question.resolvedAt).toLocaleDateString("ko-KR")}
                    </span>
                  )}
                  {!isResolved && resolvesAt && (
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />결과 확정 예정 {resolvesAt.toLocaleDateString("ko-KR")}</span>
                  )}
                </div>

                {/* RESOLVED: 결과 박스 */}
                {isResolved && correctOption && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm font-bold text-green-800">예측 결과: &ldquo;{correctOption.label}&rdquo;</p>
                    </div>
                    {question.resolutionMemo && (
                      <p className="text-sm text-green-700 mt-1 whitespace-pre-wrap">{question.resolutionMemo}</p>
                    )}
                    {question.resolutionEvidenceUrl && (
                      <a
                        href={question.resolutionEvidenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-green-700 underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />출처 링크
                      </a>
                    )}
                  </div>
                )}

                {/* VOIDED: 무효 박스 */}
                {isVoided && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                      <p className="text-sm font-bold text-amber-800">무효 처리됨</p>
                    </div>
                    {question.voidReason && (
                      <p className="text-sm text-amber-700 mt-1">{question.voidReason}</p>
                    )}
                    {myParticipation && (
                      <p className="text-sm text-amber-700 mt-2 font-medium">
                        내 배분 점수 {myParticipation.allocatedScore.toLocaleString()}점 → 전액 환불됨
                      </p>
                    )}
                    {myParticipation && (
                      <Link href="/me/score" className="text-xs text-amber-700 underline mt-1 inline-block">점수 내역에서 확인하기 →</Link>
                    )}
                  </div>
                )}

                {question.description && (
                  <div className="mb-4">
                    <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">문제 설명</h2>
                    <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{question.description}</p>
                  </div>
                )}

                {question.resolutionCriteria && (
                  <div className="rounded-xl border border-[var(--color-accent-primary)]/20 bg-blue-50 p-4 mb-4">
                    <h3 className="text-sm font-semibold text-[var(--color-accent-primary)] mb-1.5">결과 확정 기준</h3>
                    <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{question.resolutionCriteria}</p>
                    <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">이 문제의 결과는 문제 생성자가 제시한 기준과 운영자 검토를 통해 확정됩니다. 결과 기준이 모호하거나 사실관계 확인이 어려운 경우 무효 처리될 수 있습니다.</p>
                  </div>
                )}

                {sourceUrls.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">참고 출처</h3>
                    <ul className="space-y-1">
                      {sourceUrls.map((url, i) => (
                        <li key={i}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-accent-primary)] hover:underline break-all">{url}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 본인 참여 결과 (RESOLVED/VOIDED) */}
              {isResolved && myParticipation && (
                <div className={`rounded-2xl border p-5 ${myIsWinner ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                  {myIsWinner ? (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <h2 className="text-base font-bold text-green-800">예측 적중</h2>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">내 선택</span><span className="font-medium">&ldquo;{myParticipation.option.label}&rdquo;</span></div>
                        <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">배분 점수</span><span className="font-medium">{myParticipation.allocatedScore.toLocaleString()}점</span></div>
                        <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">환원 점수</span><span className="font-bold text-green-700">+{(myParticipation.allocatedScore * 2).toLocaleString()}점</span></div>
                        <div className="flex justify-between border-t border-green-200 pt-1.5 mt-1.5"><span className="text-[var(--color-text-secondary)]">실질 성과</span><span className="font-bold text-green-700">+{myParticipation.allocatedScore.toLocaleString()}점</span></div>
                      </div>
                      <Link href="/me/score" className="text-xs text-green-700 underline mt-3 inline-block">점수 내역에서 확인하기 →</Link>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="h-6 w-6 text-gray-400" />
                        <h2 className="text-base font-bold text-[var(--color-text-secondary)]">예측 비적중</h2>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">내 선택</span><span className="font-medium">&ldquo;{myParticipation.option.label}&rdquo;</span></div>
                        <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">배분 점수</span><span className="font-medium text-[var(--color-text-tertiary)]">{myParticipation.allocatedScore.toLocaleString()}점 (소진)</span></div>
                        {correctOption && (
                          <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">정답</span><span className="font-medium">&ldquo;{correctOption.label}&rdquo;</span></div>
                        )}
                      </div>
                    </>
                  )}
                  {/* 이의제기 버튼 */}
                  {userId && session?.user?.status && ["BETA_ACTIVE", "ACTIVE"].includes(session.user.status as string) && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {myExistingDispute ? (
                        <p className="text-xs text-[var(--color-text-tertiary)]">
                          이의제기 접수됨 — 처리 상태:{" "}
                          <span className="font-medium text-amber-600">{myExistingDispute.status}</span>
                        </p>
                      ) : (
                        <DisputeSubmitButton questionId={id} questionTitle={question.title} />
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-semibold text-[var(--color-text-primary)]">선택지 분포</h2>
                  <span className="text-sm text-[var(--color-text-tertiary)]">총 {question.totalParticipants.toLocaleString()}명 참여 · {question.totalAllocated.toLocaleString()}점</span>
                </div>
                <OptionDistributionBar
                  options={question.options}
                  totalAllocated={question.totalAllocated}
                  myOptionId={myParticipation?.optionId ?? null}
                  correctOptionId={isResolved ? question.resolvedOptionId : null}
                />
              </div>

              <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6">
                <CommentSection
                  questionId={id}
                  currentUserId={userId}
                  userStatus={session?.user?.status}
                />
              </div>
            </div>

            <div className="space-y-4">
              <ParticipateForm
                questionId={id}
                questionTitle={question.title}
                resolvesAt={question.resolvesAt}
                options={question.options}
                currentScore={currentScore}
                userStatus={session?.user?.status}
                hasParticipated={!!myParticipation}
                myParticipation={myParticipation ? {
                  allocatedScore: myParticipation.allocatedScore,
                  optionId: myParticipation.optionId,
                  createdAt: myParticipation.createdAt,
                  option: myParticipation.option,
                } : null}
                questionStatus={question.status}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
