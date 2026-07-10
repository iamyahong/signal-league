import { clsx } from "clsx";
import { CheckCircle } from "lucide-react";

interface Option {
  id: string;
  label: string;
  totalAllocated: number;
  participantCount: number;
}

const BAR_COLORS = [
  "bg-[var(--color-accent-primary)]",
  "bg-orange-400",
  "bg-purple-400",
  "bg-green-400",
  "bg-pink-400",
];

interface OptionDistributionBarProps {
  options: Option[];
  totalAllocated: number;
  myOptionId?: string | null;
  correctOptionId?: string | null;
  compact?: boolean;
  showLabels?: boolean;
}

export function OptionDistributionBar({ options, totalAllocated, myOptionId, correctOptionId, compact = false, showLabels = true }: OptionDistributionBarProps) {
  if (options.length === 0) return null;

  const total = totalAllocated || options.reduce((sum, o) => sum + o.totalAllocated, 0);

  if (compact) {
    return (
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
        {options.map((opt, i) => {
          const pct = total > 0 ? (opt.totalAllocated / total) * 100 : 100 / options.length;
          return (
            <div
              key={opt.id}
              className={clsx(BAR_COLORS[i % BAR_COLORS.length], "transition-all")}
              style={{ width: `${pct}%` }}
              title={`${opt.label}: ${pct.toFixed(1)}%`}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {options.map((opt, i) => {
        const pct = total > 0 ? (opt.totalAllocated / total) * 100 : 0;
        const isMyChoice = myOptionId === opt.id;
        const isCorrect = correctOptionId != null && opt.id === correctOptionId;
        return (
          <div key={opt.id} className={clsx(
            "rounded-xl border p-3 transition-all",
            isCorrect ? "border-green-400 bg-green-50" :
            isMyChoice ? "border-[var(--color-accent-primary)] bg-blue-50" :
            "border-[var(--color-border-default)] bg-white"
          )}>
            {showLabels && (
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{opt.label}</span>
                  {isCorrect && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-700 bg-green-100 rounded-full px-2 py-0.5">
                      <CheckCircle className="h-3 w-3" />정답
                    </span>
                  )}
                  {isMyChoice && !isCorrect && <span className="text-xs font-semibold text-[var(--color-accent-primary)]">✓ 내 선택</span>}
                  {isMyChoice && isCorrect && <span className="text-xs font-semibold text-green-700">✓ 내 선택</span>}
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[var(--color-text-primary)]">{pct.toFixed(1)}%</span>
                  <span className="text-xs text-[var(--color-text-tertiary)] ml-2">{opt.participantCount}명</span>
                </div>
              </div>
            )}
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={clsx(
                  "h-full rounded-full transition-all duration-500",
                  isCorrect ? "bg-green-500" : BAR_COLORS[i % BAR_COLORS.length]
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-[var(--color-text-tertiary)]">
              <span>{opt.totalAllocated.toLocaleString()}점 배분됨</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
