"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface Option {
  id: string;
  label: string;
  participantCount: number;
  totalAllocated: number;
}

interface ResolveModalProps {
  questionId: string;
  questionTitle: string;
  totalParticipants: number;
  totalAllocated: number;
  creatorCost: number;
  closesAt: string | null;
  options: Option[];
  onClose: () => void;
  onSuccess: () => void;
}

interface Preview {
  winners: { count: number; totalAllocated: number; totalRefund: number };
  losers: { count: number; totalAllocated: number };
}

export function ResolveModal({
  questionId,
  questionTitle,
  totalParticipants,
  totalAllocated,
  options,
  onClose,
  onSuccess,
}: ResolveModalProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [resolutionMemo, setResolutionMemo] = useState("");
  const [resolutionEvidenceUrl, setResolutionEvidenceUrl] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function fetchPreview(optionId: string) {
    setLoadingPreview(true);
    try {
      const res = await fetch(
        `/internal/admin/predictions/${questionId}/resolve/preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correctOptionId: optionId }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        setPreview(data);
      }
    } finally {
      setLoadingPreview(false);
    }
  }

  function handleOptionSelect(optionId: string) {
    setSelectedOptionId(optionId);
    fetchPreview(optionId);
  }

  async function handleSubmit() {
    if (!selectedOptionId) { toast.error("정답 선택지를 선택해주세요."); return; }
    if (!resolutionMemo.trim()) { toast.error("결과 메모를 입력해주세요."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/internal/admin/predictions/${questionId}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            correctOptionId: selectedOptionId,
            resolutionMemo: resolutionMemo.trim(),
            resolutionEvidenceUrl: resolutionEvidenceUrl.trim() || undefined,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "오류가 발생했습니다.");
      }
      toast.success("결과가 확정되었습니다.");
      onSuccess();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[var(--color-border-default)]">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">예측 결과 확정</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">{questionTitle}</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[var(--color-text-tertiary)] text-xs mb-0.5">총 참여자</p>
              <p className="font-bold text-[var(--color-text-primary)]">{totalParticipants.toLocaleString()}명</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[var(--color-text-tertiary)] text-xs mb-0.5">총 배분 점수</p>
              <p className="font-bold text-[var(--color-text-primary)]">{totalAllocated.toLocaleString()}점</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
              정답 선택지 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleOptionSelect(opt.id)}
                  className={`w-full text-left rounded-xl border p-3 transition-all ${
                    selectedOptionId === opt.id
                      ? "border-[var(--color-accent-primary)] bg-blue-50"
                      : "border-[var(--color-border-default)] hover:border-[var(--color-accent-primary)]/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                        selectedOptionId === opt.id ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]" : "border-gray-300"
                      }`} />
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{opt.label}</span>
                    </div>
                    <span className="text-xs text-[var(--color-text-secondary)]">
                      {opt.participantCount}명 · {opt.totalAllocated.toLocaleString()}점
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedOptionId && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm space-y-1.5">
              <p className="font-semibold text-blue-800 text-xs uppercase tracking-wide mb-2">점수 반영 미리보기</p>
              {loadingPreview ? (
                <p className="text-[var(--color-text-tertiary)]">계산 중...</p>
              ) : preview ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-green-700">적중 ({preview.winners.count}명)</span>
                    <span className="font-semibold text-green-700">+{preview.winners.totalRefund.toLocaleString()}점 환원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--color-text-secondary)]">비적중 ({preview.losers.count}명)</span>
                    <span className="text-[var(--color-text-secondary)]">{preview.losers.totalAllocated.toLocaleString()}점 소진 (이미 차감됨)</span>
                  </div>
                </>
              ) : null}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-1">
              결과 근거 URL <span className="text-[var(--color-text-tertiary)]">(선택)</span>
            </label>
            <input
              type="url"
              value={resolutionEvidenceUrl}
              onChange={(e) => setResolutionEvidenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-1">
              결과 메모 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={resolutionMemo}
              onChange={(e) => setResolutionMemo(e.target.value)}
              rows={3}
              placeholder="결과 확정 근거를 간략히 작성해주세요. 예: '공식 발표 기준으로 확인됨.'"
              className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)] resize-none"
            />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            결과 확정은 되돌릴 수 없습니다. 확정 후 이의제기를 받을 수 있습니다.
          </div>
        </div>

        <div className="p-6 border-t border-[var(--color-border-default)] flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>취소</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={submitting || !selectedOptionId || !resolutionMemo.trim()}>
            {submitting ? "처리 중..." : "결과 확정"}
          </Button>
        </div>
      </div>
    </div>
  );
}
