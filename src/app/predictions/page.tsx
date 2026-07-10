import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AppHeader } from "@/components/layout/AppHeader";
import { PredictionFilters } from "./_components/PredictionFilters";
import { PredictionsGrid } from "./_components/PredictionsGrid";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams {
  tab?: string;
  categories?: string;
  sort?: string;
  page?: string;
  search?: string;
}

export default async function PredictionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [session, categories, sp] = await Promise.all([
    auth(),
    prisma.category.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    searchParams,
  ]);

  const isLoggedIn = !!session?.user;
  const userStatus = session?.user?.status ?? null;
  const isBetaActive = userStatus === "BETA_ACTIVE" || userStatus === "ACTIVE";

  return (
    <>
      <AppHeader />
      <main>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">예측 문제</h1>
              <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">사회·경제·기술 이슈에 대한 판단을 점수로 기록하세요.</p>
            </div>
            {isBetaActive ? (
              <Link
                href="/predictions/new"
                className="flex items-center gap-1.5 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />문제 만들기
              </Link>
            ) : isLoggedIn ? (
              <button disabled className="flex items-center gap-1.5 rounded-xl bg-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-400 cursor-not-allowed">
                <Plus className="h-4 w-4" />문제 만들기
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-xl border border-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-primary)] hover:bg-blue-50 transition-colors"
              >
                <Plus className="h-4 w-4" />문제 만들기
              </Link>
            )}
          </div>

          <div className="mb-6">
            <Suspense>
              <PredictionFilters categories={categories} isLoggedIn={isLoggedIn} isBetaActive={isBetaActive} />
            </Suspense>
          </div>

          <Suspense fallback={<GridSkeleton />}>
            <PredictionsGrid searchParams={sp} userId={session?.user?.id} />
          </Suspense>
        </div>
      </main>
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-52 rounded-2xl border border-[var(--color-border-default)] bg-gray-50 animate-pulse" />
      ))}
    </div>
  );
}
