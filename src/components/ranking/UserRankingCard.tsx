import Link from "next/link";

interface UserRankingCardProps {
  nickname: string;
  allTimeRank: number | null;
  allTimeScore: number;
  monthlyRank: number | null;
  monthlyScore: number;
  weeklyRank: number | null;
  weeklyScore: number;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
  showLink?: boolean;
}

function RankDisplay({ rank }: { rank: number | null }) {
  if (!rank) return <span className="text-[var(--color-text-tertiary)]">—위</span>;
  return <span className="font-bold text-[var(--color-text-primary)]">{rank.toLocaleString()}위</span>;
}

export function UserRankingCard({
  nickname,
  allTimeRank,
  allTimeScore,
  monthlyRank,
  monthlyScore,
  weeklyRank,
  weeklyScore,
  accuracy,
  totalPredictions,
  correctPredictions,
  showLink = true,
}: UserRankingCardProps) {
  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">내 랭킹</h3>
        {showLink && (
          <Link href="/rankings" className="text-xs text-[var(--color-accent-primary)] hover:underline">
            전체 랭킹 보기 →
          </Link>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-secondary)]">누적</span>
          <div className="text-right">
            <RankDisplay rank={allTimeRank} />
            <span className="text-xs text-[var(--color-text-tertiary)] ml-2">/ {allTimeScore.toLocaleString()}점</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-secondary)]">월간</span>
          <div className="text-right">
            <RankDisplay rank={monthlyRank} />
            <span className="text-xs text-[var(--color-text-tertiary)] ml-2">/ 이달 +{monthlyScore.toLocaleString()}점</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--color-text-secondary)]">주간</span>
          <div className="text-right">
            <RankDisplay rank={weeklyRank} />
            <span className="text-xs text-[var(--color-text-tertiary)] ml-2">/ 7일 +{weeklyScore.toLocaleString()}점</span>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm border-t border-[var(--color-border-default)] pt-2 mt-2">
          <span className="text-[var(--color-text-secondary)]">정확도</span>
          <span className="font-medium text-[var(--color-text-primary)]">
            {totalPredictions === 0 ? "—" : `${Math.round(accuracy * 100)}%`}
            <span className="text-xs text-[var(--color-text-tertiary)] ml-1.5">({correctPredictions} / {totalPredictions})</span>
          </span>
        </div>
      </div>
    </div>
  );
}
