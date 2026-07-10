import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { Footer } from "@/components/layout/Footer";
import { MeSidebar } from "./_components/MeSidebar";

export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status === "PENDING_BETA") redirect("/pending");
  if (session.user.status === "SUSPENDED") redirect("/suspended");

  return (
    <div className="min-h-screen bg-[var(--color-surface-muted)] flex flex-col">
      <AppHeader />
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8 flex gap-6 flex-1">
        <MeSidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
