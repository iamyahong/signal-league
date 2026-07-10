"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, AlertTriangle } from "lucide-react";

interface RejectModalProps {
  questionId: string;
  questionTitle: string;
  authorNickname: string;
  creatorCost: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectModal({
  questionId,
  questionTitle,
  authorNickname,
  creatorCost,
  onClose,
  onSuccess,
}: RejectModalProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [userVisibleRejectionMessage, setUserVisibleRejectionMessage] = useState("");
  const [refund, setRefund] = useState<boolean | null>(null);
  const [refundDecisionNote, setRefundDecisionNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!rejectionReason.trim()) { setError("반려 사유를 입력해 주세요."); return; }
    if (!userVisibleRejectionMessage.trim()) { setError("작성자 표시 메시지를 입력해 주세요."); return; }
    if (refund === null) { setError("생성 비용 반환 여부를 선택해 주세요."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/internal/admin/predictions/${questionId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rejectionReason: rejectionReason.trim(),
          userVisibleRejectionMessage: userVisibleRejectionMessage.trim(),
          refund,
          refundDecisionNote: refundDecisionNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
      onSuccess();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">예측 문제 반려</h3>
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] p-3 mb-4 text-sm space-y-1">
          <div><span className="text-[var(--color-text-secondary)]">문제:</span> <span className="font-medium">{questionTitle}</span></div>
          <div><span className="text-[var(--color-text-secondary)]">작성자:</span> {authorNickname}</div>
          <div><span className="text-[var(--color-text-secondary)]">생성 비용:</span> {creatorCost.toLocaleString()}점</div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">반려 사유 (운영 내부용) *</label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            rows={3}
            placeholder="내부 운영 사유를 입력해 주세요."
            className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">작성자에게 표시할 메시지 *</label>
          <textarea
            value={userVisibleRejectionMessage}
            onChange={(e) => setUserVisibleRejectionMessage(e.target.value)}
            rows={3}
            placeholder="작성자에게 보여줄 안내 메시지를 입력해 주세요."
            className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">생성 비용 반환 *</label>
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="refund"
                checked={refund === true}
                onChange={() => setRefund(true)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium">반환</span>
                <span className="text-[var(--color-text-secondary)]"> ({creatorCost.toLocaleString()}점을 작성자에게 돌려줍니다)</span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="refund"
                checked={refund === false}
                onChange={() => setRefund(false)}
                className="mt-0.5"
              />
              <span className="text-sm">
                <span className="font-medium">미반환</span>
                <span className="text-[var(--color-text-secondary)]"> (생성 비용을 반환하지 않습니다)</span>
              </span>
            </label>
          </div>
          <div className="mt-2 text-xs text-[var(--color-text-tertiary)] leading-relaxed">
            <span className="font-medium text-[var(--color-text-secondary)]">반환:</span> 결과 기준이 모호하거나 표현 보완으로 재작성 유도가 적절한 경우<br />
            <span className="font-medium text-[var(--color-text-secondary)]">미반환:</span> 허위·혐오·스팸 등 명백히 부적절한 경우
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">반환/미반환 선택 사유 (선택)</label>
          <textarea
            value={refundDecisionNote}
            onChange={(e) => setRefundDecisionNote(e.target.value)}
            rows={2}
            placeholder="결정 근거를 메모해 두세요."
            className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] p-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">반려는 되돌릴 수 없습니다.</p>
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>취소</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {loading ? "처리 중..." : "반려 확정"}
          </Button>
        </div>
      </div>
    </div>
  );
}
