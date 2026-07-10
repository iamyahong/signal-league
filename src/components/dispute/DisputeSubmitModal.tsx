"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface DisputeSubmitModalProps {
  questionId: string;
  questionTitle: string;
  onClose: () => void;
}

export function DisputeSubmitModal({ questionId, questionTitle, onClose }: DisputeSubmitModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (reason.length < 50 || reason.length > 500) {
      toast.error("이의제기 사유는 50자 이상 500자 이하로 입력해주세요.");
      return;
    }
    if (!agreed) {
      toast.error("안내 사항에 동의해주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/internal/predictions/${questionId}/disputes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, evidence: evidence || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
      toast.success("이의제기가 접수되었습니다. 운영자 검토 후 처리됩니다.");
      onClose();
      router.refresh();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-1">이의제기 제출</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4 line-clamp-2">"{questionTitle}"</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                이의제기 사유 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={5}
                placeholder="결과에 이의를 제기하는 구체적인 근거를 작성해주세요. (50~500자)"
                className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)] resize-none"
                maxLength={500}
              />
              <p className={`text-xs mt-1 text-right ${reason.length < 50 ? "text-red-400" : "text-[var(--color-text-tertiary)]"}`}>
                {reason.length}/500 ({reason.length < 50 ? `최소 ${50 - reason.length}자 더` : "충족"})
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                보강 자료 URL <span className="text-[var(--color-text-tertiary)] font-normal">(선택)</span>
              </label>
              <input
                type="url"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="https://..."
                className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)]"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[var(--color-border-default)] text-[var(--color-accent-primary)]"
              />
              <span className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                이의제기는 운영자 검토 후 처리되며, 무효 처리 결정 시 모든 참여자 점수가 환불됩니다.
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">
                취소
              </Button>
              <Button type="submit" disabled={loading || !agreed || reason.length < 50} className="flex-1">
                {loading ? "제출 중..." : "이의제기 제출"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
