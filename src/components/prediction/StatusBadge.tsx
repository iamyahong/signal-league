import { clsx } from "clsx";

type Status = "DRAFT" | "PENDING_REVIEW" | "OPEN" | "CLOSED" | "RESOLVED" | "VOIDED" | "REJECTED" | "HIDDEN";

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  DRAFT:          { label: "작성 중",   className: "bg-gray-100 text-gray-600" },
  PENDING_REVIEW: { label: "검토 중",   className: "bg-amber-100 text-amber-700" },
  OPEN:           { label: "진행 중",   className: "bg-green-100 text-green-700" },
  CLOSED:         { label: "마감",      className: "bg-gray-200 text-gray-500" },
  RESOLVED:       { label: "결과 확정", className: "bg-blue-100 text-blue-700" },
  VOIDED:         { label: "무효",      className: "bg-red-100 text-red-500" },
  REJECTED:       { label: "반려",      className: "bg-red-100 text-red-600" },
  HIDDEN:         { label: "숨김",      className: "bg-gray-100 text-gray-500" },
};

export const CATEGORY_COLORS: Record<string, string> = {
  economy:     "bg-blue-100 text-blue-700",
  geopolitics: "bg-orange-100 text-orange-700",
  society:     "bg-green-100 text-green-700",
  tech:        "bg-purple-100 text-purple-700",
  culture:     "bg-pink-100 text-pink-700",
  sports:      "bg-amber-100 text-amber-700",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, className: "bg-gray-100 text-gray-500" };
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", cfg.className, className)}>
      {cfg.label}
    </span>
  );
}

interface CategoryBadgeProps {
  slug: string;
  name: string;
  className?: string;
}

export function CategoryBadge({ slug, name, className }: CategoryBadgeProps) {
  const color = CATEGORY_COLORS[slug] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", color, className)}>
      {name}
    </span>
  );
}
