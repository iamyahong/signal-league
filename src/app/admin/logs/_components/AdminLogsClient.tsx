"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Eye, Activity, Calendar, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { LogDetailModal } from "./LogDetailModal";

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
  logs: AuditLogRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  kpi: { todayCount: number; weekCount: number; topActions: { action: string; count: number }[] };
  filters: {
    action?: string;
    actorId?: string;
    targetType?: string;
    dateFrom?: string;
    dateTo?: string;
    ipAddress?: string;
  };
}

export function AdminLogsClient({ logs, pagination, kpi, filters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

  const [localFilters, setLocalFilters] = useState({
    action: filters.action ?? "",
    targetType: filters.targetType ?? "",
    dateFrom: filters.dateFrom ?? "",
    dateTo: filters.dateTo ?? "",
    ipAddress: filters.ipAddress ?? "",
  });

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("page", "1");
    Object.entries(localFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    startTransition(() => router.push(`/admin/logs?${params}`));
  };

  const clearFilters = () => {
    setLocalFilters({ action: "", targetType: "", dateFrom: "", dateTo: "", ipAddress: "" });
    startTransition(() => router.push("/admin/logs"));
  };

  const goPage = (p: number) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("page", String(p));
    startTransition(() => router.push(`/admin/logs?${params}`));
  };

  const hasFilters = Object.values(localFilters).some(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">감사 로그</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">관리자 작업 이력</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-[var(--color-accent-primary)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">오늘</span>
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">{kpi.todayCount.toLocaleString()}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-[var(--color-text-secondary)]">7일</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{kpi.weekCount.toLocaleString()}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-[var(--color-text-secondary)]">주요 작업 (7일)</span>
          </div>
          <div className="space-y-1">
            {kpi.topActions.map((a) => (
              <div key={a.action} className="flex items-center justify-between text-xs">
                <span className="text-[var(--color-text-secondary)] truncate font-mono">{a.action}</span>
                <span className="font-semibold text-[var(--color-text-primary)] ml-2">{a.count}</span>
              </div>
            ))}
            {kpi.topActions.length === 0 && (
              <span className="text-xs text-[var(--color-text-tertiary)]">없음</span>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-3">
          <Input
            placeholder="작업 유형 (예: RESOLVE_QUESTION)"
            value={localFilters.action}
            onChange={(e) => setLocalFilters((f) => ({ ...f, action: e.target.value }))}
            label=""
          />
          <Input
            placeholder="대상 유형 (예: Question)"
            value={localFilters.targetType}
            onChange={(e) => setLocalFilters((f) => ({ ...f, targetType: e.target.value }))}
            label=""
          />
          <Input
            placeholder="IP 주소"
            value={localFilters.ipAddress}
            onChange={(e) => setLocalFilters((f) => ({ ...f, ipAddress: e.target.value }))}
            label=""
          />
          <Input
            type="date"
            placeholder="시작일"
            value={localFilters.dateFrom}
            onChange={(e) => setLocalFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            label=""
          />
          <Input
            type="date"
            placeholder="종료일"
            value={localFilters.dateTo}
            onChange={(e) => setLocalFilters((f) => ({ ...f, dateTo: e.target.value }))}
            label=""
          />
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={applyFilters} className="gap-1.5">
            <Search className="h-3.5 w-3.5" />
            검색
          </Button>
          {hasFilters && (
            <Button variant="secondary" onClick={clearFilters} className="gap-1.5">
              <X className="h-3.5 w-3.5" />
              초기화
            </Button>
          )}
          <span className="ml-auto text-sm text-[var(--color-text-tertiary)] self-center">
            총 {pagination.total.toLocaleString()}건
          </span>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">시간</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">액터</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">작업</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">대상</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">IP</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)]">상세</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">
                    로그가 없습니다.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("ko-KR", {
                        month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {log.actor ? (
                        <div>
                          <div className="font-medium text-[var(--color-text-primary)]">{log.actor.nickname}</div>
                          <div className="text-xs text-[var(--color-text-tertiary)]">{log.actor.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-text-tertiary)]">시스템</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-[var(--color-surface-muted)] px-2 py-0.5 rounded text-[var(--color-text-primary)]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                      {log.targetType && (
                        <span>
                          {log.targetType}
                          {log.targetId && (
                            <span className="text-[var(--color-text-tertiary)] ml-1 font-mono">
                              #{log.targetId.slice(0, 8)}…
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-tertiary)] font-mono">
                      {log.ipAddress ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 px-2"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border-default)]">
            <span className="text-sm text-[var(--color-text-secondary)]">
              {pagination.page} / {pagination.totalPages} 페이지
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={pagination.page <= 1}
                onClick={() => goPage(pagination.page - 1)}
              >
                이전
              </Button>
              <Button
                variant="secondary"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => goPage(pagination.page + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </Card>

      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
