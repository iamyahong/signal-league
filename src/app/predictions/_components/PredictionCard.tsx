import Link from "next/link";
import { Users, MessageSquare, Clock } from "lucide-react";
import { StatusBadge, CategoryBadge } from "@/components/prediction/StatusBadge";
import { OptionDistributionBar } from "./OptionDistributionBar";
import { clsx } from "clsx";

interface Option {
  id: string;
  label: string;
  totalAllocated: number;
  participantCount: number;
  sortOrder: number;
}

interface PredictionCardProps {
  id: string;
  title: string;
  status: string;
  closesAt: string | Date | null;
  totalParticipants: number;
  totalAllocated: number;
  commentCount: number;
  category: { slug: string; name: string };
  author: { nickname: string };
  options: Option[];
  hasParticipated?: boolean;
}

function formatTimeLeft(closesAt: Date | string | null): { text: string; urgent: boolean } {
  if (!closesAt) return { text: "마감일 미정", urgent: false };
  const d = new Date(closesAt);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff <= 0) return { text: "마감됨", urgent: false };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return { text: `${hours}시간 후 마감`, urgent: true };
  const days = Math.floor(hours / 24);
  if (days === 1) return { text: "내일 마감", urgent: false };
  return { text: `${days}일 후 마감`, urgent: false };
}

export function PredictionCard({
  id, title, status, closesAt, totalParticipants, totalAllocated, commentCount,
  category, author, options, hasParticipated,
}: PredictionCardProps) {
  const timeLeft = formatTimeLeft(closesAt);

  return (
    <Link href={`/predictions/${id}`} className="block group">
      <div className="relative h-full rounded-2xl border border-[var(--color-border-default)] bg-white p-5 hover:border-[var(--color-accent-primary)]/40 hover:shadow-md transition-all duration-200">
        {hasParticipated && (
          <span className="absolute right-3 top-3 rounded-full bg-[var(--color-accent-primary)] px-2 py-0.5 text-[10px] font-bold text-white">
            참여 완료
          </span>
        )}

        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <CategoryBadge slug={category.slug} name={category.name} />
            <StatusBadge status={status as Parameters<typeof StatusBadge>[0]["status"]} />
          </div>
          <span className={clsx("shrink-0 text-xs", timeLeft.urgent ? "font-semibold text-red-500" : "text-[var(--color-text-tertiary)]")}>
            <Clock className="inline h-3 w-3 mr-0.5" />{timeLeft.text}
          </span>
        </div>

        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2 mb-3 group-hover:text-[var(--color-accent-primary)] transition-colors">
          {title}
        </h3>

        {options.length > 0 && (
          <div className="mb-4">
            <OptionDistributionBar options={options} totalAllocated={totalAllocated} compact showLabels={false} />
            <div className="mt-1.5 flex gap-2 flex-wrap">
              {options.slice(0, 3).map((opt, i) => (
                <span key={opt.id} className="text-xs text-[var(--color-text-tertiary)]">
                  <span className={clsx("inline-block h-2 w-2 rounded-full mr-0.5", ["bg-[var(--color-accent-primary)]", "bg-orange-400", "bg-purple-400"][i])} />
                  {opt.label}
                  {totalAllocated > 0 ? ` ${((opt.totalAllocated / totalAllocated) * 100).toFixed(0)}%` : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
          <div className="flex items-center gap-3">
            <span>{author.nickname}</span>
            <span className="flex items-center gap-0.5"><Users className="h-3 w-3" />{totalParticipants.toLocaleString()}</span>
            <span className="flex items-center gap-0.5"><MessageSquare className="h-3 w-3" />{commentCount}</span>
          </div>
          <span className="font-medium text-[var(--color-text-secondary)]">{totalAllocated.toLocaleString()}점</span>
        </div>
      </div>
    </Link>
  );
}
