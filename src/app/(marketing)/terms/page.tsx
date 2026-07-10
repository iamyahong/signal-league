import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관 — Signal League",
};

export default function TermsPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">이용약관</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            본 약관은 Signal League의 베타 운영 단계 기준으로 작성되었으며, 정식 서비스 출시 시 갱신될 수 있습니다.
          </p>
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mt-1">시행일: 2026년 5월 25일</p>
        </div>

        <div className="space-y-0">
          <Section title="제1조 (목적)">
            <p>본 약관은 유니소드(주)(이하 "회사")가 제공하는 Signal League 서비스의 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
          </Section>

          <Section title="제2조 (정의)">
            <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
            <ol>
              <li>"서비스"란 회사가 제공하는 예측력 리그 플랫폼 Signal League 및 관련 제반 서비스를 의미합니다.</li>
              <li>"이용자"란 본 약관에 따라 서비스를 이용하는 회원을 의미합니다.</li>
              <li>"회원"이란 서비스에 가입하여 계정을 부여받은 자를 의미합니다.</li>
              <li>"점수"란 서비스 내에서 예측 참여·문제 생성·랭킹 산정·통계 표시 목적으로만 사용되는 비금전성 서비스 점수를 의미합니다.</li>
              <li>"예측 문제"란 회원 또는 운영자가 생성한, 미래의 특정 사건에 대한 판단을 묻는 문항을 의미합니다.</li>
            </ol>
          </Section>

          <Section title="제3조 (약관의 효력 및 변경)">
            <ol>
              <li>본 약관은 서비스 화면에 게시함으로써 효력이 발생합니다.</li>
              <li>회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 적용일자 및 변경사유를 명시하여 사전에 공지합니다.</li>
              <li>이용자가 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
            </ol>
          </Section>

          <Section title="제4조 (회원가입 및 베타 운영)">
            <ol>
              <li>이용자는 회사가 정한 절차에 따라 회원가입을 신청하며, 회사가 이를 승인함으로써 회원으로 등록됩니다.</li>
              <li>현재 서비스는 베타 운영 단계로, 회원가입 후 운영자의 승인을 거쳐 베타 이용 권한이 부여됩니다.</li>
              <li>베타 운영 단계에서는 실제 결제가 진행되지 않으며, 선택한 요금제는 베타 승인 시 지급되는 점수의 기준으로만 사용됩니다.</li>
              <li>회사는 정식 서비스 전환 시 결제 정책 및 관련 약관을 별도로 고지합니다.</li>
            </ol>
          </Section>

          <Section title="제5조 (점수의 성격)">
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <p className="text-sm font-semibold text-amber-800">
                서비스 내 점수는 현금, 상품권, 모바일쿠폰, 가상자산, 외부 포인트 등으로 환전·교환·양도·판매할 수 없는 비금전성 서비스 점수입니다.
              </p>
            </div>
            <ol>
              <li>점수는 오직 서비스 내 예측 참여, 문제 생성, 랭킹 산정, 프로필 및 통계 표시 목적으로만 사용됩니다.</li>
              <li>점수는 어떠한 경우에도 금전적 가치를 가지지 않으며, 회원 간 거래·선물·양도가 금지됩니다.</li>
              <li>예측 결과에 따른 점수의 증감은 서비스 내 활동의 결과일 뿐, 어떠한 금전적 손익도 발생하지 않습니다.</li>
            </ol>
          </Section>

          <Section title="제6조 (서비스의 성격에 관한 고지)">
            <ol>
              <li>서비스에서 제공되는 예측 문제 및 그 결과는 정보 제공과 커뮤니티 활동을 목적으로 하며, <strong>투자·정치·법률·금융에 관한 조언이나 권유가 아닙니다.</strong></li>
              <li>이용자는 서비스 내 정보를 근거로 한 의사결정에 대해 스스로 책임을 부담합니다.</li>
              <li>서비스는 사행행위와 무관하며, 점수의 비금전성을 통해 이를 명확히 합니다.</li>
            </ol>
          </Section>

          <Section title="제7조 (회원의 의무)">
            <p>회원은 다음 행위를 하여서는 안 됩니다.</p>
            <ol>
              <li>타인의 정보 도용 또는 허위 정보 등록</li>
              <li>허위정보, 명예훼손, 혐오·비방 표현의 게시</li>
              <li>불법행위 조장, 불법 투자 리딩</li>
              <li>점수의 거래·양도 시도 또는 유도</li>
              <li>다중 계정 생성, 어뷰징, 부정한 방법의 점수 취득</li>
              <li>서비스 운영을 방해하는 행위</li>
              <li>기타 관련 법령 및 본 약관에 위배되는 행위</li>
            </ol>
          </Section>

          <Section title="제8조 (예측 문제 및 결과 확정)">
            <ol>
              <li>회원은 회사가 정한 기준에 따라 예측 문제를 생성할 수 있으며, 생성된 문제는 운영자 검토·승인 후 공개됩니다.</li>
              <li>예측 문제의 결과는 문제 생성 시 명시된 결과 확정 기준과 신뢰 가능한 출처를 바탕으로 운영자가 확정합니다.</li>
              <li>회사는 결과 기준이 모호하거나 사실관계 확인이 어려운 문제, 정책에 위배되는 문제를 수정·숨김·무효 처리할 수 있습니다.</li>
              <li>결과 확정에 이의가 있는 회원은 정해진 기간 내에 이의제기를 할 수 있습니다.</li>
            </ol>
          </Section>

          <Section title="제9조 (서비스 이용 제한)">
            <ol>
              <li>회사는 회원이 본 약관 또는 운영 정책을 위반한 경우, 사전 통지 후(긴급한 경우 통지 없이) 서비스 이용을 제한하거나 회원 자격을 정지·상실시킬 수 있습니다.</li>
              <li>회사는 이용 제한 시 그 사유와 기간을 회원에게 통지합니다.</li>
            </ol>
          </Section>

          <Section title="제10조 (서비스의 제공 및 변경)">
            <ol>
              <li>회사는 서비스를 연중무휴 제공하기 위해 노력하나, 시스템 점검·장애·천재지변 등의 사유로 서비스 제공이 일시 중단될 수 있습니다.</li>
              <li>베타 운영 단계의 서비스는 기능·정책이 수시로 변경될 수 있으며, 회사는 주요 변경사항을 공지합니다.</li>
            </ol>
          </Section>

          <Section title="제11조 (책임의 제한)">
            <ol>
              <li>회사는 천재지변, 불가항력, 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
              <li>회사는 이용자가 서비스 내 정보를 신뢰하여 한 의사결정 및 그 결과에 대해 책임을 지지 않습니다.</li>
              <li>회사는 베타 운영 단계에서 발생할 수 있는 데이터 손실·서비스 중단 등에 대해 가능한 범위에서 복구를 위해 노력하나, 이를 보증하지 않습니다.</li>
            </ol>
          </Section>

          <Section title="제12조 (회원 탈퇴 및 자격 상실)">
            <ol>
              <li>회원은 언제든지 서비스 내 설정 또는 운영자 문의를 통해 탈퇴할 수 있습니다.</li>
              <li>탈퇴 시 보유 점수는 소멸하며, 점수의 비금전성에 따라 어떠한 보상도 제공되지 않습니다.</li>
            </ol>
          </Section>

          <Section title="제13조 (분쟁의 해결 및 준거법)">
            <ol>
              <li>본 약관은 대한민국 법령에 따라 해석되고 적용됩니다.</li>
              <li>서비스 이용과 관련하여 회사와 이용자 간 분쟁이 발생한 경우, 양 당사자는 신의성실의 원칙에 따라 원만히 해결하도록 노력합니다.</li>
              <li>분쟁이 해결되지 않을 경우, 관련 법령에 따른 관할 법원에 소를 제기할 수 있습니다.</li>
            </ol>
          </Section>
        </div>

        <div className="mt-10 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-muted)] p-5 space-y-1">
          <p className="text-xs font-semibold text-[var(--color-text-secondary)]">회사 정보</p>
          <InfoRow label="상호" value="유니소드(주)" />
          <InfoRow label="사업자등록번호" value="640-87-02845" />
          <InfoRow label="통신판매업 신고번호" value="제2024-서울서초-4066호" />
          <InfoRow label="주소" value="(06575) 서울특별시 서초구 사평대로18길 5, 3층(반포동, 위너빌딩)" />
          <InfoRow label="대표 문의" value="admin@signalleague.com" />
          <InfoRow label="전화" value="0506-050-6799" />
          <div className="pt-2 border-t border-[var(--color-border-default)] mt-2">
            <InfoRow label="공고일자" value="2026년 5월 25일" />
            <InfoRow label="시행일자" value="2026년 5월 25일" />
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
      <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_p]:mb-0 [&_strong]:font-semibold [&_strong]:text-[var(--color-text-primary)]">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-[var(--color-text-tertiary)] shrink-0">{label}</span>
      <span className="text-[var(--color-text-secondary)]">{value}</span>
    </div>
  );
}
