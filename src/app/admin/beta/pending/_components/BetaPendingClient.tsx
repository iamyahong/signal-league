"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmActionModal } from "@/app/admin/_components/ConfirmActionModal";
import { PLAN_LABELS } from "@/lib/constants/scoreLedger";
import { PlanCode } from "@prisma/client";

interface PendingUser {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
  desiredPlanCode: PlanCode;
  categories: string[];
  joinPurpose: string | null;
  referredBy: string | null;
}

interface ApproveTarget {
  userId: string;
  nickname: string;
  planCode: PlanCode;
}

const PLAN_SCORE: Record<PlanCode, number> = {
  BASIC: 1000,
  STANDARD: 4000,
  PRO: 10000,
};

export function BetaPendingClient({ users: initialUsers }: { users: PendingUser[] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [target, setTarget] = useState<ApproveTarget | null>(null);

  const handleApprove = async (reason: string) => {
    if (!target) return;
    const res = await fetch(`/internal/admin/users/${target.userId}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCode: target.planCode, reason }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
    toast.success(`${target.nickname}님 ${PLAN_LABELS[target.planCode]} 요금제로 승인 완료`);
    setUsers((prev) => prev.filter((u) => u.id !== target.userId));
    router.refresh();
  };

  return (
    <>
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">신청일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">닉네임/이메일</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">희망 요금제</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">관심 카테고리</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">가입 목적</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">추천인</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">빠른 승인</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border-default)]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[var(--color-surface-muted)]">
                  <td className="px-4 py-3 text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[var(--color-text-primary)]">{u.nickname}</p>
                    <p className="text-xs text-[var(--color-text-tertiary)]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {PLAN_LABELS[u.desiredPlanCode]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)] max-w-[140px]">
                    {u.categories.length > 0 ? u.categories.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)] max-w-[140px] truncate">
                    {u.joinPurpose ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">{u.referredBy ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {([PlanCode.BASIC, PlanCode.STANDARD, PlanCode.PRO] as PlanCode[]).map((code) => (
                        <Button
                          key={code}
                          variant="secondary"
                          size="sm"
                          className="text-xs px-2"
                          onClick={() => setTarget({ userId: u.id, nickname: u.nickname, planCode: code })}
                        >
                          {PLAN_LABELS[code]}
                        </Button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {target && (
        <ConfirmActionModal
          title={`베타 승인 — ${target.nickname}`}
          description={`${target.nickname}님을 ${PLAN_LABELS[target.planCode]} 요금제로 승인하시겠습니까?`}
          preview={
            <div className="text-xs space-y-1">
              <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">부여할 요금제</span><span className="font-semibold">{PLAN_LABELS[target.planCode]}</span></div>
              <div className="flex justify-between"><span className="text-[var(--color-text-secondary)]">지급될 점수</span><span className="font-semibold text-green-600">+{PLAN_SCORE[target.planCode].toLocaleString()}점</span></div>
            </div>
          }
          requireReason={false}
          reasonLabel="관리자 메모 (선택)"
          confirmLabel="승인 확인"
          onClose={() => setTarget(null)}
          onConfirm={handleApprove}
        />
      )}
    </>
  );
}
