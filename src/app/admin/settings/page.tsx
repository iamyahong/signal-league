import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { AdminSettingsClient } from "./_components/AdminSettingsClient";

const SETTING_LABELS: Record<string, { label: string; description: string }> = {
  question_create_min_ratio: { label: "문제 생성 최소 비율", description: "문제 생성 시 최소 점수 비율" },
  question_create_min_score: { label: "문제 생성 최소 점수", description: "문제 생성 시 필요한 최소 보유 점수" },
  question_create_max_score: { label: "문제 생성 최대 점수", description: "문제 생성 시 설정 가능한 최대 점수" },
  prediction_min_allocate: { label: "예측 참여 최소 점수", description: "예측에 배분할 수 있는 최소 점수" },
  prediction_win_multiplier: { label: "적중 성공 계수", description: "예측 성공 시 보상 배율" },
  dispute_period_hours: { label: "이의제기 가능 시간(시간)", description: "결과 확정 후 이의제기 가능한 시간" },
};

async function getSettingsData() {
  const [settings, adminRoles] = await Promise.all([
    prisma.serviceSetting.findMany({ where: { deletedAt: null }, orderBy: { key: "asc" } }),
    prisma.userRole.findMany({
      where: { deletedAt: null },
      include: { user: { select: { id: true, email: true, nickname: true, status: true } } },
    }),
  ]);
  return { settings, adminRoles };
}

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[]) || [];
  const isSuperAdmin = roles.includes("SUPER_ADMIN");
  const isAdmin = isSuperAdmin || roles.includes("OPERATOR");
  if (!isAdmin) redirect("/home");

  const { settings, adminRoles } = await getSettingsData();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">서비스 설정</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {isSuperAdmin ? "설정 변경 가능 (SUPER_ADMIN)" : "조회만 가능 (OPERATOR는 변경 불가)"}
        </p>
      </div>

      {!isSuperAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-xl)] p-3 text-sm text-amber-800">
          OPERATOR 권한으로는 설정을 조회만 할 수 있습니다. 변경은 SUPER_ADMIN에게 요청하세요.
        </div>
      )}

      <AdminSettingsClient
        settings={settings.map((s) => ({
          id: s.id,
          key: s.key,
          value: s.value,
          label: SETTING_LABELS[s.key]?.label ?? s.key,
          description: SETTING_LABELS[s.key]?.description ?? "",
        }))}
        adminRoles={adminRoles.map((r) => ({
          id: r.id,
          role: r.role,
          userId: r.user.id,
          email: r.user.email,
          nickname: r.user.nickname,
        }))}
        isSuperAdmin={isSuperAdmin}
        currentUserId={session.user.id}
      />
    </div>
  );
}
