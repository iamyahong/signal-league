"use client";

import Link from "next/link";
import { useState } from "react";
import dynamic from "next/dynamic";

const Menu = dynamic(() => import("lucide-react").then((m) => ({ default: m.Menu })), { ssr: false });
const X = dynamic(() => import("lucide-react").then((m) => ({ default: m.X })), { ssr: false });
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border-default)] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-base text-[var(--color-text-primary)]">
            <span className="text-[var(--color-accent-primary)] font-extrabold tracking-tight">Signal</span>
            <span className="font-extrabold tracking-tight">League</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm text-[var(--color-text-secondary)]">
            <Link href="/#about" className="hover:text-[var(--color-text-primary)] transition-colors">서비스 소개</Link>
            <Link href="/pricing" className="hover:text-[var(--color-text-primary)] transition-colors">요금제</Link>
            <Link href="/faq" className="hover:text-[var(--color-text-primary)] transition-colors">FAQ</Link>
          </nav>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm">로그인</Button>
            </Link>
            <Link href="/signup">
              <Button variant="primary" size="sm">베타 신청</Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            aria-label={mobileOpen ? "메뉴 닫기" : "메뉴 열기"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-[var(--color-border-default)] py-4 space-y-3">
            <Link href="/#about" onClick={() => setMobileOpen(false)} className="block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-2">서비스 소개</Link>
            <Link href="/pricing" onClick={() => setMobileOpen(false)} className="block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-2">요금제</Link>
            <Link href="/faq" onClick={() => setMobileOpen(false)} className="block text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-2">FAQ</Link>
            <div className="flex gap-2 pt-2">
              <Link href="/login" className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">로그인</Button>
              </Link>
              <Link href="/signup" className="flex-1">
                <Button variant="primary" size="sm" className="w-full">베타 신청</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
