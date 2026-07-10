import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "점수 정책 — Signal League",
};

export default function ScorePolicyPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">점수 정책</h1>
        </div>

        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">핵심 안내</p>
          <p className="text-sm text-amber-700 leading-relaxed">
            Signal League의 점수는 현금, 상품권, 모바일쿠폰, 가상자산, 외부 포인트로{" "}
            <strong className="font-semibold">환전·교환·양도·판매할 수 없는 비금전성 서비스 점수</strong>입니다.
          </p>
          <p className="text-sm text-amber-700 leading-relaxed mt-1">
            점수는 오직 서비스 내 예측 참여, 문제 생성, 랭킹 산정, 프로필 및 통계 표시를 위해 사용됩니다.
          </p>
        </div>

        <div className="space-y-0">
          <Section title="1. 점수의 성격">
            <ol>
              <li>점수는 Signal League 내부에서만 사용되는 서비스 점수이며, 어떠한 금전적 가치도 가지지 않습니다.</li>
              <li>점수는 현금, 상품권, 모바일쿠폰, 가상자산, 타사 포인트 등으로 환전·교환할 수 없습니다.</li>
              <li>회원 간 점수의 거래, 양도, 선물, 판매는 금지됩니다.</li>
              <li>점수의 증감은 서비스 내 예측 활동의 결과를 표시하는 지표일 뿐, 실제 금전적 손익이 아닙니다.</li>
            </ol>
          </Section>

          <Section title="2. 점수의 지급">
            <p>베타 운영 단계에서 점수는 다음과 같이 지급됩니다.</p>
            <ul>
              <li>베타 승인 시 선택한 요금제 기준의 점수 지급
                <ul className="mt-1 space-y-0.5 pl-4 list-none">
                  <li className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">Basic</span><span>월 1,000점</span></li>
                  <li className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">Standard</span><span>월 4,000점</span></li>
                  <li className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">Pro</span><span>월 10,000점</span></li>
                </ul>
              </li>
              <li>추천 활동 등 운영 정책에 따른 보너스 점수</li>
              <li>운영자 판단에 따른 보정 점수</li>
            </ul>
            <p className="text-[var(--color-text-tertiary)] text-xs mt-2">※ 베타 운영 단계에서는 실제 결제가 발생하지 않으며, 요금제는 지급 점수의 기준으로만 사용됩니다.</p>
          </Section>

          <Section title="3. 점수의 사용">
            <p>점수는 다음 활동에 사용됩니다.</p>

            <SubTitle>가. 예측 참여</SubTitle>
            <ul>
              <li>회원은 예측 문제의 선택지에 점수를 배분하여 참여합니다.</li>
              <li>결과 확정 시 적중 여부에 따라 점수가 반영되거나 소진됩니다.</li>
              <li>적중 시 배분 점수에 성공 계수를 적용한 점수가 성과 점수로 반영됩니다.</li>
              <li>비적중 시 배분한 점수는 소진됩니다.</li>
            </ul>

            <SubTitle>나. 예측 문제 생성</SubTitle>
            <ul>
              <li>회원이 예측 문제를 생성할 때 보유 점수의 일정 비율(최소 5%) 이상을 생성 비용으로 소진합니다.</li>
              <li>문제가 운영자에 의해 반려되는 경우, 운영 정책에 따라 생성 비용이 반환될 수 있습니다.</li>
            </ul>
          </Section>

          <Section title="4. 점수의 반환 및 무효 처리">
            <ol>
              <li>예측 문제가 무효 처리되는 경우, 해당 문제에 배분한 점수는 반환됩니다.</li>
              <li>운영자의 명백한 오류로 인한 점수 변동은 보정될 수 있습니다.</li>
              <li>점수 반환·보정 내역은 점수 원장에 기록됩니다.</li>
            </ol>
          </Section>

          <Section title="5. 점수의 소멸">
            <ol>
              <li>회원 탈퇴 시 보유 점수는 모두 소멸하며, 점수의 비금전성에 따라 어떠한 보상도 제공되지 않습니다.</li>
              <li>어뷰징, 다중 계정, 점수 거래 시도 등 운영 정책 위반이 확인된 경우, 회사는 부정 취득 점수를 회수하거나 회원을 랭킹에서 제외할 수 있습니다.</li>
            </ol>
          </Section>

          <Section title="6. 사행성과의 무관성">
            <ol>
              <li>Signal League의 점수 시스템은 사행행위와 무관합니다.</li>
              <li>점수는 금전적 가치가 없고 환전이 불가능하므로, 예측 활동의 결과로 점수가 증감하더라도 이는 금전적 이익이나 손실이 아닙니다.</li>
              <li>서비스는 예측력의 측정과 랭킹 경쟁, 커뮤니티 활동을 목적으로 합니다.</li>
            </ol>
          </Section>

          <Section title="7. 정책의 변경">
            <p>본 점수 정책은 서비스 운영 정책 및 관련 법령에 따라 변경될 수 있으며, 변경 시 서비스 내 공지를 통해 고지합니다.</p>
          </Section>
        </div>

        <div className="mt-8 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-muted)] p-4 space-y-1">
          <div className="flex gap-2 text-xs">
            <span className="text-[var(--color-text-tertiary)]">공고일자</span>
            <span className="text-[var(--color-text-secondary)]">2026년 5월 25일</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="text-[var(--color-text-tertiary)]">시행일자</span>
            <span className="text-[var(--color-text-secondary)]">2026년 5월 25일</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="text-[var(--color-text-tertiary)]">문의</span>
            <span className="text-[var(--color-text-secondary)]">admin@signalleague.com</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-6 border-b border-[var(--color-border-default)] last:border-0">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">{title}</h2>
      <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_p]:mb-0">
        {children}
      </div>
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-semibold text-[var(--color-text-primary)] mt-3 mb-1">{children}</p>
  );
}
