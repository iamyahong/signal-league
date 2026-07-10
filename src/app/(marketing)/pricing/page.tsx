import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "요금제 — Signal League",
  description: "Signal League 베타 요금제를 확인하고 신청하세요. Basic, Standard, Pro 3가지 요금제 중 선택하세요.",
};

const plans = [
  {
    code: "basic",
    name: "Basic",
    price: "1,100",
    score: "1,000",
    target: "예측 리그 입문자",
    features: ["월 1,000점 지급", "예측 문제 참여", "랭킹 기록", "기본 통계 제공"],
    featured: false,
  },
  {
    code: "standard",
    name: "Standard",
    price: "3,900",
    score: "4,000",
    target: "일반 사용자",
    features: ["월 4,000점 지급", "예측 문제 참여 및 생성", "랭킹 기록", "분야별 통계", "참여 이력 분석"],
    featured: true,
  },
  {
    code: "pro",
    name: "Pro",
    price: "9,900",
    score: "10,000",
    target: "적극적인 예측 참여자",
    features: ["월 10,000점 지급", "예측 문제 참여 및 생성", "랭킹 기록", "심화 통계 및 분석", "우선 검토 혜택"],
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div className="py-12 md:py-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-3">요금제 안내</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">요금제에 따라 매월 지급되는 점수가 다릅니다. 활동 계획에 맞게 선택하세요.</p>
        </div>

        {/* Beta notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-[var(--radius-xl)] p-4 mb-8">
          <p className="text-sm text-blue-800 text-center leading-relaxed">
            현재 Signal League는 베타 운영 중입니다. 실제 결제는 진행되지 않으며, 선택한 요금제는 베타 승인 시 지급될 점수 기준으로만 사용됩니다.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {plans.map((plan) => (
            <div
              key={plan.code}
              className={`relative rounded-[var(--radius-xl)] border p-6 flex flex-col ${
                plan.featured
                  ? "border-[var(--color-accent-primary)] ring-2 ring-[var(--color-accent-primary)]/20 shadow-[var(--shadow-md)] bg-white"
                  : "border-[var(--color-border-default)] shadow-[var(--shadow-sm)] bg-white"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-accent-primary)] text-white text-xs font-semibold px-3 py-1 rounded-full">
                  인기
                </div>
              )}
              <div className="mb-4">
                <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-1">추천 대상: {plan.target}</div>
                <div className="text-xl font-bold text-[var(--color-text-primary)]">{plan.name}</div>
                <div className="flex items-end gap-1 mt-2">
                  <span className="text-3xl font-black text-[var(--color-text-primary)]">{plan.price}원</span>
                  <span className="text-sm text-[var(--color-text-secondary)] mb-1">/월</span>
                </div>
                <div className="text-sm font-semibold text-[var(--color-accent-success)] mt-1">
                  월 {plan.score}점 지급
                </div>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                    <CheckCircle className="h-4 w-4 text-[var(--color-accent-success)] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link href={`/signup?plan=${plan.code}`}>
                <Button
                  variant={plan.featured ? "primary" : "secondary"}
                  className="w-full"
                >
                  이 요금제로 신청
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* Score policy */}
        <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-5">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">점수 정책 안내</h3>
          <div className="space-y-2 text-xs text-[var(--color-text-secondary)] leading-relaxed">
            <p>• Signal League의 점수는 현금, 상품권, 모바일쿠폰, 가상자산으로 교환되지 않습니다.</p>
            <p>• 점수는 오직 예측 참여, 문제 생성, 랭킹, 통계 표시를 위한 서비스 내 점수입니다.</p>
            <p>• 점수는 타 회원에게 양도하거나 외부 서비스와 연동할 수 없습니다.</p>
            <p>• 구독을 취소하거나 계정이 정지되면 잔여 점수는 소멸됩니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
