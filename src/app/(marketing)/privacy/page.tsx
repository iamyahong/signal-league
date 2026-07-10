import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 — Signal League",
};

export default function PrivacyPage() {
  return (
    <div className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">개인정보처리방침</h1>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            유니소드(주)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
          </p>
          <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
            본 방침은 Signal League의 베타 운영 단계 기준으로 작성되었으며, 정식 서비스 출시 시 갱신될 수 있습니다.
          </p>
          <p className="text-sm font-medium text-[var(--color-text-secondary)] mt-2">시행일: 2026년 5월 25일</p>
        </div>

        <div className="space-y-0">
          <Section title="1. 수집하는 개인정보 항목">
            <p>회사는 회원가입, 서비스 이용, 베타 운영을 위해 다음의 개인정보를 수집합니다.</p>

            <SubTitle>가. 회원가입 시 수집 항목</SubTitle>
            <p className="font-medium text-[var(--color-text-primary)]">이메일+비밀번호 가입</p>
            <ul>
              <li>필수: 이메일 주소, 비밀번호(암호화 저장), 닉네임, 희망 요금제</li>
              <li>선택: 관심 카테고리, 가입 목적</li>
            </ul>
            <p className="font-medium text-[var(--color-text-primary)] mt-2">Google 소셜 로그인 가입</p>
            <ul>
              <li>필수: 이메일 주소, 닉네임, 희망 요금제</li>
              <li>선택: 관심 카테고리, 가입 목적</li>
              <li>Google 계정 인증 정보(소셜 로그인 식별자)</li>
            </ul>

            <SubTitle>나. 서비스 이용 과정에서 생성·수집되는 정보</SubTitle>
            <ul>
              <li>예측 참여 기록, 예측 문제 생성 기록, 점수 내역, 랭킹 정보</li>
              <li>댓글 및 커뮤니티 활동 기록</li>
              <li>추천 코드 및 추천 활동 내역</li>
              <li>신고·이의제기 내역</li>
            </ul>

            <SubTitle>다. 자동으로 생성·수집되는 정보</SubTitle>
            <ul>
              <li>서비스 이용 기록, 접속 로그, 쿠키</li>
              <li>비밀번호 재설정 등 보안 관련 요청 시 IP 주소, 브라우저 정보(User-Agent)</li>
              <li>이메일 발송·수신 상태 기록(발송 성공·반송·수신거부 등)</li>
            </ul>
          </Section>

          <Section title="2. 개인정보의 수집 및 이용 목적">
            <p>회사는 수집한 개인정보를 다음의 목적으로 이용합니다.</p>
            <ul>
              <li>회원 식별 및 본인 확인, 회원제 서비스 제공</li>
              <li>이메일 인증, 비밀번호 재설정 등 계정 보안</li>
              <li>예측 리그 서비스 제공(예측 참여, 문제 생성, 점수 산정, 랭킹 표시)</li>
              <li>베타 이용 신청 접수 및 운영자 승인 처리</li>
              <li>서비스 관련 공지, 운영성 알림 발송</li>
              <li>부정 이용 방지, 어뷰징 탐지, 분쟁 처리</li>
              <li>서비스 개선 및 통계 분석</li>
            </ul>
          </Section>

          <Section title="3. 개인정보의 보유 및 이용 기간">
            <p>회사는 원칙적으로 개인정보 수집·이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 다만 다음의 경우에는 명시한 기간 동안 보관합니다.</p>

            <SubTitle>가. 회원 정보</SubTitle>
            <ul>
              <li>보유 기간: 회원 탈퇴 시까지</li>
              <li>탈퇴 시 지체 없이 파기. 단, 부정 이용 방지 및 분쟁 대응을 위해 필요한 최소한의 정보는 관련 법령에 따라 일정 기간 보관할 수 있습니다.</li>
            </ul>

            <SubTitle>나. 관련 법령에 따른 보존</SubTitle>
            <p>전자상거래 등에서의 소비자보호에 관한 법률 등 관련 법령에서 일정 기간 정보 보관을 규정하는 경우, 회사는 해당 기간 동안 정보를 보관합니다.</p>
            <ul>
              <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
              <li>소비자의 불만 또는 분쟁 처리에 관한 기록: 3년</li>
              <li>표시·광고에 관한 기록: 6개월</li>
              <li>접속 로그 등 통신사실확인자료: 관련 법령에 따른 기간</li>
            </ul>
            <p className="text-[var(--color-text-tertiary)] text-xs mt-2">※ 베타 운영 단계에서는 실제 결제가 발생하지 않으나, 정식 결제 도입 시 위 기준이 적용됩니다.</p>
          </Section>

          <Section title="4. 개인정보의 제3자 제공">
            <p>회사는 이용자의 개인정보를 본 방침에서 고지한 범위를 넘어 외부에 제공하지 않습니다. 다만 다음의 경우는 예외로 합니다.</p>
            <ul>
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </Section>

          <Section title="5. 개인정보 처리의 위탁">
            <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 외부에 위탁하고 있습니다.</p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border-default)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[var(--color-surface-muted)] border-b border-[var(--color-border-default)]">
                    <th className="px-4 py-2.5 text-left font-semibold text-[var(--color-text-primary)] whitespace-nowrap">수탁업체</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-[var(--color-text-primary)]">위탁 업무</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-[var(--color-text-primary)] whitespace-nowrap">비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-default)]">
                  {[
                    ["Resend (Resend, Inc.)", "이메일 발송 및 발송 상태 관리", "인증·알림 메일 발송"],
                    ["Neon (Neon, Inc.)", "데이터베이스 호스팅", "회원 데이터 저장 (해외)"],
                    ["Replit (Replit, Inc.)", "애플리케이션 호스팅", "서비스 운영 인프라 (해외)"],
                    ["Google LLC", "소셜 로그인 인증", "Google 계정 가입자에 한함"],
                  ].map(([name, task, note]) => (
                    <tr key={name} className="hover:bg-[var(--color-surface-muted)]/50 transition-colors">
                      <td className="px-4 py-2.5 text-[var(--color-text-primary)] font-medium whitespace-nowrap">{name}</td>
                      <td className="px-4 py-2.5 text-[var(--color-text-secondary)]">{task}</td>
                      <td className="px-4 py-2.5 text-[var(--color-text-tertiary)] whitespace-nowrap">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3">위탁받은 업체 중 일부는 해외에 서버를 두고 있어, 회원 정보가 국외에서 처리·보관될 수 있습니다. 회원가입 시 이에 동의한 것으로 간주합니다. 위탁 업체 변경 시 본 방침을 통해 고지합니다.</p>
          </Section>

          <Section title="6. 이용자의 권리와 행사 방법">
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <ul>
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
              <li>회원 탈퇴(동의 철회)</li>
            </ul>
            <p className="mt-2">권리 행사는 서비스 내 설정 화면 또는 개인정보 보호책임자 이메일(admin@signalleague.com)을 통해 요청할 수 있으며, 회사는 지체 없이 조치합니다.</p>
          </Section>

          <Section title="7. 개인정보의 파기">
            <p>회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때 지체 없이 해당 정보를 파기합니다.</p>
            <ul>
              <li>전자적 파일 형태: 복구·재생이 불가능한 방법으로 영구 삭제</li>
              <li>종이 문서: 분쇄 또는 소각</li>
            </ul>
          </Section>

          <Section title="8. 개인정보의 안전성 확보 조치">
            <p>회사는 개인정보의 안전성 확보를 위해 다음의 조치를 취합니다.</p>
            <ul>
              <li>비밀번호 암호화 저장(단방향 해시)</li>
              <li>통신 구간 암호화(SSL/TLS)</li>
              <li>개인정보 접근 권한의 최소화 및 접근 통제</li>
              <li>접속 기록의 보관 및 점검</li>
            </ul>
          </Section>

          <Section title="9. 개인정보 보호책임자">
            <p>회사는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 이용자의 불만 처리 및 피해 구제를 위해 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
            <ul>
              <li>개인정보 보호책임자: Signal League 운영팀</li>
              <li>연락처: admin@signalleague.com</li>
            </ul>
            <p className="mt-2">이용자는 서비스 이용 중 발생한 모든 개인정보 보호 관련 문의를 위 연락처로 신고할 수 있으며, 회사는 신속하게 답변·처리합니다.</p>
          </Section>

          <Section title="10. 권익침해 구제 방법">
            <p>개인정보 침해에 대한 신고나 상담이 필요한 경우 아래 기관에 문의할 수 있습니다.</p>
            <ul>
              <li>개인정보침해 신고센터 (privacy.kisa.or.kr / 국번 없이 118)</li>
              <li>개인정보 분쟁조정위원회 (www.kopico.go.kr / 1833-6972)</li>
              <li>대검찰청 사이버수사과 (www.spo.go.kr / 국번 없이 1301)</li>
              <li>경찰청 사이버수사국 (ecrm.cyber.go.kr / 국번 없이 182)</li>
            </ul>
          </Section>

          <Section title="11. 개인정보처리방침의 변경">
            <p>본 개인정보처리방침은 법령·정책 또는 서비스 변경에 따라 내용이 추가·삭제·수정될 수 있으며, 변경 시 서비스 내 공지를 통해 고지합니다.</p>
            <ul>
              <li>공고일자: 2026년 5월 25일</li>
              <li>시행일자: 2026년 5월 25일</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-6 border-b border-[var(--color-border-default)] last:border-0">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">{title}</h2>
      <div className="text-sm text-[var(--color-text-secondary)] leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_p]:mb-0 [&_strong]:font-semibold [&_strong]:text-[var(--color-text-primary)]">
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
