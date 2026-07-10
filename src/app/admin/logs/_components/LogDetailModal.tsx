"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AuditLogRow {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  before: unknown;
  after: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: { id: string; nickname: string; email: string } | null;
}

interface Props {
  log: AuditLogRow;
  onClose: () => void;
}

function JsonBlock({ value, label }: { value: unknown; label: string }) {
  if (value === null || value === undefined) {
    return (
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">{label}</p>
        <div className="bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] p-3 text-xs text-[var(--color-text-tertiary)]">
          (없음)
        </div>
      </div>
    );
  }

  const formatted = JSON.stringify(value, null, 2);

  return (
    <div>
      <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">{label}</p>
      <pre className="bg-[var(--color-surface-muted)] rounded-[var(--radius-lg)] p-3 text-xs text-[var(--color-text-primary)] overflow-auto max-h-64 whitespace-pre-wrap break-all leading-relaxed">
        {formatted}
      </pre>
    </div>
  );
}

export function LogDetailModal({ log, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-default)]">
          <div>
            <h2 className="font-bold text-[var(--color-text-primary)]">감사 로그 상세</h2>
            <p className="text-xs text-[var(--color-text-tertiary)] font-mono mt-0.5">{log.id}</p>
          </div>
          <Button variant="ghost" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">작업</p>
              <span className="font-mono text-sm bg-[var(--color-surface-muted)] px-2 py-1 rounded text-[var(--color-text-primary)]">
                {log.action}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">시간</p>
              <p className="text-sm text-[var(--color-text-primary)]">
                {new Date(log.createdAt).toLocaleString("ko-KR")}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">액터</p>
              {log.actor ? (
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{log.actor.nickname}</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">{log.actor.email}</p>
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-tertiary)]">시스템</p>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">대상</p>
              <p className="text-sm text-[var(--color-text-primary)]">
                {log.targetType ?? "—"}
                {log.targetId && (
                  <span className="text-xs text-[var(--color-text-tertiary)] ml-1 font-mono">
                    #{log.targetId.slice(0, 12)}
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">IP 주소</p>
              <p className="text-sm font-mono text-[var(--color-text-primary)]">{log.ipAddress ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">User-Agent</p>
              <p className="text-xs text-[var(--color-text-secondary)] break-all leading-relaxed">
                {log.userAgent ?? "—"}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <JsonBlock value={log.before} label="변경 전 (Before)" />
            <JsonBlock value={log.after} label="변경 후 (After)" />
          </div>
        </div>
      </div>
    </div>
  );
}
