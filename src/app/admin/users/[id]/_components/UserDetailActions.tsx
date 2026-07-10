"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmActionModal } from "@/app/admin/_components/ConfirmActionModal";
import { ScoreAdjustModal } from "@/app/admin/_components/ScoreAdjustModal";
import { PlanCode, UserStatus } from "@prisma/client";

interface Props {
  userId: string;
  nickname: string;
  currentScore: number;
  currentStatus: UserStatus;
  currentPlanCode?: PlanCode;
  isSuperAdmin: boolean;
}

type ModalType = "approve" | "reject" | "suspend" | "unsuspend" | "score-add" | "score-sub" | "change-plan" | null;

const PLAN_OPTIONS = [
  { code: PlanCode.BASIC, label: "Basic (1,000점)" },
  { code: PlanCode.STANDARD, label: "Standard (4,000점)" },
  { code: PlanCode.PRO, label: "Pro (10,000점)" },
] as const;

export function UserDetailActions({ userId, nickname, currentScore, currentStatus, currentPlanCode, isSuperAdmin }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalType>(null);
  const [approvalPlan, setApprovalPlan] = useState<PlanCode>(PlanCode.BASIC);
  const [newPlan, setNewPlan] = useState<PlanCode>(currentPlanCode ?? PlanCode.BASIC);

  const post = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(`/internal/admin/users/${userId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "오류가 발생했습니다.");
    return data;
  };

  const refresh = () => router.refresh();

  return (
    <>
      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">관리자 액션</h3>

        {currentStatus === UserStatus.PENDING_BETA && (
          <div className="space-y-2">
            <p className="text-xs text-[var(--color-text-secondary)]">베타 승인</p>
            <div className="grid grid-cols-1 gap-1.5">
              {PLAN_OPTIONS.map(({ code, label }) => (
                <Button key={code} variant="primary" size="sm" className="justify-start" onClick={() => { setApprovalPlan(code); setModal("approve"); }}>
                  {label} 승인
                </Button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="w-full border border-[var(--color-border-default)]" onClick={() => setModal("reject")}>거절</Button>
          </div>
        )}

        {currentStatus === UserStatus.BETA_ACTIVE && (
          <div className="space-y-1.5">
            <Button variant="secondary" size="sm" className="w-full" onClick={() => setModal("change-plan")}>요금제 변경</Button>
            <Button variant="ghost" size="sm" className="w-full text-red-600 border border-red-200 hover:bg-red-50" onClick={() => setModal("suspend")}>계정 정지</Button>
          </div>
        )}

        {currentStatus === UserStatus.SUSPENDED && (
          <Button variant="primary" size="sm" className="w-full" onClick={() => setModal("unsuspend")}>정지 해제</Button>
        )}

        <div className="border-t border-[var(--color-border-default)] pt-3 space-y-1.5">
          <p className="text-xs text-[var(--color-text-secondary)]">점수 조정</p>
          <Button variant="secondary" size="sm" className="w-full" onClick={() => setModal("score-add")}>점수 지급</Button>
          <Button variant="ghost" size="sm" className="w-full border border-[var(--color-border-default)]" onClick={() => setModal("score-sub")}>점수 차감</Button>
        </div>
      </div>

      {/* Approve Modal */}
      {modal === "approve" && (
        <ConfirmActionModal
          title={`베타 승인 — ${nickname}`}
          description={`${nickname}님을 ${approvalPlan} 요금제로 베타 승인합니다. 요금제 기준 점수가 즉시 지급됩니다.`}
          confirmLabel="승인 확인"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await post("approve", { planCode: approvalPlan, reason });
            toast.success("베타 승인 완료");
            refresh();
          }}
        />
      )}

      {/* Reject Modal */}
      {modal === "reject" && (
        <ConfirmActionModal
          title={`베타 거절 — ${nickname}`}
          description="이 회원의 베타 신청을 거절합니다. 거절 처리 시 계정이 정지됩니다."
          confirmLabel="거절 확인"
          confirmVariant="danger"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await post("reject", { action: "reject", reason });
            toast.success("거절 처리 완료");
            refresh();
          }}
        />
      )}

      {/* Suspend Modal */}
      {modal === "suspend" && (
        <ConfirmActionModal
          title={`계정 정지 — ${nickname}`}
          description="회원의 서비스 이용을 중지합니다. 정지 후 로그인 시 /suspended 페이지로 이동됩니다."
          confirmLabel="정지 확인"
          confirmVariant="danger"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await post("suspend", { reason });
            toast.success("정지 처리 완료");
            refresh();
          }}
        />
      )}

      {/* Unsuspend Modal */}
      {modal === "unsuspend" && (
        <ConfirmActionModal
          title={`정지 해제 — ${nickname}`}
          description="회원의 정지를 해제하고 서비스 이용을 재개합니다."
          confirmLabel="해제 확인"
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await post("unsuspend", { reason });
            toast.success("정지 해제 완료");
            refresh();
          }}
        />
      )}

      {/* Change Plan Modal */}
      {modal === "change-plan" && (
        <ConfirmActionModal
          title={`요금제 변경 — ${nickname}`}
          description="요금제를 변경합니다. 추가 점수 지급은 별도로 처리해 주세요."
          preview={
            <div className="space-y-2">
              <p className="text-xs text-[var(--color-text-secondary)]">변경할 요금제 선택</p>
              <div className="flex gap-2">
                {PLAN_OPTIONS.map(({ code, label }) => (
                  <button
                    key={code}
                    onClick={() => setNewPlan(code)}
                    className={`flex-1 py-1.5 rounded text-xs font-medium border ${newPlan === code ? "bg-[var(--color-accent-primary)] text-white border-[var(--color-accent-primary)]" : "bg-white text-[var(--color-text-secondary)] border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]"}`}
                  >
                    {label.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>
          }
          onClose={() => setModal(null)}
          onConfirm={async (reason) => {
            await post("change-plan", { planCode: newPlan, reason });
            toast.success("요금제 변경 완료");
            refresh();
          }}
        />
      )}

      {/* Score Adjust Modals */}
      {modal === "score-add" && (
        <ScoreAdjustModal userId={userId} nickname={nickname} currentScore={currentScore} direction="add" onClose={() => setModal(null)} onSuccess={refresh} />
      )}
      {modal === "score-sub" && (
        <ScoreAdjustModal userId={userId} nickname={nickname} currentScore={currentScore} direction="subtract" onClose={() => setModal(null)} onSuccess={refresh} />
      )}
    </>
  );
}
