import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Footer } from "@/components/layout/Footer";
import { Users, Award, ChevronRight, CheckCircle } from "lucide-react";

const CONTAINER = "mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8";

const dummyQuestions = [
  {
    id: 1,
    category: "경제·금융",
    categoryVariant: "info" as const,
    title: "2026년 한국 기준금리, 연말까지 1회 이상 인하될까?",
    closesAt: "2026-12-31",
    participants: 1247,
    options: [
      { label: "그렇다", ratio: 63 },
      { label: "아니다", ratio: 37 },
    ],
  },
  {
    id: 2,
    category: "기술·AI",
    categoryVariant: "success" as const,
    title: "OpenAI, 2026년 내 GPT-5 정식 출시할까?",
    closesAt: "2026-09-30",
    participants: 2103,
    options: [
      { label: "출시한다", ratio: 78 },
      { label: "출시 못한다", ratio: 22 },
    ],
  },
  {
    id: 3,
    category: "국제정세",
    categoryVariant: "warning" as const,
    title: "2026년 G7 정상회담, 한국 초청 참여?",
    closesAt: "2026-06-30",
    participants: 856,
    options: [
      { label: "참여한다", ratio: 45 },
      { label: "참여 안 한다", ratio: 55 },
    ],
  },
];

const dummyRanking = [
  { rank: 1, nickname: "예측왕김철수", category: "경제·금융", score: 48230 },
  { rank: 2, nickname: "미래를보는눈", category: "기술·AI", score: 41890 },
  { rank: 3, nickname: "글로벌분석가", category: "국제정세", score: 38650 },
  { rank: 4, nickname: "사회통찰자", category: "사회", score: 35120 },
  { rank: 5, nickname: "예리한판단력", category: "경제·금융", score: 31780 },
];

