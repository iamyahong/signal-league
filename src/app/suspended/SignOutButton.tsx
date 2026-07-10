"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      className="w-full flex items-center justify-center gap-2 text-[var(--color-text-secondary)]"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <LogOut className="h-4 w-4" />
      로그아웃
    </Button>
  );
}
