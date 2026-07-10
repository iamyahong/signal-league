"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  reportId: string;
  targetType: string;
}

const RESOLUTION_OPTIONS = [
  { value: "ACCEPTED",        label: "수락 — 신고 내용이 사실이며 조치를 취합니다" },
  { value: "DISMISSED",       label: "기각 — 신고 내용이 위반에 해당하지 않습니다" },
  { value: "NEEDS_MORE_INFO", label: "추가 검토 — 더 많은 정보가 필요합니다" },
];

export function ProcessReportForm({ reportId, targetType }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [resolution, setResolution] = useState<"ACCEPTED" | "DISMISSED" | "NEEDS_MORE_INFO">("DISMISSED");
  const [processingReason, setProcessingReason] = useState("");
  const [userVisibleMessage, setUserVisibleMessage] = useState("");
  const [notifyReporter, setNotifyReporter] = useState(false);
  const [notifyReportedUser, setNotifyReportedUser] = useState(false);

  const [deleteComment, setDeleteComment] = useState(false);
  const [hideQuestion, setHideQuestion] = useState(false);
  const [warnUser, setWarnUser] = useState(false);
  const [suspendUser, setSuspendUser] = useState(false);

  function submit() {
    if (!processingReason.trim()) {
      toast.error("처리 사유를 입력해주세요.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/internal/admin/reports/${reportId}/process`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolution,
          processingReason,
          userVisibleResolutionMessage: userVisibleMessage || undefined,
          notifyReporter,
          notifyReportedUser,
          followUpActions: {
            deleteComment,
            hideQuestion,
            warnUser,
            suspendUser,
          },
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("신고가 처리되었습니다.");
        router.refresh();
      } else {
        toast.error(data.error ?? "처리 중 오류가 발생했습니다.");
      }
    });
  }

  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">신고 처리</h2>

      <div className="space-y-4">
        {/* Resolution */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            처리 결과 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {RESOLUTION_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="resolution"
                  value={opt.value}
                  checked={resolution === opt.value}
                  onChange={() => setResolution(opt.value as typeof resolution)}
                  className="mt-0.5 accent-[var(--color-accent-primary)]"
                />
                <span className="text-sm text-[var(--color-text-primary)]">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Follow-up actions */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            후속 조치
            <span className="text-[var(--color-text-tertiary)] font-normal ml-1">(같은 트랜잭션 내 자동 실행)</span>
          </label>
          <div className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-3 bg-gray-50">
            {targetType === "COMMENT" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteComment}
                  onChange={(e) => setDeleteComment(e.target.checked)}
                  className="accent-red-600"
                />
                <span className="text-sm text-[var(--color-text-primary)]">댓글 강제 삭제</span>
              </label>
            )}
            {targetType === "QUESTION" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideQuestion}
                  onChange={(e) => setHideQuestion(e.target.checked)}
                  className="accent-amber-600"
                />
                <span className="text-sm text-[var(--color-text-primary)]">예측 문제 숨김 처리</span>
              </label>
            )}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={warnUser}
                onChange={(e) => setWarnUser(e.target.checked)}
                className="accent-amber-600"
              />
              <span className="text-sm text-[var(--color-text-primary)]">경고 알림 발송</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={suspendUser}
                onChange={(e) => setSuspendUser(e.target.checked)}
                className="accent-red-600"
              />
              <span className="text-sm text-red-600 font-medium">계정 정지</span>
            </label>
          </div>
        </div>

        {/* Processing reason */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
            처리 사유 <span className="text-red-500">*</span>
            <span className="text-[var(--color-text-tertiary)] font-normal ml-1">(내부용)</span>
          </label>
          <textarea
            value={processingReason}
            onChange={(e) => setProcessingReason(e.target.value)}
            rows={3}
            className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] px-3 py-2 text-sm resize-none"
            placeholder="처리 근거를 명확히 기록합니다."
          />
        </div>

        {/* User visible message */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
            사용자 표시 메시지
            <span className="text-[var(--color-text-tertiary)] font-normal ml-1">(선택 — 알림 본문에 사용)</span>
          </label>
          <textarea
            value={userVisibleMessage}
            onChange={(e) => setUserVisibleMessage(e.target.value)}
            rows={2}
            className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] px-3 py-2 text-sm resize-none"
            placeholder="신고자나 피신고자에게 표시될 메시지"
          />
        </div>

        {/* Notify */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyReporter}
              onChange={(e) => setNotifyReporter(e.target.checked)}
              className="accent-[var(--color-accent-primary)]"
            />
            <span className="text-sm text-[var(--color-text-primary)]">신고자에게 처리 결과 알림 전송 (REPORT_RESOLVED)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyReportedUser}
              onChange={(e) => setNotifyReportedUser(e.target.checked)}
              className="accent-[var(--color-accent-primary)]"
            />
            <span className="text-sm text-[var(--color-text-primary)]">피신고자에게 처리 결과 알림 전송 (REPORT_PROCESSED)</span>
          </label>
        </div>

        <div className="pt-2 flex gap-2">
          <button
            onClick={submit}
            disabled={isPending || !processingReason.trim()}
            className={`px-5 py-2 text-sm font-semibold rounded-[var(--radius-lg)] text-white transition-colors disabled:opacity-50 ${
              resolution === "ACCEPTED"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : resolution === "DISMISSED"
                  ? "bg-gray-600 hover:bg-gray-700"
                  : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {isPending ? "처리 중..." : "처리 완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
