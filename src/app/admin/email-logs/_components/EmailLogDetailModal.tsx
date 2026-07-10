"use client";

import { X, ShieldOff, ShieldCheck, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import type { EmailLogRow } from "./EmailLogsClient";
import { Button } from "@/components/ui/Button";

interface Props {
  log: EmailLogRow;
  onClose: () => void;
}

interface UserBlockStatus {
  id: string;
  email: string;
  nickname: string;
  emailBlocked: boolean;
  emailBlockedAt: string | null;
  emailBlockedReason: string | null;
  softBounceCount: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "대기", SENT: "발송됨", DELIVERED: "도달", FAILED: "실패",
  BOUNCED: "반송", COMPLAINED: "스팸신고", BLOCKED: "차단됨",
};

const BLOCK_REASON_LABELS: Record<string, string> = {
  HARD_BOUNCE: "하드 반송",
  SOFT_BOUNCE_LIMIT: "소프트 반송 누적 5회",
  COMPLAINT: "스팸 신고",
  MANUAL: "수동 차단",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2 border-b border-[var(--color-border-default)] last:border-0">
      <span className="w-28 shrink-0 text-xs text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-xs text-[var(--color-text-primary)] break-all">{value ?? "-"}</span>
    </div>
  );
}

function formatKST(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

export function EmailLogDetailModal({ log, onClose }: Props) {
  const [userBlock, setUserBlock] = useState<UserBlockStatus | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [unblocking, setUnblocking] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unblockReason, setUnblockReason] = useState("");
  const [unblockDone, setUnblockDone] = useState(false);

  const fetchBlockStatus = useCallback(async () => {
    if (!log.userId) return;
    setBlockLoading(true);
    try {
      const res = await fetch(`/internal/admin/users/${log.userId}/block-status`);
      if (res.ok) setUserBlock(await res.json());
    } finally {
      setBlockLoading(false);
    }
  }, [log.userId]);

  useEffect(() => { fetchBlockStatus(); }, [fetchBlockStatus]);

  const handleUnblock = async () => {
    if (!log.userId) return;
    setUnblocking(true);
    try {
      const res = await fetch(`/internal/admin/users/${log.userId}/unblock-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: unblockReason || null }),
      });
      if (res.ok) {
        setUnblockDone(true);
        setConfirmOpen(false);
        await fetchBlockStatus();
      }
    } finally {
      setUnblocking(false);
    }
  };

  const timeline = [
    { label: "생성", time: formatKST(log.createdAt) },
    { label: "발송됨", time: formatKST(log.sentAt) },
    { label: "도달", time: formatKST(log.deliveredAt) },
    { label: "반송", time: formatKST(log.bouncedAt) },
    { label: "스팸신고", time: formatKST(log.complainedAt) },
  ].filter((t) => t.time !== null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border-default)]">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">이메일 발송 상세</h2>
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-0">
          <Row label="ID" value={<span className="font-mono text-[10px]">{log.id}</span>} />
          <Row label="종류" value={<span className="font-mono">{log.type}</span>} />
          <Row label="수신자" value={log.toEmail} />
          <Row label="제목" value={log.subject} />
          <Row label="상태" value={STATUS_LABELS[log.status] ?? log.status} />
          <Row label="Resend ID" value={log.resendId ? <span className="font-mono text-[10px] break-all">{log.resendId}</span> : null} />
          <Row label="오류 메시지" value={log.errorMsg} />
        </div>

        {/* 타임라인 */}
        <div className="px-5 pb-4">
          <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2 mt-1">타임라인</div>
          {timeline.length === 0 ? (
            <p className="text-xs text-[var(--color-text-tertiary)]">기록된 타임라인이 없습니다.</p>
          ) : (
            <div className="space-y-1.5">
              {timeline.map((t) => (
                <div key={t.label} className="flex items-center gap-3 text-xs">
                  <span className="w-16 shrink-0 text-[var(--color-text-secondary)]">{t.label}</span>
                  <span className="text-[var(--color-text-primary)]">{t.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* meta */}
        {log.meta && Object.keys(log.meta).length > 0 && (
          <div className="px-5 pb-4">
            <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">메타 데이터</div>
            <pre className="bg-[var(--color-surface-muted)] rounded-[var(--radius-md)] px-3 py-2 text-[10px] font-mono overflow-x-auto text-[var(--color-text-primary)]">
              {JSON.stringify(log.meta, null, 2)}
            </pre>
          </div>
        )}

        {/* 사용자 차단 상태 */}
        {log.userId && (
          <div className="px-5 pb-5">
            <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-2">사용자 정보</div>
            {blockLoading ? (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                <Loader2 className="h-3 w-3 animate-spin" /> 불러오는 중...
              </div>
            ) : userBlock ? (
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-muted)] p-3 space-y-1.5">
                <div className="flex gap-3 text-xs">
                  <span className="w-24 shrink-0 text-[var(--color-text-secondary)]">이메일</span>
                  <span className="text-[var(--color-text-primary)]">{userBlock.email}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="w-24 shrink-0 text-[var(--color-text-secondary)]">닉네임</span>
                  <span className="text-[var(--color-text-primary)]">{userBlock.nickname}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="w-24 shrink-0 text-[var(--color-text-secondary)]">차단 상태</span>
                  {userBlock.emailBlocked ? (
                    <span className="flex items-center gap-1 text-red-600 font-medium">
                      <ShieldOff className="h-3 w-3" /> 차단됨
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600">
                      <ShieldCheck className="h-3 w-3" /> 정상
                    </span>
                  )}
                </div>
                {userBlock.emailBlocked && (
                  <>
                    <div className="flex gap-3 text-xs">
                      <span className="w-24 shrink-0 text-[var(--color-text-secondary)]">차단 사유</span>
                      <span className="text-[var(--color-text-primary)]">
                        {BLOCK_REASON_LABELS[userBlock.emailBlockedReason ?? ""] ?? userBlock.emailBlockedReason ?? "-"}
                      </span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <span className="w-24 shrink-0 text-[var(--color-text-secondary)]">차단 시각</span>
                      <span className="text-[var(--color-text-primary)]">{formatKST(userBlock.emailBlockedAt) ?? "-"}</span>
                    </div>
                  </>
                )}
                <div className="flex gap-3 text-xs">
                  <span className="w-24 shrink-0 text-[var(--color-text-secondary)]">소프트 반송</span>
                  <span className="text-[var(--color-text-primary)]">{userBlock.softBounceCount}회</span>
                </div>

                {userBlock.emailBlocked && !unblockDone && (
                  <div className="pt-2">
                    {!confirmOpen ? (
                      <Button
                        variant="secondary"
                        onClick={() => setConfirmOpen(true)}
                        className="text-xs h-8 gap-1.5"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        재활성화
                      </Button>
                    ) : (
                      <div className="space-y-2 mt-1">
                        <p className="text-xs text-[var(--color-text-secondary)]">
                          이 사용자의 이메일 차단을 해제하시겠습니까?<br />
                          <span className="text-[var(--color-text-tertiary)]">해제 후 재 반송 발생 시 자동으로 다시 차단됩니다.</span>
                        </p>
                        <textarea
                          value={unblockReason}
                          onChange={(e) => setUnblockReason(e.target.value)}
                          placeholder="사유 입력 (선택)"
                          rows={2}
                          className="w-full text-xs rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            onClick={handleUnblock}
                            disabled={unblocking}
                            className="text-xs h-8 gap-1.5"
                          >
                            {unblocking ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                            재활성화 확인
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => { setConfirmOpen(false); setUnblockReason(""); }}
                            className="text-xs h-8"
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {unblockDone && (
                  <p className="text-xs text-green-600 pt-1">✓ 차단이 해제되었습니다.</p>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
