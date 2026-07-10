"use client";

interface RankingRow {
  rank: number;
  userId: string;
  nickname: string;
  planCode: string | null;
  score: number;
  accuracy: number;
  totalPredictions: number;
  correctPredictions: number;
}

interface RankingTableProps {
  rows: RankingRow[];
  myUserId: string;
  myRankBeyondTop: number | null;
}

const PLAN_LABELS: Record<string, string> = { BASIC: "Basic", STANDARD: "Standard", PRO: "Pro" };
const PLAN_COLORS: Record<string, string> = {
  BASIC: "bg-slate-100 text-slate-600",
  STANDARD: "bg-blue-100 text-blue-700",
  PRO: "bg-violet-100 text-violet-700",
};

export function RankingTable({ rows, myUserId, myRankBeyondTop }: RankingTableProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-16 text-[var(--color-text-tertiary)]">
        랭킹 데이터가 생성되지 않았습니다. 운영자에게 문의해 주세요.
      </div>
    );
  }

  const myEntry = rows.find((r) => r.userId === myUserId);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-default)] text-[var(--color-text-tertiary)] text-xs">
              <th className="text-left py-2.5 px-3 font-medium w-12">순위</th>
              <th className="text-left py-2.5 px-3 font-medium">닉네임</th>
              <th className="text-left py-2.5 px-3 font-medium hidden sm:table-cell">요금제</th>
              <th className="text-right py-2.5 px-3 font-medium">점수</th>
              <th className="text-right py-2.5 px-3 font-medium hidden sm:table-cell">정확도</th>
              <th className="text-right py-2.5 px-3 font-medium hidden md:table-cell">참여</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isMe = row.userId === myUserId;
              const medal = row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : null;
              return (
                <tr
                  key={row.userId}
                  className={`border-b border-[var(--color-border-default)] last:border-0 transition-colors ${isMe ? "bg-blue-50" : "hover:bg-[var(--color-surface-muted)]"}`}
                >
                  <td className="py-3 px-3">
                    <span className={`font-bold tabular-nums ${row.rank <= 3 ? "text-base" : "text-[var(--color-text-secondary)]"}`}>
                      {medal ?? row.rank}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`font-medium ${isMe ? "text-[var(--color-accent-primary)]" : "text-[var(--color-text-primary)]"}`}>
                      {row.nickname}{isMe ? " (나)" : ""}
                    </span>
                  </td>
                  <td className="py-3 px-3 hidden sm:table-cell">
                    {row.planCode && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAN_COLORS[row.planCode] ?? "bg-gray-100 text-gray-600"}`}>
                        {PLAN_LABELS[row.planCode] ?? row.planCode}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {row.score.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right hidden sm:table-cell text-[var(--color-text-secondary)]">
                    {row.totalPredictions === 0 ? "—" : `${Math.round(row.accuracy * 100)}%`}
                  </td>
                  <td className="py-3 px-3 text-right hidden md:table-cell text-[var(--color-text-tertiary)]">
                    {row.totalPredictions}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!myEntry && myRankBeyondTop && (
        <div className="mt-3 pt-3 border-t border-dashed border-[var(--color-border-default)] text-sm text-[var(--color-text-secondary)] text-center">
          내 순위: <span className="font-bold text-[var(--color-accent-primary)]">{myRankBeyondTop}위</span> (TOP 100 밖)
        </div>
      )}
    </div>
  );
}
