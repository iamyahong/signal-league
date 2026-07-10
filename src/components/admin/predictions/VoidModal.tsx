"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface VoidModalProps {
  questionId: string;
  questionTitle: string;
  totalParticipants: number;
  totalAllocated: number;
  creatorCost: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function VoidModal({
  questionId,
  questionTitle,
  totalParticipants,
  totalAllocated,
  creatorCost,
  onClose,
  onSuccess,
}: VoidModalProps) {
  const [voidReason, setVoidReason] = useState("");
  const [userVisibleMessage, setUserVisibleMessage] = useState("");
  const [refundCreatorCost, setRefundCreatorCost] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!voidReason.trim()) { toast.error("무효 사유를 입력해주세요."); return; }
    if (!userVisibleMessage.trim()) { toast.error("사용자 표시 메시지를 입력해주세요."); return; }
    if (refundCreatorCost === null) { toast.error("작성자 생성 비용 환불 여부를 선택해주세요."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/internal/admin/predictions/${questionId}/void`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            voidReason: voidReason.trim(),
            userVisibleMessage: userVisibleMessage.trim(),
            refundCreatorCost,
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "오류가 발생했습니다.");
      }
      toast.success("무효 처리가 완료되었습니다.");
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
          <h2 className="text-lg font-bold text-[var(--color-text-primary)]">예측 무효 처리</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 line-clamp-2">{questionTitle}</p>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[var(--color-text-tertiary)] text-xs mb-0.5">참여자</p>
              <p className="font-bold text-[var(--color-text-primary)]">{totalParticipants.toLocaleString()}명</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[var(--color-text-tertiary)] text-xs mb-0.5">총 배분</p>
              <p className="font-bold text-[var(--color-text-primary)]">{totalAllocated.toLocaleString()}점</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[var(--color-text-tertiary)] text-xs mb-0.5">생성 비용</p>
              <p className="font-bold text-[var(--color-text-primary)]">{creatorCost.toLocaleString()}점</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-1">
              무효 사유 (내부용) <span className="text-red-500">*</span>
            </label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={2}
              placeholder="운영 내부 확인용 사유를 작성해주세요."
              className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-1">
              참여자/작성자에게 표시할 메시지 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={userVisibleMessage}
              onChange={(e) => setUserVisibleMessage(e.target.value)}
              rows={2}
              placeholder="예: '결과 기준이 불명확하여 무효 처리되었습니다.'"
              className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-primary)] mb-2">
              작성자 생성 비용 환불 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setRefundCreatorCost(true)}
                className={`w-full text-left rounded-xl border p-3 transition-all flex items-center gap-2 ${
                  refundCreatorCost === true
                    ? "border-[var(--color-accent-primary)] bg-blue-50"
                    : "border-[var(--color-border-default)] hover:border-[var(--color-accent-primary)]/40"
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${refundCreatorCost === true ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)]" : "border-gray-300"}`} />
                <span className="text-sm">환불 — {creatorCost.toLocaleString()}점을 작성자에게 돌려줍니다</span>
              </button>
              <button
                type="button"
                onClick={() => setRefundCreatorCost(false)}
                className={`w-full text-left rounded-xl border p-3 transition-all flex items-center gap-2 ${
                  refundCreatorCost === false
                    ? "border-red-400 bg-red-50"
                    : "border-[var(--color-border-default)] hover:border-red-300"
                }`}
              >
                <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${refundCreatorCost === false ? "border-red-500 bg-red-500" : "border-gray-300"}`} />
                <span className="text-sm">미환불 — 작성자 책임 사유의 경우</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm space-y-1">
            <p className="font-semibold text-[var(--color-accent-primary)] text-xs uppercase tracking-wide mb-1.5">환불 미리보기</p>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">참여자 {totalParticipants}명</span>
              <span className="font-medium text-[var(--color-text-primary)]">→ 총 {totalAllocated.toLocaleString()}점 환불</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-[var(--color-text-secondary)]">작성자</span>
              <span className={refundCreatorCost === true ? "font-medium text-green-600" : refundCreatorCost === false ? "text-[var(--color-text-tertiary)]" : "text-[var(--color-text-tertiary)]"}>
                {refundCreatorCost === true ? `→ ${creatorCost.toLocaleString()}점 환불` : refundCreatorCost === false ? "→ 미환불" : "선택 전"}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            무효 처리는 되돌릴 수 없습니다.
          </div>
        </div>

        <div className="p-6 border-t border-[var(--color-border-default)] flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>취소</Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-orange-600 text-white hover:bg-orange-700"
            onClick={handleSubmit}
            disabled={submitting || !voidReason.trim() || !userVisibleMessage.trim() || refundCreatorCost === null}
          >
            {submitting ? "처리 중..." : "무효 처리 확정"}
          </Button>
        </div>
      </div>
    </div>
  );
}
