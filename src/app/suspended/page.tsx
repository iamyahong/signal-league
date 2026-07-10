import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { AlertTriangle, Mail } from "lucide-react";

export default async function SuspendedPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status !== "SUSPENDED") redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { suspensionReason: true, nickname: true },
  });

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface-muted)]">
      <header className="h-14 flex items-center px-6 border-b border-[var(--color-border-default)] bg-white">
        <Link href="/" className="flex items-center gap-1 font-bold">
          <span className="text-[var(--color-accent-primary)] font-extrabold tracking-tight">Signal</span>
          <span className="font-extrabold tracking-tight">League</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mx-auto">
            <AlertTriangle className="h-8 w-8 text-[var(--color-accent-danger)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">이용이 제한되었습니다</h1>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {user?.nickname}님의 계정이 일시적으로 제한되었습니다.
            </p>
          </div>

          {user?.suspensionReason && (
            <div className="bg-red-50 border border-red-200 rounded-[var(--radius-xl)] p-4 text-left">
              <p className="text-xs font-semibold text-red-700 mb-1">제한 사유</p>
              <p className="text-sm text-red-600">{user.suspensionReason}</p>
            </div>
          )}

          <div className="bg-white border border-[var(--color-border-default)] rounded-[var(--radius-xl)] p-5 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-4 w-4 text-[var(--color-text-secondary)]" />
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">문의 방법</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
              이의 신청 또는 계정 관련 문의는 아래 이메일로 연락해 주세요.
            </p>
            <a href="mailto:admin@signalleague.com" className="text-sm font-medium text-[var(--color-accent-primary)] hover:underline mt-1 block">
              admin@signalleague.com
            </a>
          </div>

          <SignOutButton />
        </div>
      </main>
    </div>
  );
}
