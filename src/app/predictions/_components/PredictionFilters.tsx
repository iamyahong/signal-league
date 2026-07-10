"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Search } from "lucide-react";
import { clsx } from "clsx";

interface Category {
  id: string;
  slug: string;
  name: string;
}

interface PredictionFiltersProps {
  categories: Category[];
  isLoggedIn: boolean;
  isBetaActive: boolean;
}

const TABS = [
  { id: "popular",     label: "인기",         needsAuth: false },
  { id: "latest",      label: "최신",          needsAuth: false },
  { id: "closing",     label: "마감 임박",     needsAuth: false },
  { id: "closed",      label: "결과 대기",     needsAuth: false },
  { id: "resolved",    label: "결과 확정",     needsAuth: false },
  { id: "participated",label: "내가 참여한",   needsAuth: true  },
];

const SORT_OPTIONS = [
  { value: "latest",       label: "최신순" },
  { value: "closing",      label: "마감 임박순" },
  { value: "participants", label: "참여자 많은 순" },
  { value: "allocated",    label: "총 배분 점수 높은 순" },
  { value: "comments",     label: "댓글 많은 순" },
];

export function PredictionFilters({ categories, isLoggedIn, isBetaActive }: PredictionFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = searchParams?.get("tab") ?? "popular";
  const selectedCategories = (searchParams?.get("categories") ?? "").split(",").filter(Boolean);
  const sort = searchParams?.get("sort") ?? "";
  const search = searchParams?.get("search") ?? "";

  const update = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (value) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  function toggleCategory(id: string) {
    const current = selectedCategories.includes(id)
      ? selectedCategories.filter((c) => c !== id)
      : [...selectedCategories, id];
    update("categories", current.join(","));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-[var(--color-border-default)] pb-0">
        {TABS.map((t) => {
          if (t.needsAuth && !isLoggedIn) return null;
          return (
            <button
              key={t.id}
              onClick={() => update("tab", t.id)}
              className={clsx(
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-[var(--color-accent-primary)] text-[var(--color-accent-primary)]"
                  : "border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="제목 검색..."
            className="pl-9 pr-3 py-2 rounded-xl border border-[var(--color-border-default)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30 w-48"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          <button
            onClick={() => update("categories", "")}
            className={clsx("rounded-full px-3 py-1 text-xs font-medium border transition-all", !selectedCategories.length ? "bg-[var(--color-accent-primary)] text-white border-transparent" : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50")}
          >전체</button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={clsx("rounded-full px-3 py-1 text-xs font-medium border transition-all", selectedCategories.includes(cat.id) ? "bg-[var(--color-accent-primary)] text-white border-transparent" : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50")}
            >{cat.name}</button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => update("sort", e.target.value)}
          className="rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30 bg-white"
        >
          <option value="">정렬 선택</option>
          {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
