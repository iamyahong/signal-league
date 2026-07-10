import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardBody, CardFooter } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function ComponentGallery() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-muted)] p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">Signal League 컴포넌트 갤러리</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Polymarket 톤앤매너 기반 공통 컴포넌트 시각적 확인</p>
        </div>

        {/* Buttons */}
        <section>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4 pb-2 border-b border-[var(--color-border-default)]">Button</h2>
          <div className="space-y-6">
            <div>
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">Variants</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">Sizes</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" size="sm">Small</Button>
                <Button variant="primary" size="md">Medium</Button>
                <Button variant="primary" size="lg">Large</Button>
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">States</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Default</Button>
                <Button variant="primary" loading>Loading</Button>
                <Button variant="primary" disabled>Disabled</Button>
                <Button variant="secondary" loading>Loading Secondary</Button>
                <Button variant="danger">Danger</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4 pb-2 border-b border-[var(--color-border-default)]">Badge</h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">기본</Badge>
            <Badge variant="info">정보</Badge>
            <Badge variant="success">성공</Badge>
            <Badge variant="danger">위험</Badge>
            <Badge variant="warning">경고</Badge>
          </div>
        </section>

        {/* Cards */}
        <section>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4 pb-2 border-b border-[var(--color-border-default)]">Card</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <h3 className="text-sm font-semibold">카드 제목</h3>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-[var(--color-text-secondary)]">카드 본문 내용이 여기에 표시됩니다.</p>
              </CardBody>
              <CardFooter>
                <Button variant="primary" size="sm">액션</Button>
              </CardFooter>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-[var(--color-text-secondary)] mb-3">간단한 카드 예시</p>
              <div className="flex gap-2">
                <Badge variant="info">경제·금융</Badge>
                <Badge variant="success">적중</Badge>
              </div>
            </Card>
          </div>
        </section>

        {/* Skeleton */}
        <section>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4 pb-2 border-b border-[var(--color-border-default)]">Skeleton (Loading)</h2>
          <div className="space-y-3">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-24 w-full rounded-[var(--radius-xl)]" />
          </div>
        </section>

        {/* Design tokens */}
        <section>
          <h2 className="text-base font-semibold text-[var(--color-text-primary)] mb-4 pb-2 border-b border-[var(--color-border-default)]">디자인 토큰 — 색상</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "accent-primary", bg: "bg-[var(--color-accent-primary)]" },
              { label: "accent-success", bg: "bg-[var(--color-accent-success)]" },
              { label: "accent-danger", bg: "bg-[var(--color-accent-danger)]" },
              { label: "accent-warning", bg: "bg-[var(--color-accent-warning)]" },
              { label: "text-primary", bg: "bg-[var(--color-text-primary)]" },
              { label: "text-secondary", bg: "bg-[var(--color-text-secondary)]" },
              { label: "text-tertiary", bg: "bg-[var(--color-text-tertiary)]" },
              { label: "surface-muted", bg: "bg-[var(--color-surface-muted)] border border-[var(--color-border-default)]" },
            ].map(({ label, bg }) => (
              <div key={label}>
                <div className={`h-10 rounded-[var(--radius-md)] ${bg} mb-1`} />
                <p className="text-xs text-[var(--color-text-secondary)]">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
