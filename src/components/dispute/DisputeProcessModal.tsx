"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

type Decision = "ACCEPTED" | "REJECTED" | "NEEDS_MORE_INFO";
type ResultAction = "NONE" | "VOIDED";

interface DisputeProcessModalProps {
  disputeId: string;
  questionStatus: string;
  onClose: () => void;
}

export function DisputeProcessModal({ disputeId, questionStatus, onClose }: DisputeProcessModalProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<Decision>("REJECTED");
  const [processingReason, setProcessingReason] = useState("");
  const [userVisibleResolutionMessage, setUserVisibleResolutionMessage] = useState("");
  const [resultAction, setResultAction] = useState<ResultAction>("NONE");
  const [refundCreatorCost, setRefundCreatorCost] = useState(false);
  const [notifyOtherDisputers, setNotifyOtherDisputers] = useState(false);
  const [loading, setLoading] = useState(false);

  const canVoid = questionStatus === "RESOLVED";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!processingReason.trim()) { toast.error("처리 사유를 입력해주세요."); return; }
    if (!userVisibleResolutionMessage.trim()) { toast.error("사용자 표시 메시지를 입력해주세요."); return; }

    setLoading(true);
    try {
      const res = await fetch(`/internal/admin/disputes/${disputeId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          processingReason,
          userVisibleResolutionMessage,
          resultAction: decision === "ACCEPTED" ? resultAction : "NONE",
          refundCreatorCost: decision === "ACCEPTED" && resultAction === "VOIDED" ? refundCreatorCost : false,
          notifyOtherDisputers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
      toast.success("이의제기가 처리되었습니다.");
      onClose();
      router.refresh();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const DECISION_LABELS: Record<Decision, string> = {
    ACCEPTED: "수락",
    REJECTED: "기각",
    NEEDS_MORE_INFO: "추가 검토 요청",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="p-6">
          <h2 className="text-lg font-bold text-[var(--color-text-primary)] mb-4">이의제기 처리</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">처리 결과 <span className="text-red-500">*</span></p>
              <div className="flex gap-2 flex-wrap">
                {(["ACCEPTED", "REJECTED", "NEEDS_MORE_INFO"] as Decision[]).map((d) => (
                  <label key={d} className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border cursor-pointer text-sm transition-colors ${decision === d ? "border-[var(--color-accent-primary)] bg-blue-50 text-[var(--color-accent-primary)]" : "border-[var(--color-border-default)] text-[var(--color-text-secondary)]"}`}>
                    <input type="radio" name="decision" value={d} checked={decision === d} onChange={() => setDecision(d)} className="sr-only" />
                    {DECISION_LABELS[d]}
                  </label>
                ))}
              </div>
            </div>

            {decision === "ACCEPTED" && (
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">결과 액션 <span className="text-red-500">*</span></p>
                <div className="flex gap-2">
                  {(["NONE", "VOIDED"] as ResultAction[]).map((a) => (
                    <label key={a} className={`flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border cursor-pointer text-sm transition-colors ${resultAction === a ? "border-amber-500 bg-amber-50 text-amber-700" : "border-[var(--color-border-default)] text-[var(--color-text-secondary)]"} ${a === "VOIDED" && !canVoid ? "opacity-40 cursor-not-allowed" : ""}`}>
                      <input type="radio" name="resultAction" value={a} checked={resultAction === a} onChange={() => setResultAction(a)} disabled={a === "VOIDED" && !canVoid} className="sr-only" />
                      {a === "NONE" ? "기존 결과 유지" : "무효 처리 진행"}
                    </label>
                  ))}
                </div>
                {!canVoid && <p className="text-xs text-[var(--color-text-tertiary)] mt-1">RESOLVED 상태에서만 무효 처리 가능합니다.</p>}
              </div>
            )}

            {decision === "ACCEPTED" && resultAction === "VOIDED" && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={refundCreatorCost} onChange={(e) => setRefundCreatorCost(e.target.checked)} className="mt-0.5 h-4 w-4" />
                <span className="text-sm text-[var(--color-text-secondary)]">작성자 생성 비용 환불</span>
              </label>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                처리 사유 (내부용) <span className="text-red-500">*</span>
              </label>
              <textarea
                value={processingReason}
                onChange={(e) => setProcessingReason(e.target.value)}
                rows={3}
                placeholder="운영 기록에 남길 처리 사유를 입력해주세요."
                className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)] resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                이의제기자에게 표시할 메시지 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={userVisibleResolutionMessage}
                onChange={(e) => setUserVisibleResolutionMessage(e.target.value)}
                rows={3}
                placeholder="이의제기 신청자에게 보여질 안내 메시지를 입력해주세요."
                className="w-full border border-[var(--color-border-default)] rounded-[var(--radius-md)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--color-accent-primary)] resize-none"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={notifyOtherDisputers} onChange={(e) => setNotifyOtherDisputers(e.target.checked)} className="mt-0.5 h-4 w-4" />
              <span className="text-sm text-[var(--color-text-secondary)]">같은 문제의 다른 이의제기자에게도 처리 결과 알림 발송</span>
            </label>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">취소</Button>
              <Button type="submit" disabled={loading || !processingReason.trim() || !userVisibleResolutionMessage.trim()} className="flex-1">
                {loading ? "처리 중..." : "처리 완료"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
