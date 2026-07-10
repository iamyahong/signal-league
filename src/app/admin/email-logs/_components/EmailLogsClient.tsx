"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Copy, Check, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { EmailLogDetailModal } from "./EmailLogDetailModal";

export interface EmailLogRow {
  id: string;
  type: string;
  toEmail: string;
  userId: string | null;
  subject: string;
  status: string;
  resendId: string | null;
  errorMsg: string | null;
  meta: Record<string, unknown> | null;
  sentAt: string | null;
  deliveredAt: string | null;
  bouncedAt: string | null;
  complainedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  logs: EmailLogRow[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: {
    total: number;
    delivered: number;
    bounced: number;
    complained: number;
    deliveryRate: number;
    bounceRate: number;
    complaintRate: number;
  };
  filters: {
    type?: string;
    status?: string;
    toEmail?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  };
}

const STATUS_STYLES: Record<string, string> = {
  PENDING:   "bg-gray-100 text-gray-600",
  SENT:      "bg-blue-100 text-blue-700",
  DELIVERED: "bg-green-100 text-green-700",
  FAILED:    "bg-red-100 text-red-700",
  BOUNCED:   "bg-orange-100 text-orange-700",
  COMPLAINED:"bg-red-200 text-red-800 font-semibold",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "대기", SENT: "발송됨", DELIVERED: "도달", FAILED: "실패",
  BOUNCED: "반송", COMPLAINED: "스팸신고",
};

const ALL_STATUSES = ["PENDING", "SENT", "DELIVERED", "FAILED", "BOUNCED", "COMPLAINED"];
const ALL_TYPES = [
  "VERIFY_EMAIL", "PASSWORD_RESET", "SIGNUP_RECEIVED", "BETA_APPROVED",
  "QUESTION_APPROVED", "QUESTION_REJECTED", "RESULT_CONFIRMED", "QUESTION_VOIDED",
];

function formatKST(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="ml-1 inline-flex items-center text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-primary)] transition-colors" title="복사">
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function SortButton({ field, current, order, onSort }: { field: string; current: string; order: string; onSort: (f: string) => void }) {
  const active = current === field;
  return (
    <button onClick={() => onSort(field)} className="inline-flex items-center gap-0.5 hover:text-[var(--color-accent-primary)]">
      {active ? (order === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ChevronDown className="h-3 w-3 opacity-30" />}
    </button>
  );
}

export function EmailLogsClient({ logs, pagination, stats, filters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<EmailLogRow | null>(null);

  const [localFilters, setLocalFilters] = useState({
    type: filters.type ?? "",
    status: filters.status ?? "",
    toEmail: filters.toEmail ?? "",
    dateFrom: filters.dateFrom ?? "",
    dateTo: filters.dateTo ?? "",
  });

  const sortBy = filters.sortBy ?? "createdAt";
  const sortOrder = filters.sortOrder ?? "desc";

  const buildParams = (overrides: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams(searchParams?.toString());
    const merged = { ...localFilters, sortBy, sortOrder, ...overrides };
    params.set("page", overrides.page ?? "1");
    Object.entries(merged).forEach(([k, v]) => {
      if (v) params.set(k, v);
      else params.delete(k);
    });
    return params.toString();
  };

  const applyFilters = () => {
    startTransition(() => router.push(`/admin/email-logs?${buildParams()}`));
  };

  const clearFilters = () => {
    setLocalFilters({ type: "", status: "", toEmail: "", dateFrom: "", dateTo: "" });
    startTransition(() => router.push("/admin/email-logs"));
  };

  const goPage = (p: number) => {
    startTransition(() => router.push(`/admin/email-logs?${buildParams({ page: String(p) })}`));
  };

  const handleSort = (field: string) => {
    const newOrder = sortBy === field && sortOrder === "desc" ? "asc" : "desc";
    startTransition(() =>
      router.push(`/admin/email-logs?${buildParams({ sortBy: field, sortOrder: newOrder, page: "1" })}`)
    );
  };

  const hasFilters = Object.values(localFilters).some(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">이메일 발송 로그</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Resend 발송 이력 및 상태</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">총 발송 시도</div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.total.toLocaleString()}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">도달률</div>
          <div className="text-2xl font-bold text-green-600">{stats.deliveryRate.toFixed(1)}%</div>
          <div className="text-xs text-[var(--color-text-tertiary)]">{stats.delivered.toLocaleString()}건</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">반송률</div>
          <div className="text-2xl font-bold text-orange-500">{stats.bounceRate.toFixed(1)}%</div>
          <div className="text-xs text-[var(--color-text-tertiary)]">{stats.bounced.toLocaleString()}건</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-[var(--color-text-secondary)] mb-1">스팸신고율</div>
          <div className="text-2xl font-bold text-red-600">{stats.complaintRate.toFixed(1)}%</div>
          <div className="text-xs text-[var(--color-text-tertiary)]">{stats.complained.toLocaleString()}건</div>
        </Card>
      </div>

      {/* 필터 */}
      <Card className="p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-3">
          <select
            value={localFilters.type}
            onChange={(e) => setLocalFilters((f) => ({ ...f, type: e.target.value }))}
            className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-white px-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
          >
            <option value="">모든 종류</option>
            {ALL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={localFilters.status}
            onChange={(e) => setLocalFilters((f) => ({ ...f, status: e.target.value }))}
            className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-white px-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
          >
            <option value="">모든 상태</option>
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>)}
          </select>
          <Input
            placeholder="수신자 이메일 검색"
            value={localFilters.toEmail}
            onChange={(e) => setLocalFilters((f) => ({ ...f, toEmail: e.target.value }))}
            label=""
          />
          <Input
            type="date"
            value={localFilters.dateFrom}
            onChange={(e) => setLocalFilters((f) => ({ ...f, dateFrom: e.target.value }))}
            label=""
          />
          <Input
            type="date"
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

      {/* 테이블 */}
      <Card>
        {logs.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--color-text-tertiary)]">
            조건에 맞는 이메일 발송 내역이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      발송 시각
                      <SortButton field="createdAt" current={sortBy} order={sortOrder} onSort={handleSort} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      종류
                      <SortButton field="type" current={sortBy} order={sortOrder} onSort={handleSort} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">수신자</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">
                    <span className="inline-flex items-center gap-1">
                      상태
                      <SortButton field="status" current={sortBy} order={sortOrder} onSort={handleSort} />
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">Resend ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">오류</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)]">상세</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelected(log)}
                    className="hover:bg-[var(--color-surface-hover)] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)] whitespace-nowrap">
                      {formatKST(log.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[var(--color-text-primary)]">{log.type}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)] max-w-[180px] truncate">
                      {log.toEmail}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${STATUS_STYLES[log.status] ?? "bg-gray-100 text-gray-500"}`}>
                        {STATUS_LABELS[log.status] ?? log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.resendId ? (
                        <span className="font-mono text-[var(--color-text-tertiary)] truncate max-w-[120px] inline-block align-middle">
                          {log.resendId.slice(0, 12)}…
                          <CopyButton value={log.resendId} />
                        </span>
                      ) : (
                        <span className="text-[var(--color-text-tertiary)]">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-600 max-w-[160px] truncate" title={log.errorMsg ?? ""}>
                      {log.errorMsg ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelected(log); }}
                        className="text-xs text-[var(--color-accent-primary)] hover:underline"
                      >
                        보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            onClick={() => goPage(pagination.page - 1)}
            disabled={pagination.page <= 1}
          >
            이전
          </Button>
          <span className="text-sm text-[var(--color-text-secondary)]">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => goPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
          >
            다음
          </Button>
        </div>
      )}

      {selected && (
        <EmailLogDetailModal log={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
