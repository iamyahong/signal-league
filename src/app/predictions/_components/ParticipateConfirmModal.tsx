"use client";

import { AlertTriangle } from "lucide-react";

interface ParticipateConfirmModalProps {
  questionTitle: string;
  optionLabel: string;
  allocatedScore: number;
  currentScore: number;
  resolvesAt: Date | string | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ParticipateConfirmModal({
  questionTitle, optionLabel, allocatedScore, currentScore, resolvesAt, loading, onConfirm, onCancel,
}: ParticipateConfirmModalProps) {
  const afterScore = currentScore - allocatedScore;
  const resolvesDate = resolvesAt ? new Date(resolvesAt).toLocaleDateString("ko-KR") : "미정";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">예측 참여 확정</h2>

        <div className="space-y-3 mb-5">
          <div className="rounded-xl bg-gray-50 p-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">문제</span>
              <span className="font-medium text-[var(--color-text-primary)] text-right max-w-[220px] line-clamp-2">{questionTitle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">선택지</span>
              <span className="font-semibold text-[var(--color-accent-primary)]">{optionLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">배분 점수</span>
              <span className="font-bold text-[var(--color-text-primary)]">{allocatedScore.toLocaleString()}점</span>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--color-border-default)] p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">현재 보유 점수</span>
              <span className="font-medium">{currentScore.toLocaleString()}점</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">참여 후 보유 점수</span>
              <span className="font-bold text-[var(--color-accent-primary)]">{afterScore.toLocaleString()}점</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">결과 확정 예정일</span>
              <span className="font-medium">{resolvesDate}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">선택한 예측과 배분 점수는 참여 후 변경할 수 없습니다.</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading} className="flex-1 rounded-xl border border-[var(--color-border-default)] py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50 disabled:opacity-50">
            취소
          </button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 rounded-xl bg-[var(--color-accent-primary)] py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
            {loading ? "처리 중..." : "참여 확정"}
          </button>
        </div>
      </div>
    </div>
  );
}
