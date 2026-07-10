import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "자주 묻는 질문 — Signal League",
  description: "Signal League에 대해 자주 묻는 질문을 확인하세요.",
};

const sections = [
  {
    title: "서비스 일반",
    items: [
      { q: "Signal League는 어떤 서비스인가요?", a: "Signal League는 사회·경제·국제정세·기술·문화 등 현실 이슈에 대한 사용자의 예측력과 판단력을 점수와 랭킹으로 기록하는 구독형 예측력 리그 플랫폼입니다." },
      { q: "누구나 가입할 수 있나요?", a: "현재는 베타 운영 중으로, 신청 후 운영자의 수동 승인을 거쳐 참여할 수 있습니다. 무료 사용자는 없으며 베타 승인 회원만 서비스를 이용할 수 있습니다." },
      { q: "Signal League는 베팅 또는 도박 서비스인가요?", a: "아닙니다. Signal League는 실제 금전 수익을 목적으로 하는 베팅 플랫폼이 아닙니다. 서비스에서 사용되는 점수는 현금, 상품권, 가상자산 등 어떠한 형태로도 교환되지 않는 비금전성 서비스 점수입니다." },
      { q: "모바일 앱은 있나요?", a: "현재는 웹 서비스로 운영 중입니다. 모바일 앱은 추후 출시 예정입니다." },
    ],
  },
  {
    title: "요금제와 결제",
    items: [
      { q: "실제 결제가 진행되나요?", a: "현재는 베타 운영 중이며 실제 결제는 진행되지 않습니다. 선택한 요금제는 베타 승인 시 지급될 점수 기준으로만 사용됩니다." },
      { q: "요금제는 어떤 차이가 있나요?", a: "Basic(월 1,000점), Standard(월 4,000점), Pro(월 10,000점)로 구분되며, 요금제에 따라 매월 지급되는 비금전성 서비스 점수의 양이 다릅니다." },
      { q: "베타 승인 후 요금제를 변경할 수 있나요?", a: "베타 신청 대기 중에는 마이페이지에서 희망 요금제를 변경할 수 있습니다. 베타 승인 이후의 변경은 추후 별도 안내 예정입니다." },
      { q: "환불이 되나요?", a: "베타 기간 중에는 실제 결제가 없으므로 환불 정책이 적용되지 않습니다. 정식 서비스 이후 별도 환불 정책이 안내됩니다." },
    ],
  },
  {
    title: "점수",
    items: [
      { q: "점수는 돈인가요?", a: "아닙니다. 점수는 서비스 내 예측 활동, 랭킹, 통계 표시를 위한 비금전성 점수이며 현금, 상품권, 가상자산 등으로 환전·교환·양도할 수 없습니다." },
      { q: "점수는 어디에 사용되나요?", a: "예측 참여(점수 배분), 문제 생성(점수 소모), 랭킹 산정, 프로필·통계 표시에만 사용됩니다." },
      { q: "점수가 소진되면 어떻게 되나요?", a: "보유 점수가 부족하면 예측 참여 및 문제 생성이 제한될 수 있습니다. 다음 달 요금제 기준 점수 지급 시 활동을 재개할 수 있습니다." },
      { q: "점수를 다른 사람에게 줄 수 있나요?", a: "점수는 타 회원에게 양도할 수 없습니다. 서비스 내에서만 활동 목적으로 사용됩니다." },
    ],
  },
  {
    title: "예측 문제와 참여",
    items: [
      { q: "누구나 예측 문제를 만들 수 있나요?", a: "베타 승인 회원은 누구나 예측 문제를 작성할 수 있으며, 운영자 검토 및 승인 후 공개됩니다." },
      { q: "예측 참여는 어떻게 하나요?", a: "공개된 예측 문제의 선택지 중 하나를 고르고, 점수를 배분하여 참여합니다. 최소 배분 점수는 10점입니다." },
      { q: "예측 참여 후 취소할 수 있나요?", a: "예측 문제 마감 전까지는 참여를 취소할 수 있습니다. 마감 후에는 취소가 불가능합니다." },
      { q: "예측 문제는 어떤 주제로 만들 수 있나요?", a: "경제·금융, 국제정세, 사회, 기술·AI, 문화·엔터, 스포츠 등 현실 이슈에 관한 문제를 만들 수 있습니다. 결과 확정이 명확한 주제여야 합니다." },
    ],
  },
  {
    title: "결과 확정과 랭킹",
    items: [
      { q: "예측 결과는 누가 확정하나요?", a: "운영자가 문제 생성 시 명시된 결과 확정 기준과 공식 출처를 바탕으로 확정합니다." },
      { q: "결과에 이의가 있으면 어떻게 하나요?", a: "결과 확정 후 72시간 이내에 이의 신청을 할 수 있습니다. 운영자가 검토 후 결정합니다." },
      { q: "랭킹은 어떻게 계산되나요?", a: "주간·월간·누적 기준으로 예측 적중률과 획득 점수를 바탕으로 랭킹이 계산됩니다." },
      { q: "동점자 랭킹 처리는 어떻게 되나요?", a: "동점일 경우 예측 적중률, 참여 수 등 보조 지표를 사용하여 순위를 결정합니다." },
    ],
  },
  {
    title: "운영 정책",
    items: [
      { q: "계정이 정지될 수 있나요?", a: "서비스 이용약관을 위반하거나 부적절한 예측 문제 생성, 허위 정보 제출 등의 경우 계정이 일시 정지되거나 영구 제한될 수 있습니다." },
      { q: "문제가 되는 예측 문제를 신고할 수 있나요?", a: "공개된 예측 문제에 신고 기능을 사용하여 운영자에게 접수할 수 있습니다. 운영자 검토 후 조치합니다." },
      { q: "개인정보는 어떻게 처리되나요?", a: "수집된 개인정보는 서비스 제공 목적으로만 사용되며, 개인정보처리방침에 따라 관리됩니다." },
      { q: "서비스 문의는 어디로 하나요?", a: "admin@signalleague.com으로 문의하시면 운영자가 빠르게 답변드립니다." },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="py-12 md:py-16">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] mb-2">자주 묻는 질문</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mb-10">Signal League 이용에 관해 궁금한 점을 확인하세요.</p>

        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-base font-bold text-[var(--color-text-primary)] mb-4 pb-2 border-b border-[var(--color-border-default)]">
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.items.map((item, i) => (
                  <div key={i} className="bg-white border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-4">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Q. {item.q}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">A. {item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 p-4 bg-amber-50 border border-amber-200 rounded-[var(--radius-xl)]">
          <p className="text-sm font-semibold text-amber-800 mb-1">점수 정책 안내</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Signal League의 점수는 현금, 상품권, 모바일쿠폰, 가상자산으로 교환되지 않습니다.
            점수는 오직 예측 참여, 문제 생성, 랭킹, 통계 표시를 위한 서비스 내 점수입니다.
          </p>
        </div>
      </div>
    </div>
  );
}
