"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ParticipateConfirmModal } from "./ParticipateConfirmModal";

interface Option {
  id: string;
  label: string;
  totalAllocated: number;
  participantCount: number;
}

interface ParticipateFormProps {
  questionId: string;
  questionTitle: string;
  resolvesAt: Date | string | null;
  options: Option[];
  currentScore: number;
  userStatus?: string;
  hasParticipated: boolean;
  myParticipation?: { allocatedScore: number; optionId: string; createdAt: Date | string; option: { label: string } } | null;
  questionStatus: string;
}

const MIN_ALLOCATE = 10;

const QUICK_PCTS = [
  { label: "10%", pct: 0.1 },
  { label: "25%", pct: 0.25 },
  { label: "50%", pct: 0.5 },
  { label: "100%", pct: 1.0 },
];

export function ParticipateForm({ questionId, questionTitle, resolvesAt, options, currentScore, userStatus, hasParticipated, myParticipation, questionStatus }: ParticipateFormProps) {
  const router = useRouter();
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [scoreInput, setScoreInput] = useState("");
  const [memo, setMemo] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const allocatedScore = parseInt(scoreInput, 10) || 0;
  const scorePct = currentScore > 0 ? ((allocatedScore / currentScore) * 100).toFixed(1) : "0.0";

  const minAlloc = MIN_ALLOCATE;
  const maxAlloc = currentScore;

  function scoreError(): string | null {
    if (!scoreInput) return null;
    if (isNaN(parseInt(scoreInput, 10)) || parseInt(scoreInput, 10) !== allocatedScore) return "정수를 입력해주세요.";
    if (allocatedScore < minAlloc) return `최소 ${minAlloc}점 이상 입력해주세요.`;
    if (allocatedScore > maxAlloc) return "보유 점수를 초과할 수 없습니다.";
    return null;
  }

  const inputErr = scoreError();
  const canSubmit = selectedOptionId && !inputErr && allocatedScore >= minAlloc && allocatedScore <= maxAlloc && agreed;

  if (questionStatus !== "OPEN") {
    const statusMsg: Record<string, string> = {
      PENDING_REVIEW: "운영자 검토 중인 문제입니다. 승인 후 참여할 수 있습니다.",
      CLOSED:         "참여가 마감된 예측입니다. 결과 확정을 기다리고 있어요.",
      RESOLVED:       "이미 결과가 확정된 예측입니다.",
      VOIDED:         "무효 처리된 예측입니다.",
      REJECTED:       "운영자가 반려한 예측입니다.",
      HIDDEN:         "현재 비공개 처리된 예측입니다.",
    };
    const msg = statusMsg[questionStatus] ?? "참여가 마감된 예측입니다.";
    return (
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-gray-50 p-6 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">{msg}</p>
      </div>
    );
  }

  if (!userStatus) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-gray-50 p-6 text-center space-y-3">
        <p className="text-sm text-[var(--color-text-secondary)]">베타 회원만 예측에 참여할 수 있습니다.</p>
        <a href="/login" className="inline-block rounded-xl bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90">로그인</a>
      </div>
    );
  }

  if (userStatus === "PENDING_BETA") {
    return (
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-gray-50 p-6 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">베타 승인 후 예측에 참여할 수 있습니다.</p>
        <a href="/pending" className="mt-2 inline-block text-xs text-[var(--color-accent-primary)] hover:underline">베타 신청 현황 확인</a>
      </div>
    );
  }

  if (userStatus === "SUSPENDED") {
    return (
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-gray-50 p-6 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">현재 이용이 제한되어 있습니다.</p>
      </div>
    );
  }

  if (hasParticipated && myParticipation) {
    return (
      <div className="rounded-2xl border border-[var(--color-accent-primary)]/30 bg-blue-50 p-6">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">내 예측</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">선택한 선택지</span>
            <span className="font-semibold text-[var(--color-accent-primary)]">{myParticipation.option.label}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">배분 점수</span>
            <span className="font-bold text-[var(--color-text-primary)]">{myParticipation.allocatedScore.toLocaleString()}점</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">참여 시점</span>
            <span className="text-[var(--color-text-tertiary)]">{new Date(myParticipation.createdAt).toLocaleString("ko-KR")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-[var(--color-text-secondary)]">결과 상태</span>
            <span className="text-[var(--color-text-tertiary)]">결과 대기</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--color-text-tertiary)]">이미 이 예측에 참여했습니다.</p>
      </div>
    );
  }

  if (currentScore < minAlloc) {
    return (
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-gray-50 p-6 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">보유 점수가 부족합니다. (최소 {minAlloc}점 필요)</p>
      </div>
    );
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/internal/predictions/${questionId}/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId: selectedOptionId, allocatedScore, memo: memo || undefined }),
      });
      const j = await res.json();
      if (!res.ok) { toast.error(j.error ?? "참여에 실패했습니다."); return; }
      toast.success("예측 참여가 완료되었습니다!");
      setShowModal(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 space-y-5">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">예측 참여</h3>

        <div className="space-y-2">
          <p className="text-xs text-[var(--color-text-secondary)] font-medium">선택지</p>
          {options.map((opt) => (
            <label key={opt.id} className={`flex items-center gap-3 cursor-pointer rounded-xl border p-3 transition-all ${selectedOptionId === opt.id ? "border-[var(--color-accent-primary)] bg-blue-50" : "border-[var(--color-border-default)] hover:border-[var(--color-accent-primary)]/40"}`}>
              <input type="radio" name="option" value={opt.id} checked={selectedOptionId === opt.id} onChange={() => setSelectedOptionId(opt.id)} className="accent-[var(--color-accent-primary)]" />
              <span className="text-sm font-medium text-[var(--color-text-primary)]">{opt.label}</span>
            </label>
          ))}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-[var(--color-text-secondary)] font-medium">배분 점수</p>
            <span className="text-xs text-[var(--color-text-tertiary)]">보유 {currentScore.toLocaleString()}점</span>
          </div>
          <input
            type="number"
            value={scoreInput}
            onChange={(e) => setScoreInput(e.target.value)}
            min={minAlloc}
            max={maxAlloc}
            placeholder={`최소 ${minAlloc}점`}
            className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
          />
          {inputErr && <p className="mt-1 text-xs text-red-500">{inputErr}</p>}
          {scoreInput && !inputErr && allocatedScore > 0 && (
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">보유 점수의 {scorePct}% ({allocatedScore.toLocaleString()}점)</p>
          )}
          <div className="mt-2 flex gap-1.5">
            {QUICK_PCTS.map(({ label, pct }) => (
              <button key={label} type="button" onClick={() => setScoreInput(String(Math.floor(currentScore * pct)))}
                className="flex-1 rounded-lg border border-[var(--color-border-default)] py-1 text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50 hover:text-[var(--color-accent-primary)] transition-colors">
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-[var(--color-text-secondary)] font-medium mb-1.5">근거 메모 <span className="text-[var(--color-text-tertiary)]">(선택, 최대 300자)</span></p>
          <textarea value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={300} rows={2}
            placeholder="예측의 근거를 간단히 메모해두세요. (본인만 확인 가능)"
            className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30" />
        </div>

        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-[var(--color-accent-primary)]" />
          <span className="text-xs text-[var(--color-text-secondary)]">배분한 점수는 결과 확정에 따라 성과 점수로 반영되거나 소진될 수 있으며, 점수는 서비스 내 랭킹과 통계 목적으로만 사용됩니다.</span>
        </label>

        <button
          disabled={!canSubmit}
          onClick={() => setShowModal(true)}
          className="w-full rounded-xl bg-[var(--color-accent-primary)] py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          예측 참여 확정
        </button>
      </div>

      {showModal && (
        <ParticipateConfirmModal
          questionTitle={questionTitle}
          optionLabel={options.find((o) => o.id === selectedOptionId)?.label ?? ""}
          allocatedScore={allocatedScore}
          currentScore={currentScore}
          resolvesAt={resolvesAt}
          loading={loading}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}
