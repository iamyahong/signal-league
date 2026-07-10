import prisma from "@/lib/prisma";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Users, Gift, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const [referrals, total, bonusGranted] = await Promise.all([
    prisma.referral.findMany({
      where: { deletedAt: null },
      include: {
        fromUser: { select: { id: true, nickname: true, email: true } },
        toUser: {
          select: {
            id: true,
            nickname: true,
            email: true,
            createdAt: true,
            firstParticipationAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.referral.count({ where: { deletedAt: null } }),
    prisma.referral.count({ where: { bonusGiven: true, deletedAt: null } }),
  ]);

  const conversionRate = total > 0 ? Math.round((bonusGranted / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">추천 관리</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">사용자 추천 현황 및 보너스 지급 내역</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-[var(--color-accent-primary)]" />
            <span className="text-xs text-[var(--color-text-secondary)]">총 추천 건수</span>
          </div>
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">{total.toLocaleString()}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="h-4 w-4 text-emerald-500" />
            <span className="text-xs text-[var(--color-text-secondary)]">보너스 지급</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600">{bonusGranted.toLocaleString()}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-[var(--color-text-secondary)]">전환율</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">{conversionRate}%</div>
        </Card>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">추천인</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">피추천인</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">가입일</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">첫 참여일</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)]">보너스</th>
              </tr>
            </thead>
            <tbody>
              {referrals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--color-text-tertiary)]">
                    추천 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                referrals.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--color-text-primary)]">{r.fromUser.nickname}</div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">{r.fromUser.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--color-text-primary)]">{r.toUser.nickname}</div>
                      <div className="text-xs text-[var(--color-text-tertiary)]">{r.toUser.email}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {r.toUser.createdAt.toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {r.toUser.firstParticipationAt
                        ? r.toUser.firstParticipationAt.toLocaleDateString("ko-KR")
                        : <span className="text-[var(--color-text-tertiary)]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.bonusGiven ? (
                        <Badge variant="success">
                          +{(r.bonusAmount ?? 0).toLocaleString()}점
                        </Badge>
                      ) : r.toUser.firstParticipationAt ? (
                        <Badge variant="warning">대기 중</Badge>
                      ) : (
                        <Badge variant="default">미참여</Badge>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
