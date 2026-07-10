"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

const QUESTION_REASONS = [
  { value: "MISINFORMATION",     label: "허위정보" },
  { value: "DEFAMATION",         label: "명예훼손" },
  { value: "HATE",               label: "혐오/비방" },
  { value: "ILLEGAL",            label: "불법행위 조장" },
  { value: "SPAM",               label: "스팸/광고" },
  { value: "SCORE_TRADE",        label: "점수 거래 유도" },
  { value: "AMBIGUOUS_CRITERIA", label: "결과 기준 모호" },
  { value: "OTHER",              label: "기타" },
] as const;

const COMMENT_REASONS = QUESTION_REASONS.filter((r) => r.value !== "AMBIGUOUS_CRITERIA");

interface ReportModalProps {
  targetType: "question" | "comment";
  targetId: string;
  onClose: () => void;
}

export function ReportModal({ targetType, targetId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(false);

  const reasons = targetType === "question" ? QUESTION_REASONS : COMMENT_REASONS;
  const endpoint = targetType === "question"
    ? `/internal/predictions/${targetId}/report`
    : `/internal/comments/${targetId}/report`;

  async function handleSubmit() {
    if (!reason) { toast.error("신고 사유를 선택해주세요."); return; }
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, detail: detail || undefined }),
      });
      if (!res.ok) {
        const j = await res.json();
        toast.error(j.error ?? "신고 접수에 실패했습니다.");
        return;
      }
      toast.success("신고가 접수되었습니다. 운영자가 검토 후 필요한 조치를 진행합니다.");
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">신고하기</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>

        <div className="space-y-2 mb-4">
          {reasons.map((r) => (
            <label key={r.value} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
              <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} className="accent-[var(--color-accent-primary)]" />
              <span className="text-sm text-[var(--color-text-primary)]">{r.label}</span>
            </label>
          ))}
        </div>

        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="상세 내용 (선택, 최대 500자)"
          className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30 mb-4"
        />

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[var(--color-border-default)] py-2 text-sm text-[var(--color-text-secondary)] hover:bg-gray-50">취소</button>
          <button
            onClick={handleSubmit}
            disabled={!reason || loading}
            className="flex-1 rounded-xl bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "접수 중..." : "신고 접수"}
          </button>
        </div>
      </div>
    </div>
  );
}
