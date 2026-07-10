import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { KPICard } from "./_components/KPICard";
import { UserStatus, ScoreLedgerType, QuestionStatus } from "@prisma/client";
import { PLAN_LABELS } from "@/lib/constants/scoreLedger";
import { AlertCircle, Clock, ClipboardList } from "lucide-react";

async function getDashboardData() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers, betaActive, pendingBeta, suspended, todayNew,
    totalIssuedScore, totalAvailableScore, recentAdjustments,
    recentAuditLogs, planDistribution, pendingPlanDistribution,
    pendingReviewCount, openQuestionCount, closedCount, overdueCount,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { status: UserStatus.BETA_ACTIVE } }),
    prisma.user.count({ where: { status: UserStatus.PENDING_BETA } }),
    prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
    prisma.user.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.scoreLedger.aggregate({ where: { amount: { gt: 0 }, deletedAt: null }, _sum: { amount: true } }),
    prisma.userProfile.aggregate({ _sum: { availableScore: true } }),
    prisma.scoreLedger.count({
      where: {
        type: { in: [ScoreLedgerType.ADMIN_ADJUST_ADD, ScoreLedgerType.ADMIN_ADJUST_SUBTRACT] },
        createdAt: { gte: sevenDaysAgo }, deletedAt: null,
      },
    }),
    prisma.auditLog.findMany({
      where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 10,
      include: { actor: { select: { nickname: true } } },
    }),
    prisma.subscription.groupBy({
      by: ["planId"], where: { status: "BETA_ACTIVE", deletedAt: null }, _count: { _all: true },
    }),
    prisma.user.groupBy({
      by: ["desiredPlanCode"], where: { status: UserStatus.PENDING_BETA, deletedAt: null }, _count: { _all: true },
    }),
    prisma.predictionQuestion.count({ where: { status: QuestionStatus.PENDING_REVIEW, deletedAt: null } }),
    prisma.predictionQuestion.count({ where: { status: QuestionStatus.OPEN, deletedAt: null } }),
    prisma.predictionQuestion.count({ where: { status: QuestionStatus.CLOSED, deletedAt: null } }),
    prisma.predictionQuestion.count({ where: { status: QuestionStatus.CLOSED, deletedAt: null, resolvesAt: { lte: now } } }),
  ]);

  const planIds = planDistribution.map((p) => p.planId);
  const plans = planIds.length ? await prisma.plan.findMany({ where: { id: { in: planIds } } }) : [];

  return {
    totalUsers, betaActive, pendingBeta, suspended, todayNew,
    totalIssuedScore: totalIssuedScore._sum.amount ?? 0,
    totalAvailableScore: totalAvailableScore._sum.availableScore ?? 0,
    recentAdjustments, recentAuditLogs,
    planDistribution: planDistribution.map((p) => ({
      planCode: plans.find((pl) => pl.id === p.planId)?.code ?? p.planId,
      count: p._count._all,
    })),
    pendingPlanDistribution: pendingPlanDistribution.map((p) => ({
      planCode: p.desiredPlanCode, count: p._count._all,
    })),
    pendingReviewCount,
    openQuestionCount,
    closedCount,
    overdueCount,
  };
}

