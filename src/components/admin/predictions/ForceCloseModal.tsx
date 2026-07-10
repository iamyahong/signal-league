"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, AlertTriangle } from "lucide-react";

interface ForceCloseModalProps {
  questionId: string;
  questionTitle: string;
  originalClosesAt: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ForceCloseModal({
  questionId,
  questionTitle,
  originalClosesAt,
  onClose,
  onSuccess,
}: ForceCloseModalProps) {
  const [forceCloseReason, setForceCloseReason] = useState("");
  const [userVisibleMessage, setUserVisibleMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!forceCloseReason.trim()) { setError("강제 마감 사유를 입력해 주세요."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/internal/admin/predictions/${questionId}/force-close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forceCloseReason: forceCloseReason.trim(),
          userVisibleMessage: userVisibleMessage.trim() || undefined,
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

  const formattedClose = originalClosesAt
    ? new Date(originalClosesAt).toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    : "미지정";

  const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">예측 문제 강제 마감</h3>
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] p-3 mb-4 text-sm space-y-1">
          <div><span className="text-[var(--color-text-secondary)]">문제:</span> <span className="font-medium">{questionTitle}</span></div>
          <div><span className="text-[var(--color-text-secondary)]">원래 마감 예정:</span> {formattedClose}</div>
          <div><span className="text-[var(--color-text-secondary)]">강제 마감 시점:</span> 지금 ({today})</div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">강제 마감 사유 *</label>
          <textarea
            value={forceCloseReason}
            onChange={(e) => setForceCloseReason(e.target.value)}
            rows={3}
            placeholder="강제 마감 사유를 입력해 주세요."
            className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">참여자에게 표시할 메시지 (선택)</label>
          <textarea
            value={userVisibleMessage}
            onChange={(e) => setUserVisibleMessage(e.target.value)}
            rows={2}
            placeholder="참여자에게 보여줄 안내 메시지를 입력해 주세요."
            className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] p-3 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            강제 마감 후에는 추가 참여를 받지 않습니다. 결과 확정은 별도로 진행됩니다.
          </p>
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>취소</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-orange-600 text-white hover:bg-orange-700"
          >
            {loading ? "처리 중..." : "강제 마감 확정"}
          </Button>
        </div>
      </div>
    </div>
  );
}
