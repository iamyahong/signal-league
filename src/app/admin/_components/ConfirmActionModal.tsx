"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { X } from "lucide-react";

interface ConfirmActionModalProps {
  title: string;
  description: string;
  preview?: React.ReactNode;
  requireReason?: boolean;
  reasonLabel?: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  onConfirm: (reason: string) => Promise<void>;
  onClose: () => void;
}

export function ConfirmActionModal({
  title,
  description,
  preview,
  requireReason = true,
  reasonLabel = "사유",
  confirmLabel = "확인",
  confirmVariant = "primary",
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    if (requireReason && !reason.trim()) {
      setError("사유를 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onConfirm(reason);
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
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">{title}</h3>
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{description}</p>

        {preview && (
          <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] p-3 mb-4 text-sm">
            {preview}
          </div>
        )}

        {requireReason && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{reasonLabel} *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="사유를 입력해 주세요."
              className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--color-accent-primary)]"
            />
          </div>
        )}

        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>취소</Button>
          <Button
            variant={confirmVariant === "danger" ? "ghost" : "primary"}
            size="sm"
            onClick={handleConfirm}
            disabled={loading}
            className={confirmVariant === "danger" ? "bg-red-600 text-white hover:bg-red-700" : ""}
          >
            {loading ? "처리 중..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
