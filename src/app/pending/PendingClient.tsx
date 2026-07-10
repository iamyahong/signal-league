"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { Clock, CheckCircle, LogOut, Mail, RefreshCw } from "lucide-react";

interface Plan {
  id: string;
  code: string;
  name: string;
  priceKrw: number;
  monthlyScore: number;
}

interface Props {
  user: {
    id: string;
    email: string;
    nickname: string;
    desiredPlanCode: string;
    createdAt: Date;
    profile: { favoriteCategories: string[] } | null;
    subscription: { plan: Plan } | null;
  };
  plans: Plan[];
  isEmailVerified: boolean;
  isGoogleUser: boolean;
}

const CATEGORY_NAMES: Record<string, string> = {
  economy: "경제·금융",
  international: "국제정세",
  society: "사회",
  tech: "기술·AI",
  culture: "문화·엔터",
  sports: "스포츠",
};

export function PendingClient({ user, plans, isEmailVerified, isGoogleUser }: Props) {
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(user.desiredPlanCode);
  const [updating, setUpdating] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(user.subscription?.plan || null);
  const [resending, setResending] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams?.get("verified") === "1") {
      toast.success("이메일 인증이 완료되었습니다! 베타 승인을 기다려 주세요.");
    }
  }, [searchParams]);

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const res = await fetch("/internal/verify-email/send", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "재발송 중 오류가 발생했습니다");
        return;
      }
      toast.success("인증 메일을 재발송했습니다. 메일함을 확인해 주세요.");
    } catch {
      toast.error("재발송 중 오류가 발생했습니다");
    } finally {
      setResending(false);
    }
  };

  const handleUpdatePlan = async () => {
    if (selectedPlan === user.desiredPlanCode) {
      setShowPlanModal(false);
      return;
    }
    setUpdating(true);
    try {
      const res = await fetch("/internal/pending/update-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "요금제 변경 중 오류가 발생했습니다");
        return;
      }
      const newPlan = plans.find((p) => p.code === selectedPlan);
      if (newPlan) setCurrentPlan(newPlan);
      toast.success("희망 요금제가 변경되었습니다");
      setShowPlanModal(false);
    } catch {
      toast.error("요금제 변경 중 오류가 발생했습니다");
    } finally {
      setUpdating(false);
    }
  };

  const showEmailBanner = !isGoogleUser && !isEmailVerified;

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Email verification banner */}
      {showEmailBanner && (
        <div className="rounded-[var(--radius-xl)] border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-blue-800 mb-1">이메일 인증 후 베타 승인 진행</p>
              <p className="text-xs text-blue-700 leading-relaxed mb-3">
                <strong>{user.email}</strong>으로 발송된 인증 메일을 확인하고 인증을 완료해 주세요.
                인증 전에는 베타 승인이 진행되지 않습니다.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleResendVerification}
                loading={resending}
                className="flex items-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                인증 메일 재발송
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Status header */}
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#e8f4fd] mb-4">
          <Clock className="h-8 w-8 text-[var(--color-accent-primary)]" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">베타 신청이 완료되었습니다</h1>
        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-sm mx-auto">
          운영자 승인 후 선택한 요금제 기준의 베타 점수가 지급되며, Signal League의 예측 리그에 참여할 수 있습니다.
        </p>
      </div>

      {/* Info card */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">신청 정보</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">신청일</span>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{formatDate(user.createdAt)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">닉네임</span>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">{user.nickname}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">이메일 인증</span>
            <Badge variant={isEmailVerified || isGoogleUser ? "success" : "warning"}>
              {isGoogleUser ? "Google 인증 완료" : isEmailVerified ? "인증 완료" : "인증 대기"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">희망 요금제</span>
            <div className="flex items-center gap-2">
              <Badge variant="info">{currentPlan?.name || user.desiredPlanCode}</Badge>
              <button
                onClick={() => setShowPlanModal(true)}
                className="text-xs text-[var(--color-accent-primary)] hover:underline"
              >
                변경
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--color-text-secondary)]">승인 시 지급 점수</span>
            <span className="text-sm font-semibold text-[var(--color-accent-success)]">
              월 {(currentPlan?.monthlyScore ?? 0).toLocaleString()}점
            </span>
          </div>
          {user.profile?.favoriteCategories && user.profile.favoriteCategories.length > 0 && (
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs text-[var(--color-text-secondary)] mt-0.5">관심 카테고리</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {user.profile.favoriteCategories.map((cat) => (
                  <Badge key={cat} variant="default">{CATEGORY_NAMES[cat] || cat}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Score policy */}
      <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-xl)] p-4">
        <div className="flex items-start gap-2">
          <CheckCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 leading-relaxed">
            Signal League의 점수는 현금, 상품권, 모바일쿠폰, 가상자산, 외부 포인트로 환전·교환·양도·판매할 수 없는 비금전성 서비스 점수입니다.
          </p>
        </div>
      </div>

      <Button
        variant="ghost"
        className="w-full flex items-center gap-2 text-[var(--color-text-secondary)]"
        onClick={() => signOut({ callbackUrl: "/" })}
      >
        <LogOut className="h-4 w-4" />
        로그아웃
      </Button>

      {/* Plan change modal */}
      {showPlanModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPlanModal(false); }}
          role="dialog"
          aria-modal="true"
          aria-label="요금제 변경"
        >
          <div className="bg-white rounded-[var(--radius-xl)] p-6 w-full max-w-sm mx-4 shadow-[var(--shadow-lg)]">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-4">희망 요금제 변경</h3>
            <div className="space-y-2 mb-4">
              {plans.map((plan) => (
                <label key={plan.code} className={`flex items-center justify-between p-3 rounded-[var(--radius-lg)] border cursor-pointer transition-colors ${selectedPlan === plan.code ? "border-[var(--color-accent-primary)] bg-[#e8f4fd]" : "border-[var(--color-border-default)] hover:bg-[var(--color-surface-muted)]"}`}>
                  <div className="flex items-center gap-2.5">
                    <input type="radio" name="planModal" value={plan.code} checked={selectedPlan === plan.code} onChange={() => setSelectedPlan(plan.code)} className="accent-[var(--color-accent-primary)]" />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{plan.name}</span>
                  </div>
                  <span className="text-xs text-[var(--color-accent-success)] font-semibold">월 {plan.monthlyScore.toLocaleString()}점</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-4">베타 기간 중 실제 결제는 진행되지 않습니다.</p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowPlanModal(false)}>취소</Button>
              <Button variant="primary" className="flex-1" onClick={handleUpdatePlan} loading={updating}>변경 완료</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
