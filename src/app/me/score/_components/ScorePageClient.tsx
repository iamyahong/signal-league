"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ScoreLedgerType } from "@prisma/client";
import { SCORE_TYPE_LABELS } from "@/lib/constants/scoreLedger";
import Link from "next/link";

interface LedgerEntry {
  id: string;
  type: ScoreLedgerType;
  amount: number;
  balanceAfter: number;
  balanceBefore: number;
  description: string | null;
  createdAt: string;
}

interface Props {
  entries: LedgerEntry[];
  total: number;
  totalPages: number;
  currentPage: number;
  currentTypes: ScoreLedgerType[];
  currentDirection: string;
  currentPeriod: string;
}

const PERIOD_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "today", label: "오늘" },
  { value: "7d", label: "7일" },
  { value: "30d", label: "30일" },
];

const DIRECTION_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "increase", label: "증가" },
  { value: "decrease", label: "감소" },
];

const TYPE_BADGE_COLOR: Partial<Record<ScoreLedgerType, string>> = {
  PLAN_GRANT: "bg-green-100 text-green-700",
  ADMIN_ADJUST_ADD: "bg-blue-100 text-blue-700",
  ADMIN_ADJUST_SUBTRACT: "bg-orange-100 text-orange-700",
  REFERRAL_BONUS: "bg-purple-100 text-purple-700",
  QUESTION_CREATE_COST: "bg-amber-100 text-amber-700",
  PREDICTION_LOSE: "bg-red-100 text-red-700",
  PREDICTION_WIN: "bg-emerald-100 text-emerald-700",
  SYSTEM_CORRECTION: "bg-gray-100 text-gray-600",
};

export function ScorePageClient({ entries, total, totalPages, currentPage, currentTypes, currentDirection, currentPeriod }: Props) {
  const router = useRouter();
  const [types, setTypes] = useState<ScoreLedgerType[]>(currentTypes);
  const [direction, setDirection] = useState(currentDirection);
  const [period, setPeriod] = useState(currentPeriod);

  const apply = (t = types, d = direction, p = period, pg = 1) => {
    const params = new URLSearchParams();
    t.forEach((type) => params.append("type", type));
    if (d && d !== "all") params.set("direction", d);
    if (p && p !== "all") params.set("period", p);
    if (pg > 1) params.set("page", String(pg));
    router.push(`/me/score?${params.toString()}`);
  };

  const toggleType = (type: ScoreLedgerType) => {
    const next = types.includes(type) ? types.filter((t) => t !== type) : [...types, type];
    setTypes(next);
    apply(next, direction, period);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-3 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--color-text-secondary)] mr-1">기간</span>
            {PERIOD_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => { setPeriod(opt.value); apply(types, direction, opt.value); }}
                className={`h-7 px-2.5 rounded text-xs font-medium ${period === opt.value ? "bg-[var(--color-accent-primary)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)]"}`}>
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--color-text-secondary)] mr-1">방향</span>
            {DIRECTION_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => { setDirection(opt.value); apply(types, opt.value, period); }}
                className={`h-7 px-2.5 rounded text-xs font-medium ${direction === opt.value ? "bg-[var(--color-accent-primary)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)]"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.values(ScoreLedgerType).map((type) => (
            <button key={type} onClick={() => toggleType(type)}
              className={`h-6 px-2 rounded text-[10px] font-medium border transition-colors ${types.includes(type) ? "bg-[var(--color-accent-primary)] text-white border-[var(--color-accent-primary)]" : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]"}`}>
              {SCORE_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--color-text-tertiary)]">아직 점수 변동 내역이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">일시</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">유형</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)]">변동</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)]">변동 후 잔액</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">사유</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--color-surface-muted)]">
                    <td className="px-4 py-3 text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">
                      {new Date(e.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${TYPE_BADGE_COLOR[e.type] ?? "bg-gray-100 text-gray-600"}`}>
                        {SCORE_TYPE_LABELS[e.type] ?? e.type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${e.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                      {e.amount > 0 ? "+" : ""}{e.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-[var(--color-text-primary)]">
                      {e.balanceAfter.toLocaleString()}점
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)] max-w-[200px] truncate" title={e.description ?? ""}>
                      {e.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => apply(types, direction, period, p)}
              className={`w-8 h-8 flex items-center justify-center rounded text-sm ${p === currentPage ? "bg-[var(--color-accent-primary)] text-white font-medium" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"}`}>
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
