import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STATUS_LABELS, STATUS_COLORS, SCORE_TYPE_LABELS, PLAN_LABELS } from "@/lib/constants/scoreLedger";
import { UserDetailActions } from "./_components/UserDetailActions";

interface Props { params: Promise<{ id: string }> }

async function getUserDetail(id: string) {
  return prisma.user.findUnique({
    where: { id, deletedAt: null },
    include: {
      profile: true,
      roles: true,
      subscription: { include: { plan: true } },
      scoreLedgers: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 20 },
      auditLogs: {
        where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 20,
        include: { actor: { select: { nickname: true } } },
      },
      referredBy: { select: { nickname: true, email: true } },
    },
  });
}

const ACTION_LABELS: Record<string, string> = {
  BETA_APPROVE: "베타 승인", BETA_REJECT: "베타 거절", BETA_HOLD: "베타 보류",
  SCORE_ADJUST_ADD: "점수 지급", SCORE_ADJUST_SUBTRACT: "점수 차감",
  USER_SUSPEND: "회원 정지", USER_UNSUSPEND: "정지 해제", PLAN_CHANGE: "요금제 변경",
};

export default async function AdminUserDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const user = await getUserDetail(id);
  if (!user) notFound();

  const roles = (session.user.roles as string[]) || [];
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const score = user.profile?.availableScore ?? 0;
  const categories = user.profile?.favoriteCategories ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Link href="/admin/users" className="hover:text-[var(--color-text-primary)]">회원 관리</Link>
        <span>/</span>
        <span className="text-[var(--color-text-primary)] font-medium">{user.nickname}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: info + actions */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basic Info */}
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">기본 정보</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-[var(--color-text-tertiary)]">회원 ID</dt><dd className="font-mono text-xs mt-0.5 text-[var(--color-text-secondary)] break-all">{user.id}</dd></div>
              <div><dt className="text-[var(--color-text-tertiary)]">이메일</dt><dd className="mt-0.5">{user.email}</dd></div>
              <div><dt className="text-[var(--color-text-tertiary)]">닉네임</dt><dd className="mt-0.5 font-medium">{user.nickname}</dd></div>
              <div>
                <dt className="text-[var(--color-text-tertiary)]">상태</dt>
                <dd className="mt-0.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[user.status] ?? "bg-gray-100 text-gray-600"}`}>
                    {STATUS_LABELS[user.status] ?? user.status}
                  </span>
                </dd>
              </div>
              <div><dt className="text-[var(--color-text-tertiary)]">가입일</dt><dd className="mt-0.5">{new Date(user.createdAt).toLocaleDateString("ko-KR")}</dd></div>
              <div><dt className="text-[var(--color-text-tertiary)]">추천 코드</dt><dd className="font-mono text-xs mt-0.5">{user.referralCode}</dd></div>
              {user.referredBy && <div><dt className="text-[var(--color-text-tertiary)]">추천인</dt><dd className="mt-0.5">{user.referredBy.nickname}</dd></div>}
              {categories.length > 0 && (
                <div className="col-span-2"><dt className="text-[var(--color-text-tertiary)]">관심 카테고리</dt><dd className="mt-0.5 text-xs text-[var(--color-text-secondary)]">{categories.join(", ")}</dd></div>
              )}
              {user.suspensionReason && (
                <div className="col-span-2"><dt className="text-[var(--color-text-tertiary)] text-red-600">정지 사유</dt><dd className="mt-0.5 text-red-700 text-xs">{user.suspensionReason}</dd></div>
              )}
            </dl>
          </div>

          {/* Beta/Plan Info */}
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">베타/요금제 정보</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><dt className="text-[var(--color-text-tertiary)]">희망 요금제</dt><dd className="mt-0.5">{PLAN_LABELS[user.desiredPlanCode] ?? user.desiredPlanCode}</dd></div>
              <div><dt className="text-[var(--color-text-tertiary)]">현재 요금제</dt><dd className="mt-0.5 font-medium">{user.subscription ? (PLAN_LABELS[user.subscription.plan.code] ?? user.subscription.plan.code) : "—"}</dd></div>
              {user.subscription?.betaApprovedAt && (
                <div><dt className="text-[var(--color-text-tertiary)]">베타 승인일</dt><dd className="mt-0.5">{new Date(user.subscription.betaApprovedAt).toLocaleDateString("ko-KR")}</dd></div>
              )}
            </dl>
          </div>

          {/* Score Ledger */}
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">점수 원장 (최근 20건)</h2>
              <Link href={`/admin/scores/ledger?search=${user.email}`} className="text-xs text-[var(--color-accent-primary)] hover:underline">전체 보기 →</Link>
            </div>
            {user.scoreLedgers.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">점수 변동 내역이 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--color-border-default)]">
                      <th className="pb-2 text-left text-[var(--color-text-tertiary)] font-medium">일시</th>
                      <th className="pb-2 text-left text-[var(--color-text-tertiary)] font-medium">유형</th>
                      <th className="pb-2 text-right text-[var(--color-text-tertiary)] font-medium">변동</th>
                      <th className="pb-2 text-right text-[var(--color-text-tertiary)] font-medium">변동전</th>
                      <th className="pb-2 text-right text-[var(--color-text-tertiary)] font-medium">변동후</th>
                      <th className="pb-2 text-left text-[var(--color-text-tertiary)] font-medium">사유</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-default)]">
                    {user.scoreLedgers.map((l) => {
                      const before = l.balanceAfter - l.amount;
                      return (
                        <tr key={l.id}>
                          <td className="py-2 text-[var(--color-text-tertiary)] whitespace-nowrap">
                            {new Date(l.createdAt).toLocaleDateString("ko-KR")}
                          </td>
                          <td className="py-2 text-[var(--color-text-secondary)]">
                            {SCORE_TYPE_LABELS[l.type] ?? l.type}
                          </td>
                          <td className={`py-2 text-right font-medium tabular-nums ${l.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                            {l.amount > 0 ? "+" : ""}{l.amount.toLocaleString()}
                          </td>
                          <td className="py-2 text-right tabular-nums text-[var(--color-text-secondary)]">{before.toLocaleString()}</td>
                          <td className="py-2 text-right tabular-nums font-medium">{l.balanceAfter.toLocaleString()}</td>
                          <td className="py-2 text-[var(--color-text-tertiary)] max-w-[120px] truncate">{l.description ?? "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Audit Logs */}
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5">
            <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4">관리자 작업 이력 (최근 20건)</h2>
            {user.auditLogs.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">작업 이력이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {user.auditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-medium text-[var(--color-text-primary)]">{ACTION_LABELS[log.action] ?? log.action}</span>
                      {log.actor && <span className="text-[var(--color-text-secondary)] ml-1.5">by {log.actor.nickname}</span>}
                    </div>
                    <time className="text-[var(--color-text-tertiary)] whitespace-nowrap ml-4">
                      {new Date(log.createdAt).toLocaleDateString("ko-KR")}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: actions + score summary */}
        <div className="space-y-4">
          {/* Score Summary */}
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">점수 현황</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">보유 점수</span>
                <span className="font-bold text-[var(--color-accent-primary)] tabular-nums">{score.toLocaleString()}점</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">누적 점수</span>
                <span className="tabular-nums">{(user.profile?.totalScore ?? 0).toLocaleString()}점</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <UserDetailActions
            userId={user.id}
            nickname={user.nickname}
            currentScore={score}
            currentStatus={user.status}
            currentPlanCode={user.subscription?.plan.code}
            isSuperAdmin={isSuperAdmin}
          />
        </div>
      </div>
    </div>
  );
}
