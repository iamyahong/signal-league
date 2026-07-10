"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSession } from "next-auth/react";

export function PendingHeader() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border-default)] bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between">
          <Link href="/pending" className="flex items-center gap-2 font-bold text-base text-[var(--color-text-primary)]">
            <span className="text-[var(--color-accent-primary)] font-extrabold tracking-tight">Signal</span>
            <span className="font-extrabold tracking-tight">League</span>
          </Link>

          <div className="flex items-center gap-3">
            {session?.user?.nickname && (
              <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
                <User className="h-4 w-4" />
                <span>{session.user.nickname}</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
