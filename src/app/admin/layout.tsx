import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "./_components/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[]) || [];
  const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR");
  if (!isAdmin) redirect("/home");

  const isSuperAdmin = roles.includes("SUPER_ADMIN");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface-muted)]">
      {/* Top bar */}
      <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border-default)] bg-white/95 backdrop-blur-sm">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[var(--color-accent-primary)] font-extrabold tracking-tight text-sm">Signal</span>
              <span className="font-extrabold tracking-tight text-sm">League</span>
              <span className="text-xs text-[var(--color-text-tertiary)] border border-[var(--color-border-default)] rounded px-1.5 py-0.5">
                {isSuperAdmin ? "SUPER_ADMIN" : "OPERATOR"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <a href="/home" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">사용자 화면</a>
              <span className="text-[var(--color-text-tertiary)]">|</span>
              <span className="font-medium text-[var(--color-text-primary)]">{session.user.nickname}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <AdminSidebar isSuperAdmin={isSuperAdmin} />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
