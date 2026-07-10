import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ questionId: string; userId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { questionId, userId } = await params;

  const [question, participation] = await Promise.all([
    prisma.predictionQuestion.findUnique({
      where: { id: questionId },
      select: { title: true, status: true },
    }),
    prisma.predictionParticipation.findUnique({
      where: { questionId_userId: { questionId, userId } },
      select: {
        option: { select: { isResolved: true } },
        user: { select: { nickname: true } },
      },
    }),
  ]);

  if (!question || !participation) return { title: "Signal League" };

  const isResolved = question.status === "RESOLVED";
  const isCorrect = isResolved && participation.option?.isResolved === true;
  const nickname = participation.user.nickname;

  const title = `${nickname}님의 예측 — ${question.title}`;
  const description = isResolved
    ? isCorrect
      ? `✓ 적중! ${nickname}님이 이 예측을 맞혔습니다.`
      : `${nickname}님이 이 예측에 참여했습니다.`
    : `${nickname}님이 이 예측에 참여 중입니다.`;

  const ogImageUrl = `/internal/og/prediction/${questionId}/${userId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImageUrl, width: 1200, height: 630 }],
      siteName: "Signal League",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PredictionSharePage({ params }: Props) {
  const { questionId, userId } = await params;

  const [question, participation] = await Promise.all([
    prisma.predictionQuestion.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        title: true,
        status: true,
        options: { select: { id: true, label: true, isResolved: true }, orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.predictionParticipation.findUnique({
      where: { questionId_userId: { questionId, userId } },
      select: {
        optionId: true,
        allocatedScore: true,
        user: { select: { nickname: true } },
        option: { select: { isResolved: true } },
      },
    }),
  ]);

  if (!question || !participation) notFound();

  const isResolved = question.status === "RESOLVED";
  const isCorrect = isResolved && participation.option?.isResolved === true;
  const nickname = participation.user.nickname;

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-accent-primary)]/10 border border-[var(--color-accent-primary)]/20">
          <span className="text-xs font-semibold text-[var(--color-accent-primary)] tracking-wider">SIGNAL LEAGUE</span>
        </div>

        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-8 shadow-sm text-left">
          {isResolved && (
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
                isCorrect
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {isCorrect ? "✓ 적중" : "✗ 불일치"}
            </div>
          )}

          <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-6 leading-relaxed">
            {question.title}
          </h2>

          <div className="space-y-2 mb-6">
            {question.options.map((opt) => {
              const isSelected = opt.id === participation.optionId;
              const isWinner = isResolved && opt.isResolved;
              return (
                <div
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-[var(--radius-lg)] border text-sm ${
                    isSelected
                      ? isResolved
                        ? isCorrect
                          ? "bg-emerald-50 border-emerald-300 font-semibold text-emerald-800"
                          : "bg-red-50 border-red-300 font-semibold text-red-800"
                        : "bg-blue-50 border-blue-300 font-semibold text-blue-800"
                      : isWinner
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-[var(--color-surface-muted)] border-[var(--color-border-default)] text-[var(--color-text-secondary)]"
                  }`}
                >
                  <div
                    className={`w-3 h-3 rounded-full flex-shrink-0 ${
                      isSelected
                        ? isResolved
                          ? isCorrect
                            ? "bg-emerald-500"
                            : "bg-red-500"
                          : "bg-blue-500"
                        : isWinner
                        ? "bg-emerald-400"
                        : "bg-gray-300"
                    }`}
                  />
                  <span>{opt.label}</span>
                  {isSelected && <span className="ml-auto text-xs opacity-70">{nickname}님 선택</span>}
                </div>
              );
            })}
          </div>

          <Link
            href={`/predictions/${question.id}`}
            className="block w-full py-3 px-4 rounded-[var(--radius-lg)] bg-[var(--color-accent-primary)] text-white text-sm font-semibold text-center hover:opacity-90 transition-opacity"
          >
            이 예측 보러 가기
          </Link>
        </div>

        <Link
          href="/signup"
          className="block text-sm font-medium text-[var(--color-accent-primary)] hover:underline"
        >
          나도 Signal League 시작하기 →
        </Link>
      </div>
    </div>
  );
}
