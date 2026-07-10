"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";
import { toast } from "sonner";

interface ScoreAdjustModalProps {
  userId: string;
  nickname: string;
  currentScore: number;
  direction: "add" | "subtract";
  onClose: () => void;
  onSuccess: () => void;
}

export function ScoreAdjustModal({ userId, nickname, currentScore, direction, onClose, onSuccess }: ScoreAdjustModalProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parsedAmount = parseInt(amount) || 0;
  const preview = direction === "add" ? currentScore + parsedAmount : currentScore - parsedAmount;

  const handleSubmit = async () => {
    if (!parsedAmount || parsedAmount <= 0) { setError("올바른 점수를 입력해 주세요."); return; }
    if (!reason.trim()) { setError("사유를 입력해 주세요."); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/internal/admin/users/${userId}/score-adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction, amount: parsedAmount, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
      toast.success(`점수 ${direction === "add" ? "지급" : "차감"} 완료`);
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
      <div className="relative bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            점수 {direction === "add" ? "지급" : "차감"} — {nickname}
          </h3>
          <button onClick={onClose}><X className="h-5 w-5 text-[var(--color-text-tertiary)]" /></button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">점수 *</label>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="예: 500"
            className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        {parsedAmount > 0 && (
          <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] p-3 mb-4 text-sm">
            <div className="flex justify-between text-[var(--color-text-secondary)]">
              <span>변경 전</span>
              <span className="font-medium">{currentScore.toLocaleString()}점</span>
            </div>
            <div className={`flex justify-between mt-1 font-semibold ${preview < 0 ? "text-red-600" : "text-[var(--color-accent-primary)]"}`}>
              <span>변경 후</span>
              <span>{preview.toLocaleString()}점</span>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">사유 *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="사유를 입력해 주세요."
            className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>취소</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={loading}>
            {loading ? "처리 중..." : `${direction === "add" ? "지급" : "차감"} 확인`}
          </Button>
        </div>
      </div>
    </div>
  );
}
