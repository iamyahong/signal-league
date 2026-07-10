"use client";

import { useEffect, useState } from "react";
import { BarChart2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

interface RankingsMeta {
  latestSnapshotAt: string | null;
  activeUserCount: number;
  avgTotalScore: number;
  maxTotalScore: number;
  maxScoreNickname: string;
  snapshotMeta: Array<{ periodType: string; categoryCode: string | null; createdAt: string; _count: { userId: number }; _avg: { score: number } }>;
  suspiciousHighScore: Array<{ userId: string; nickname: string; winAmount24h: number }>;
  suspiciousHighAccuracy: Array<{ userId: string; nickname: string; accuracy: number; totalPredictions: number }>;
}

interface GenerateResult {
  snapshotsCreated: number;
  usersProcessed: number;
  combinationsProcessed: number;
  durationMs: number;
  message: string;
}

export default function AdminRankingsPage() {
  const [meta, setMeta] = useState<RankingsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<GenerateResult | null>(null);

  async function fetchMeta() {
    try {
      const res = await fetch("/internal/admin/rankings/meta");
      if (!res.ok) throw new Error("Failed to fetch meta");
      setMeta(await res.json());
    } catch {
      toast.error("데이터 로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/internal/cron/generate-ranking-snapshots", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
      setLastResult(data);
      toast.success(data.message);
      await fetchMeta();
    } catch (e: unknown) {
      toast.error((e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => { fetchMeta(); }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">랭킹 관리</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const PERIOD_LABELS: Record<string, string> = { ALL_TIME: "누적", MONTHLY: "월간", WEEKLY: "주간" };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-[var(--color-accent-primary)]" />
            <h1 className="text-xl font-bold text-[var(--color-text-primary)]">랭킹 관리</h1>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">스냅샷 조회 및 수동 갱신</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2">
          <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          {generating ? "갱신 중..." : "스냅샷 갱신"}
        </Button>
      </div>

      {lastResult && (
        <div className="bg-green-50 border border-green-200 rounded-[var(--radius-xl)] p-4 text-sm text-green-800">
          <p className="font-semibold mb-1">갱신 완료</p>
          <p>처리 사용자: {lastResult.usersProcessed}명 / 생성 스냅샷: {lastResult.snapshotsCreated}개 / 처리 시간: {lastResult.durationMs}ms</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">최근 갱신</p>
          <p className="text-sm font-semibold mt-1">{meta?.latestSnapshotAt ? new Date(meta.latestSnapshotAt).toLocaleString("ko-KR") : "없음"}</p>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">활성 회원</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{meta?.activeUserCount ?? 0}</p>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">평균 누적 점수</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{(meta?.avgTotalScore ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <p className="text-xs text-[var(--color-text-secondary)]">최고 점수</p>
          <p className="text-2xl font-bold text-[var(--color-text-primary)] mt-1">{(meta?.maxTotalScore ?? 0).toLocaleString()}</p>
          <p className="text-xs text-[var(--color-text-tertiary)]">{meta?.maxScoreNickname}</p>
        </div>
      </div>

      {((meta?.suspiciousHighScore?.length ?? 0) > 0 || (meta?.suspiciousHighAccuracy?.length ?? 0) > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-xl)] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-800">의심 활동 모니터링</h2>
          </div>
          {(meta?.suspiciousHighScore?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-700 mb-1">최근 24시간 적중 점수 10,000점 이상</p>
              {meta!.suspiciousHighScore.map((u) => (
                <p key={u.userId} className="text-xs text-amber-800">{u.nickname}: +{u.winAmount24h.toLocaleString()}점</p>
              ))}
            </div>
          )}
          {(meta?.suspiciousHighAccuracy?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-amber-700 mb-1">정확도 95% 이상 + 참여 50건 이상</p>
              {meta!.suspiciousHighAccuracy.map((u) => (
                <p key={u.userId} className="text-xs text-amber-800">{u.nickname}: {u.accuracy}% ({u.totalPredictions}회 참여)</p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">스냅샷 메타</h2>
        {(meta?.snapshotMeta?.length ?? 0) === 0 ? (
          <p className="text-sm text-[var(--color-text-tertiary)] text-center py-4">스냅샷이 없습니다. 갱신 버튼을 눌러주세요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border-default)] text-[var(--color-text-tertiary)]">
                  <th className="text-left py-2 px-2">타입</th>
                  <th className="text-left py-2 px-2">카테고리</th>
                  <th className="text-right py-2 px-2">사용자 수</th>
                  <th className="text-right py-2 px-2">평균 점수</th>
                </tr>
              </thead>
              <tbody>
                {meta!.snapshotMeta.slice(0, 30).map((m, i) => (
                  <tr key={i} className="border-b border-[var(--color-border-default)] last:border-0">
                    <td className="py-2 px-2">{PERIOD_LABELS[m.periodType] ?? m.periodType}</td>
                    <td className="py-2 px-2 text-[var(--color-text-tertiary)]">{m.categoryCode ?? "전체"}</td>
                    <td className="py-2 px-2 text-right">{m._count.userId}</td>
                    <td className="py-2 px-2 text-right">{Math.round(m._avg.score ?? 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
