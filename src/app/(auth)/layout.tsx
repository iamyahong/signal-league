import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface-muted)]">
      <header className="h-14 flex items-center px-6">
        <Link href="/" className="flex items-center gap-1 font-bold">
          <span className="text-[var(--color-accent-primary)] font-extrabold tracking-tight">Signal</span>
          <span className="font-extrabold tracking-tight">League</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="h-12 flex items-center justify-center px-6">
        <p className="text-xs text-[var(--color-text-tertiary)]">
          © 2026 Signal League · <Link href="/terms" className="hover:underline">이용약관</Link> · <Link href="/privacy" className="hover:underline">개인정보처리방침</Link>
        </p>
      </footer>
    </div>
  );
}
