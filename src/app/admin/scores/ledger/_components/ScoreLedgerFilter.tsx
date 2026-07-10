"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { ScoreLedgerType } from "@prisma/client";
import { SCORE_TYPE_LABELS } from "@/lib/constants/scoreLedger";

const PERIOD_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "today", label: "오늘" },
  { value: "7d", label: "7일" },
  { value: "30d", label: "30일" },
];

const DIRECTION_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "increase", label: "증가만" },
  { value: "decrease", label: "감소만" },
];

interface Props {
  currentSearch: string;
  currentTypes: ScoreLedgerType[];
  currentDirection: string;
  currentPeriod: string;
}

export function ScoreLedgerFilter({ currentSearch, currentTypes, currentDirection, currentPeriod }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);
  const [types, setTypes] = useState<ScoreLedgerType[]>(currentTypes);
  const [direction, setDirection] = useState(currentDirection);
  const [period, setPeriod] = useState(currentPeriod);

  const apply = (s = search, t = types, d = direction, p = period) => {
    const params = new URLSearchParams();
    if (s) params.set("search", s);
    t.forEach((type) => params.append("type", type));
    if (d && d !== "all") params.set("direction", d);
    if (p && p !== "all") params.set("period", p);
    router.push(`/admin/scores/ledger?${params.toString()}`);
  };

  const toggleType = (type: ScoreLedgerType) => {
    const next = types.includes(type) ? types.filter((t) => t !== type) : [...types, type];
    setTypes(next);
    apply(search, next, direction, period);
  };

  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-3 space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") apply(); }}
            placeholder="이메일, 닉네임 검색"
            className="w-full pl-9 pr-3 h-8 border border-[var(--color-border-default)] rounded-[var(--radius-md)] text-sm focus:outline-none focus:border-[var(--color-accent-primary)]"
          />
        </div>
        <div className="flex items-center gap-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => { setPeriod(opt.value); apply(search, types, direction, opt.value); }}
              className={`h-7 px-2.5 rounded text-xs font-medium ${period === opt.value ? "bg-[var(--color-accent-primary)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)]"}`}>
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {DIRECTION_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => { setDirection(opt.value); apply(search, types, opt.value, period); }}
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
  );
}
