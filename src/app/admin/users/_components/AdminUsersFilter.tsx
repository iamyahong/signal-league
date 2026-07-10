"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "PENDING_BETA", label: "베타 대기" },
  { value: "BETA_ACTIVE", label: "베타 활성" },
  { value: "SUSPENDED", label: "정지" },
  { value: "ACTIVE", label: "활성" },
];

export function AdminUsersFilter({ currentSearch, currentStatus }: { currentSearch: string; currentStatus: string }) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);

  const apply = (newSearch: string, newStatus: string) => {
    const params = new URLSearchParams();
    if (newSearch) params.set("search", newSearch);
    if (newStatus && newStatus !== "all") params.set("status", newStatus);
    router.push(`/admin/users?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") apply(search, currentStatus); }}
          placeholder="이메일, 닉네임 검색"
          className="w-full pl-9 pr-3 h-8 border border-[var(--color-border-default)] rounded-[var(--radius-md)] text-sm focus:outline-none focus:border-[var(--color-accent-primary)]"
        />
      </div>
      <div className="flex items-center gap-1">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => apply(search, opt.value)}
            className={`h-8 px-3 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${currentStatus === opt.value || (opt.value === "all" && !currentStatus) ? "bg-[var(--color-accent-primary)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)]"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
