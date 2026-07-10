"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface Summary {
  total: number;
  delivered: number;
  bounced: number;
  complained: number;
  blocked: number;
  failed: number;
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
  blockedUserCount: number;
}

interface Props {
  summary: Summary;
  dailyData: Record<string, string | number>[];
  typeData: Record<string, string | number>[];
  blockReasonData: { reason: string; count: number }[];
  filters: { days: number; dateFrom: string; dateTo: string };
}

const STATUS_COLORS: Record<string, string> = {
  SENT: "#60a5fa",
  DELIVERED: "#34d399",
  BOUNCED: "#fb923c",
  COMPLAINED: "#f87171",
  FAILED: "#94a3b8",
  BLOCKED: "#c084fc",
  PENDING: "#e2e8f0",
};

const BLOCK_REASON_COLORS: Record<string, string> = {
  HARD_BOUNCE: "#fb923c",
  SOFT_BOUNCE_LIMIT: "#fbbf24",
  COMPLAINT: "#f87171",
  MANUAL: "#94a3b8",
  UNKNOWN: "#e2e8f0",
};

const BLOCK_REASON_LABELS: Record<string, string> = {
  HARD_BOUNCE: "하드 반송",
  SOFT_BOUNCE_LIMIT: "소프트 반송 누적",
  COMPLAINT: "스팸 신고",
  MANUAL: "수동 차단",
  UNKNOWN: "알 수 없음",
};

const DAILY_STATUSES = ["SENT", "DELIVERED", "BOUNCED", "COMPLAINED", "FAILED", "BLOCKED"];

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-[var(--color-text-secondary)] mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color ?? "text-[var(--color-text-primary)]"}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{sub}</div>}
    </Card>
  );
}

export function EmailStatsClient({ summary, dailyData, typeData, blockReasonData, filters }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const setDays = (d: number) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("days", String(d));
    params.delete("dateFrom");
    params.delete("dateTo");
    startTransition(() => router.push(`/admin/email-stats?${params.toString()}`));
  };

  const applyCustomRange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    params.set("dateFrom", String(fd.get("dateFrom") ?? ""));
    params.set("dateTo", String(fd.get("dateTo") ?? ""));
    startTransition(() => router.push(`/admin/email-stats?${params.toString()}`));
  };

  const isEmpty = summary.total === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">이메일 발송 통계</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">발송 현황 및 차단 분석</p>
      </div>

      {/* 기간 필터 */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={filters.days === d && !filters.dateFrom ? "primary" : "secondary"}
                onClick={() => setDays(d)}
                className="h-8 text-xs px-3"
              >
                최근 {d}일
              </Button>
            ))}
          </div>
          <form onSubmit={applyCustomRange} className="flex items-center gap-2">
            <input
              type="date"
              name="dateFrom"
              defaultValue={filters.dateFrom}
              className="h-8 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
            />
            <span className="text-xs text-[var(--color-text-tertiary)]">~</span>
            <input
              type="date"
              name="dateTo"
              defaultValue={filters.dateTo}
              className="h-8 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-2 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-primary)]"
            />
            <Button type="submit" variant="secondary" className="h-8 text-xs px-3">적용</Button>
          </form>
        </div>
      </Card>

      {/* 요약 카드 5개 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="총 발송 시도" value={summary.total.toLocaleString()} />
        <StatCard
          label="도달률"
          value={`${summary.deliveryRate.toFixed(1)}%`}
          sub={`${summary.delivered.toLocaleString()}건`}
          color="text-green-600"
        />
        <StatCard
          label="반송률"
          value={`${summary.bounceRate.toFixed(1)}%`}
          sub={`${summary.bounced.toLocaleString()}건`}
          color="text-orange-500"
        />
        <StatCard
          label="스팸신고율"
          value={`${summary.complaintRate.toFixed(1)}%`}
          sub={`${summary.complained.toLocaleString()}건`}
          color="text-red-600"
        />
        <StatCard
          label="현재 차단 사용자"
          value={summary.blockedUserCount.toLocaleString()}
          sub="전체 누적"
          color="text-purple-600"
        />
      </div>

      {isEmpty && (
        <Card className="py-16 text-center">
          <p className="text-sm text-[var(--color-text-tertiary)]">해당 기간 발송 내역이 없습니다.</p>
        </Card>
      )}

      {!isEmpty && (
        <>
          {/* 차트 1: 일별 발송량 */}
          <Card className="p-5">
            <div className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">일별 발송량</div>
            {dailyData.length === 0 ? (
              <p className="text-xs text-[var(--color-text-tertiary)] text-center py-8">데이터 없음</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dailyData} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v: number, name: string) => [v, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {DAILY_STATUSES.map((s) => (
                    <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLORS[s]} name={s} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* 차트 2: 종류별 발송 분포 */}
          <Card className="p-5">
            <div className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">종류별 발송 분포</div>
            {typeData.length === 0 ? (
              <p className="text-xs text-[var(--color-text-tertiary)] text-center py-8">데이터 없음</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={typeData}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 120, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-default)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="type"
                    tick={{ fontSize: 10 }}
                    width={120}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {["SENT", "DELIVERED", "BOUNCED", "FAILED", "BLOCKED"].map((s) => (
                    <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLORS[s]} name={s} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* 차트 3: 차단 사유 분포 */}
          {blockReasonData.length > 0 && (
            <Card className="p-5">
              <div className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">
                차단 사유 분포 (현재 차단 중인 사용자 {summary.blockedUserCount}명)
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={blockReasonData}
                      dataKey="count"
                      nameKey="reason"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                    >
                      {blockReasonData.map((entry) => (
                        <Cell key={entry.reason} fill={BLOCK_REASON_COLORS[entry.reason] ?? "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(v: number, name: string) => [v, BLOCK_REASON_LABELS[name] ?? name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {blockReasonData.map((entry) => (
                    <div key={entry.reason} className="flex items-center gap-2 text-xs">
                      <span
                        className="inline-block w-3 h-3 rounded-sm shrink-0"
                        style={{ background: BLOCK_REASON_COLORS[entry.reason] ?? "#94a3b8" }}
                      />
                      <span className="text-[var(--color-text-secondary)]">
                        {BLOCK_REASON_LABELS[entry.reason] ?? entry.reason}
                      </span>
                      <span className="font-semibold text-[var(--color-text-primary)]">{entry.count}명</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