const faqItems = [
  { q: "점수는 돈인가요?", a: "아닙니다. 점수는 서비스 내 예측 활동, 랭킹, 통계 표시를 위한 비금전성 점수이며 현금, 상품권, 가상자산 등으로 환전·교환·양도할 수 없습니다." },
  { q: "실제 결제가 진행되나요?", a: "현재는 베타 운영 중이며 실제 결제는 진행되지 않습니다. 선택한 요금제는 베타 승인 시 지급될 점수 기준으로 사용됩니다." },
  { q: "누구나 예측 문제를 만들 수 있나요?", a: "베타 승인 회원은 누구나 만들 수 있으며, 운영자 승인 후 공개됩니다." },
  { q: "예측 결과는 누가 확정하나요?", a: "운영자가 문제 생성 시 명시된 결과 확정 기준과 공식 출처를 바탕으로 확정합니다." },
  { q: "점수는 어디에 사용되나요?", a: "예측 참여, 문제 생성, 랭킹 산정, 프로필·통계 표시에만 사용됩니다." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader />
      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="bg-white border-b border-[var(--color-border-default)]">
          <div className={`${CONTAINER} py-16 md:py-24`}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: copy */}
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f4fd] px-3 py-1 text-xs font-medium text-[#1a6fa0] mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)] animate-pulse" />
                  베타 운영 중
                </div>
                <h1 className="text-[32px] md:text-[44px] font-bold text-[var(--color-text-primary)] leading-tight mb-4">
                  세상의 흐름을<br />
                  먼저 읽는 사람들의<br />
                  <span className="text-[var(--color-accent-primary)]">예측 리그</span>
                </h1>
                <p className="text-base text-[var(--color-text-secondary)] leading-relaxed mb-8 max-w-lg">
                  사회·경제·국제정세·기술 이슈에 대한 당신의 판단을 점수와 랭킹으로 기록하는 구독형 예측력 플랫폼입니다.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/signup">
                    <Button variant="primary" size="lg">베타 신청하기</Button>
                  </Link>
                  <Link href="/pricing">
                    <Button variant="secondary" size="lg">요금제 보기</Button>
                  </Link>
                </div>
                <div className="flex items-start gap-2 mt-6 p-3 bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)]">
                  <span className="text-xs text-amber-800 leading-relaxed">
                    Signal League의 점수는 현금, 상품권, 모바일쿠폰, 가상자산으로 교환되지 않는 비금전성 서비스 점수입니다.
                  </span>
                </div>
              </div>

              {/* Right: preview cards */}
              <div className="space-y-3">
                {dummyQuestions.map((q) => (
                  <div key={q.id} className="rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-white p-4 shadow-[var(--shadow-sm)]">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant={q.categoryVariant}>{q.category}</Badge>
                      <span className="text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">~{q.closesAt}</span>
                    </div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)] mb-3 leading-snug">{q.title}</p>
                    <div className="space-y-1.5">
                      {q.options.map((opt) => (
                        <div key={opt.label}>
                          <div className="flex items-center justify-between text-xs mb-0.5">
                            <span className="text-[var(--color-text-secondary)]">{opt.label}</span>
                            <span className="font-medium text-[var(--color-text-primary)]">{opt.ratio}%</span>
                          </div>
                          <div className="h-1.5 bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--color-accent-primary)] rounded-full" style={{ width: `${opt.ratio}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-2 text-xs text-[var(--color-text-tertiary)]">
                      <Users className="h-3 w-3" />
                      <span>{q.participants.toLocaleString()}명 참여</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="about" className="bg-[var(--color-surface-muted)] py-16">
          <div className={CONTAINER}>
            <h2 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-10">서비스 작동 방식</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: "01", title: "요금제 선택 후 베타 신청", desc: "Basic, Standard, Pro 중 원하는 요금제를 선택하고 베타 신청을 완료하세요." },
                { step: "02", title: "운영자 승인 후 점수 지급", desc: "운영자가 신청을 검토하고 승인하면 요금제 기준의 베타 점수가 지급됩니다." },
                { step: "03", title: "예측 문제 만들거나 참여", desc: "현실 이슈에 대한 예측 문제를 직접 만들거나 다른 회원의 문제에 참여하세요." },
                { step: "04", title: "결과 확정 시 점수·랭킹 반영", desc: "이슈 결과가 확정되면 예측 적중 여부에 따라 점수가 반영되고 랭킹에 기록됩니다." },
              ].map(({ step, title, desc }) => (
                <div key={step} className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-5 shadow-[var(--shadow-sm)]">
                  <div className="text-3xl font-black text-[var(--color-accent-primary)] opacity-30 mb-3">{step}</div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Popular predictions ── */}
        <section className="bg-white py-16 border-t border-[var(--color-border-default)]">
          <div className={CONTAINER}>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">인기 예측 미리보기</h2>
              <span className="text-xs text-[var(--color-text-tertiary)]">베타 승인 후 참여 가능</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dummyQuestions.map((q) => (
                <Card key={q.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Badge variant={q.categoryVariant}>{q.category}</Badge>
                    <span className="text-xs text-[var(--color-text-tertiary)] whitespace-nowrap">마감 {q.closesAt}</span>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 leading-snug">{q.title}</p>
                  <div className="space-y-2 mb-3">
                    {q.options.map((opt) => (
                      <div key={opt.label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[var(--color-text-secondary)]">{opt.label}</span>
                          <span className="font-semibold text-[var(--color-text-primary)]">{opt.ratio}%</span>
                        </div>
                        <div className="h-2 bg-[var(--color-surface-muted)] rounded-full overflow-hidden">
                          <div className="h-full bg-[var(--color-accent-primary)] rounded-full transition-all" style={{ width: `${opt.ratio}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                    <Users className="h-3 w-3" />
                    <span>{q.participants.toLocaleString()}명 참여</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ── Ranking preview ── */}
        <section className="bg-[var(--color-surface-muted)] py-16 border-t border-[var(--color-border-default)]">
          <div className={CONTAINER}>
            <div className="flex items-center gap-2 mb-8">
              <Award className="h-5 w-5 text-[var(--color-accent-warning)]" />
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)]">랭킹 미리보기</h2>
            </div>
            <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] overflow-hidden shadow-[var(--shadow-sm)]">
              <div className="grid grid-cols-[56px_1fr_140px_100px] text-xs font-medium text-[var(--color-text-secondary)] px-5 py-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                <span>순위</span><span>닉네임</span><span>분야</span><span className="text-right">점수</span>
              </div>
              {dummyRanking.map((r) => (
                <div key={r.rank} className="grid grid-cols-[56px_1fr_140px_100px] items-center px-5 py-3.5 border-b border-[var(--color-border-default)] last:border-0 hover:bg-[var(--color-surface-muted)] transition-colors">
                  <span className={`text-sm font-bold ${r.rank <= 3 ? "text-[var(--color-accent-warning)]" : "text-[var(--color-text-secondary)]"}`}>
                    {r.rank <= 3 ? ["🥇","🥈","🥉"][r.rank-1] : r.rank}
                  </span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{r.nickname}</span>
                  <Badge variant="default">{r.category}</Badge>
                  <span className="text-sm font-semibold text-right text-[var(--color-text-primary)]">{r.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing preview ── */}
        <section className="bg-white py-16 border-t border-[var(--color-border-default)]">
          <div className={CONTAINER}>
            <h2 className="text-2xl font-bold text-center text-[var(--color-text-primary)] mb-3">요금제</h2>
            <p className="text-sm text-center text-[var(--color-text-secondary)] mb-4">베타 기간 중 실제 결제 없이 점수를 받아 참여하세요</p>
            <div className="bg-blue-50 border border-blue-200 rounded-[var(--radius-lg)] p-4 mb-8 text-center max-w-2xl mx-auto">
              <p className="text-sm text-blue-800">현재 Signal League는 베타 운영 중입니다. 실제 결제는 진행되지 않으며, 선택한 요금제는 베타 승인 시 지급될 점수 기준으로만 사용됩니다.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { name: "Basic", price: "1,100원", score: "1,000점", target: "입문자", planCode: "basic", featured: false },
                { name: "Standard", price: "3,900원", score: "4,000점", target: "일반 사용자", planCode: "standard", featured: true },
                { name: "Pro", price: "9,900원", score: "10,000점", target: "적극 참여자", planCode: "pro", featured: false },
              ].map((p) => (
                <div key={p.name} className={`rounded-[var(--radius-xl)] border p-6 ${p.featured ? "border-[var(--color-accent-primary)] ring-2 ring-[var(--color-accent-primary)]/20 shadow-[var(--shadow-md)]" : "border-[var(--color-border-default)] shadow-[var(--shadow-sm)]"}`}>
                  {p.featured && <div className="text-xs font-semibold text-[var(--color-accent-primary)] mb-2">추천</div>}
                  <div className="text-lg font-bold text-[var(--color-text-primary)] mb-1">{p.name}</div>
                  <div className="text-2xl font-black text-[var(--color-text-primary)] mb-1">{p.price}<span className="text-sm font-normal text-[var(--color-text-secondary)]">/월</span></div>
                  <div className="text-sm text-[var(--color-accent-success)] font-semibold mb-1">월 {p.score} 지급</div>
                  <div className="text-xs text-[var(--color-text-secondary)] mb-5">추천 대상: {p.target}</div>
                  <Link href={`/signup?plan=${p.planCode}`}>
                    <Button variant={p.featured ? "primary" : "secondary"} className="w-full">이 요금제로 신청</Button>
                  </Link>
                </div>
              ))}
            </div>
            <div className="mt-8 p-4 bg-[var(--color-surface-muted)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] max-w-4xl mx-auto">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-[var(--color-accent-success)] mt-0.5 shrink-0" />
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  Signal League의 점수는 현금, 상품권, 모바일쿠폰, 가상자산으로 교환되지 않습니다. 점수는 오직 예측 참여, 문제 생성, 랭킹, 통계 표시를 위한 서비스 내 점수입니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ preview ── */}
        <section className="bg-[var(--color-surface-muted)] py-16 border-t border-[var(--color-border-default)]">
          <div className={CONTAINER}>
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-8">자주 묻는 질문</h2>
              <div className="space-y-3">
                {faqItems.map((item, i) => (
                  <div key={i} className="bg-white rounded-[var(--radius-lg)] border border-[var(--color-border-default)] p-4">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] mb-1.5">Q. {item.q}</p>
                    <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">A. {item.a}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Link href="/faq">
                  <Button variant="ghost" className="gap-1">
                    모든 FAQ 보기 <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="bg-[var(--color-accent-primary)] py-16">
          <div className={`${CONTAINER} text-center`}>
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">지금 베타 신청하세요</h2>
              <p className="text-sm text-white/80 mb-8">운영자 승인 후 요금제 기준의 점수를 받아 예측 리그에 참여할 수 있습니다.</p>
              <Link href="/signup">
                <Button variant="secondary" size="lg">베타 신청하기</Button>
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
