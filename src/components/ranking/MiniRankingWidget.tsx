import Link from "next/link";

interface MiniRankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  score: number;
}

interface MiniRankingWidgetProps {
  rows: MiniRankingEntry[];
  myUserId: string;
  myRank: number | null;
}

export function MiniRankingWidget({ rows, myUserId, myRank }: MiniRankingWidgetProps) {
  const isMyRankInTop = rows.some((r) => r.userId === myUserId);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">누적 랭킹 TOP 5</h3>
        <Link href="/rankings" className="text-xs text-[var(--color-accent-primary)] hover:underline">전체 보기</Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-[var(--color-text-tertiary)] text-center py-4">랭킹 데이터 없음</p>
      ) : (
        <div className="space-y-1.5">
          {rows.slice(0, 5).map((entry, i) => {
            const isMe = entry.userId === myUserId;
            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-2.5 p-2 rounded-[var(--radius-md)] ${isMe ? "bg-blue-50" : "hover:bg-[var(--color-surface-muted)]"} transition-colors`}
              >
                <span className="w-5 text-center text-sm shrink-0">{medals[i] ?? entry.rank}</span>
                <span className={`text-xs font-medium flex-1 truncate ${isMe ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-primary)]"}`}>
                  {entry.nickname}{isMe ? " (나)" : ""}
                </span>
                <span className="text-xs tabular-nums text-[var(--color-text-secondary)] shrink-0">
                  {entry.score.toLocaleString()}점
                </span>
              </div>
            );
          })}

          {!isMyRankInTop && myRank && (
            <div className="mt-2 pt-2 border-t border-dashed border-[var(--color-border-default)] flex items-center justify-between px-2">
              <span className="text-xs text-[var(--color-text-tertiary)]">내 순위</span>
              <span className="text-xs font-bold text-[var(--color-accent-primary)]">{myRank}위</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
