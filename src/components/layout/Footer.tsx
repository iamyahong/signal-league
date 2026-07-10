import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border-default)] bg-[var(--color-surface-muted)] mt-auto">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-1 font-bold mb-3">
              <span className="text-[var(--color-accent-primary)] font-extrabold">Signal</span>
              <span className="font-extrabold">League</span>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              사회·경제·국제정세·기술 이슈에 대한<br />
              당신의 판단력을 기록하는 예측력 리그 플랫폼
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-3">서비스</h4>
            <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><Link href="/pricing" className="hover:text-[var(--color-text-primary)] transition-colors">요금제 안내</Link></li>
              <li><Link href="/faq" className="hover:text-[var(--color-text-primary)] transition-colors">자주 묻는 질문</Link></li>
              <li><Link href="/signup" className="hover:text-[var(--color-text-primary)] transition-colors">베타 신청</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider mb-3">정책</h4>
            <ul className="space-y-2 text-sm text-[var(--color-text-secondary)]">
              <li><Link href="/terms" className="hover:text-[var(--color-text-primary)] transition-colors">이용약관</Link></li>
              <li><Link href="/privacy" className="hover:text-[var(--color-text-primary)] transition-colors">개인정보처리방침</Link></li>
              <li><Link href="/score-policy" className="hover:text-[var(--color-text-primary)] transition-colors">점수 정책</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[var(--color-border-default)]">
          <div className="bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] p-3 mb-4">
            <p className="text-xs text-amber-800 text-center leading-relaxed">
              Signal League의 점수는 현금, 상품권, 모바일쿠폰, 가상자산으로 교환되지 않습니다.
              점수는 오직 예측 참여, 문제 생성, 랭킹, 통계 표시를 위한 서비스 내 점수입니다.
            </p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-xs text-[var(--color-text-tertiary)]">
              © 2026 Signal League · 유니소드(주) · All rights reserved.
            </p>
            <p className="text-[11px] text-[var(--color-text-tertiary)] leading-relaxed">
              사업자등록번호: 640-87-02845 · 통신판매업: 제2024-서울서초-4066호 · 문의: admin@signalleague.com
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
