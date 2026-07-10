"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

interface ApproveModalProps {
  questionId: string;
  questionTitle: string;
  authorNickname: string;
  categoryName: string;
  creatorCost: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApproveModal({
  questionId,
  questionTitle,
  authorNickname,
  categoryName,
  creatorCost,
  onClose,
  onSuccess,
}: ApproveModalProps) {
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/internal/admin/predictions/${questionId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memo: memo.trim() || undefined }),
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
      <div className="relative bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">예측 문제 승인</h3>
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] p-3 mb-4 text-sm space-y-1">
          <div><span className="text-[var(--color-text-secondary)]">문제:</span> <span className="font-medium">{questionTitle}</span></div>
          <div><span className="text-[var(--color-text-secondary)]">작성자:</span> {authorNickname}</div>
          <div><span className="text-[var(--color-text-secondary)]">카테고리:</span> {categoryName}</div>
          <div><span className="text-[var(--color-text-secondary)]">생성 비용:</span> {creatorCost.toLocaleString()}점</div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">운영자 메모 (선택)</label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={2}
            placeholder="내부 메모를 입력해 주세요."
            className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        <p className="text-xs text-[var(--color-text-secondary)] mb-4">
          이 문제를 공개합니다. 회원들이 예측에 참여할 수 있게 됩니다.
        </p>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>취소</Button>
          <Button variant="primary" size="sm" onClick={handleConfirm} disabled={loading}>
            {loading ? "처리 중..." : "승인 확정"}
          </Button>
        </div>
      </div>
    </div>
  );
}