const ACTION_LABELS: Record<string, string> = {
  BETA_APPROVE: "베타 승인", BETA_REJECT: "베타 거절", BETA_HOLD: "베타 보류",
  SCORE_ADJUST_ADD: "점수 지급", SCORE_ADJUST_SUBTRACT: "점수 차감",
  USER_SUSPEND: "회원 정지", USER_UNSUSPEND: "정지 해제",
  PLAN_CHANGE: "요금제 변경", SETTINGS_UPDATE: "설정 변경",
  ADMIN_ROLE_GRANT: "관리자 권한 부여", ADMIN_ROLE_REVOKE: "관리자 권한 회수",
  QUESTION_APPROVE: "예측 문제 승인", QUESTION_REJECT: "예측 문제 반려",
  QUESTION_HIDE: "예측 문제 숨김", QUESTION_FORCE_CLOSE: "강제 마감",
  QUESTION_RESOLVE: "결과 확정", QUESTION_VOID: "예측 무효 처리", AUTO_CLOSE_QUESTION: "자동 마감",
  CATEGORY_CREATE: "카테고리 생성", CATEGORY_UPDATE: "카테고리 수정", CATEGORY_DELETE: "카테고리 삭제",
};

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const d = await getDashboardData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">관리자 대시보드</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">Signal League 운영 현황</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPICard label="전체 회원" value={d.totalUsers} />
        <KPICard label="베타 활성" value={d.betaActive} accent />
        <KPICard label="베타 대기" value={d.pendingBeta} />
        <KPICard label="정지 회원" value={d.suspended} />
        <KPICard label="오늘 신규" value={d.todayNew} />
        <KPICard label="총 발행 점수" value={`${d.totalIssuedScore.toLocaleString()}점`} />
        <KPICard label="총 보유 점수" value={`${d.totalAvailableScore.toLocaleString()}점`} />
        <KPICard label="수동 조정(7일)" value={`${d.recentAdjustments}건`} />
        <KPICard label="진행 중 예측 문제" value={`${d.openQuestionCount}개`} accent />
        <KPICard label="검토 대기 예측 문제" value={`${d.pendingReviewCount}개`} />
        <KPICard label="결과 확정 대기" value={`${d.closedCount}개`} accent={d.closedCount > 0} />
        <KPICard label="결과 확정 지연" value={`${d.overdueCount}개`} />
      </div>

      {d.pendingReviewCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-xl)] p-4 flex items-start gap-3">
          <ClipboardList className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">예측 문제 검토 필요</p>
            <p className="text-sm text-amber-700 mt-0.5">
              검토 대기 <strong>{d.pendingReviewCount}건</strong>이 있습니다.{" "}
              <Link href="/admin/predictions/review" className="underline font-medium">바로 검토하기 →</Link>
            </p>
          </div>
        </div>
      )}
      {d.overdueCount > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-[var(--radius-xl)] p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">결과 확정 지연</p>
            <p className="text-sm text-red-700 mt-0.5">
              확정 예정일이 지난 마감 문제 <strong>{d.overdueCount}건</strong>이 있습니다.{" "}
              <Link href="/admin/results?filter=overdue" className="underline font-medium">바로 처리하기 →</Link>
            </p>
          </div>
        </div>
      )}
      {d.closedCount > 0 && d.overdueCount === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-[var(--radius-xl)] p-4 flex items-start gap-3">
          <ClipboardList className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-800">결과 확정 대기</p>
            <p className="text-sm text-blue-700 mt-0.5">
              마감된 예측 문제 <strong>{d.closedCount}건</strong>의 결과를 확정해주세요.{" "}
              <Link href="/admin/results" className="underline font-medium">결과 확정 큐 →</Link>
            </p>
          </div>
        </div>
      )}

      {d.pendingBeta > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-xl)] p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">즉시 처리 필요</p>
            <p className="text-sm text-amber-700 mt-0.5">
              베타 승인 대기 <strong>{d.pendingBeta}건</strong>이 있습니다.{" "}
              <Link href="/admin/beta/pending" className="underline font-medium">바로 처리하기 →</Link>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">베타 활성 요금제 분포</h2>
          {d.planDistribution.length === 0 ? (
            <p className="text-xs text-[var(--color-text-tertiary)]">데이터 없음</p>
          ) : (
            <div className="space-y-2">
              {d.planDistribution.map((p) => (
                <div key={String(p.planCode)} className="flex items-center gap-2 text-sm">
                  <span className="w-16 text-[var(--color-text-secondary)]">{PLAN_LABELS[String(p.planCode)] ?? p.planCode}</span>
                  <div className="flex-1 h-2 bg-[var(--color-surface-muted)] rounded-full">
                    <div className="h-full bg-[var(--color-accent-primary)] rounded-full" style={{ width: `${Math.max(8, (p.count / Math.max(d.betaActive, 1)) * 100)}%` }} />
                  </div>
                  <span className="text-[var(--color-text-tertiary)] w-8 text-right">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">베타 대기 희망 요금제</h2>
          {d.pendingPlanDistribution.length === 0 ? (
            <p className="text-xs text-[var(--color-text-tertiary)]">대기 회원 없음</p>
          ) : (
            <div className="space-y-2">
              {d.pendingPlanDistribution.map((p) => (
                <div key={String(p.planCode)} className="flex items-center gap-2 text-sm">
                  <span className="w-16 text-[var(--color-text-secondary)]">{PLAN_LABELS[String(p.planCode)] ?? p.planCode}</span>
                  <div className="flex-1 h-2 bg-[var(--color-surface-muted)] rounded-full">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.max(8, (p.count / Math.max(d.pendingBeta, 1)) * 100)}%` }} />
                  </div>
                  <span className="text-[var(--color-text-tertiary)] w-8 text-right">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">최근 운영 활동</h2>
        </div>
        {d.recentAuditLogs.length === 0 ? (
          <p className="text-sm text-[var(--color-text-tertiary)]">운영 이력이 없습니다.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border-default)]">
            {d.recentAuditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="font-medium text-[var(--color-text-primary)]">{ACTION_LABELS[log.action] ?? log.action}</span>
                  {log.actor && <span className="text-[var(--color-text-secondary)] ml-1.5">by {log.actor.nickname}</span>}
                  {log.targetId && <span className="text-[var(--color-text-tertiary)] ml-1.5">→ {log.targetType}/{log.targetId.slice(0, 8)}</span>}
                </div>
                <time className="text-[10px] text-[var(--color-text-tertiary)] whitespace-nowrap shrink-0">
                  {new Date(log.createdAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </time>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
