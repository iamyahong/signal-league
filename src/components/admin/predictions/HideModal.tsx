"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X, AlertTriangle } from "lucide-react";

interface HideModalProps {
  questionId: string;
  questionTitle: string;
  currentStatus: string;
  participantCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function HideModal({
  questionId,
  questionTitle,
  currentStatus,
  participantCount,
  onClose,
  onSuccess,
}: HideModalProps) {
  const [hiddenReason, setHiddenReason] = useState("");
  const [userVisibleMessage, setUserVisibleMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (!hiddenReason.trim()) { setError("숨김 사유를 입력해 주세요."); return; }
    if (!userVisibleMessage.trim()) { setError("참여자 표시 메시지를 입력해 주세요."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/internal/admin/predictions/${questionId}/hide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hiddenReason: hiddenReason.trim(),
          userVisibleMessage: userVisibleMessage.trim(),
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
      <div className="relative bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-md p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">예측 문제 숨김 처리</h3>
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] p-3 mb-4 text-sm space-y-1">
          <div><span className="text-[var(--color-text-secondary)]">문제:</span> <span className="font-medium">{questionTitle}</span></div>
          <div><span className="text-[var(--color-text-secondary)]">현재 상태:</span> {currentStatus}</div>
          <div><span className="text-[var(--color-text-secondary)]">현재 참여자:</span> {participantCount.toLocaleString()}명</div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">숨김 사유 (운영 내부용) *</label>
          <textarea
            value={hiddenReason}
            onChange={(e) => setHiddenReason(e.target.value)}
            rows={3}
            placeholder="내부 숨김 사유를 입력해 주세요."
            className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">참여자에게 표시할 메시지 *</label>
          <textarea
            value={userVisibleMessage}
            onChange={(e) => setUserVisibleMessage(e.target.value)}
            rows={3}
            placeholder="참여자에게 보여줄 안내 메시지를 입력해 주세요."
            className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        {participantCount > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] p-3 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              {participantCount.toLocaleString()}명이 이미 참여했습니다. 숨김 처리해도 참여자의 배분 점수는 그대로 유지됩니다. 점수 반환이 필요하면 &quot;무효 처리&quot;(다음 단계에서 추가 예정)를 사용해 주세요.
            </p>
          </div>
        )}

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>취소</Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className="bg-gray-700 text-white hover:bg-gray-800"
          >
            {loading ? "처리 중..." : "숨김 확정"}
          </Button>
        </div>
      </div>
    </div>
  );
}
