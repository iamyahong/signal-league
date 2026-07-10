import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AppHeader } from "@/components/layout/AppHeader";
import { NewQuestionForm } from "./_components/NewQuestionForm";

export default async function NewPredictionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const status = session.user.status;
  if (status === "PENDING_BETA") redirect("/pending");
  if (status === "SUSPENDED") redirect("/suspended");
  if (status !== "BETA_ACTIVE" && status !== "ACTIVE") redirect("/home");

  const [categories, profile, settings] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true, deletedAt: null }, orderBy: { sortOrder: "asc" } }),
    prisma.userProfile.findUnique({ where: { userId: session.user.id }, select: { availableScore: true } }),
    prisma.serviceSetting.findMany({ where: { key: { in: ["question_create_min_score", "question_create_max_score"] } } }),
  ]);

  const currentScore = profile?.availableScore ?? 0;
  const settingMap = Object.fromEntries(settings.map((s) => [s.key, parseInt(s.value, 10)]));
  const minScore = settingMap.question_create_min_score ?? 50;
  const maxScore = settingMap.question_create_max_score ?? 5000;

  const minCost = Math.max(Math.ceil(currentScore * 0.05), minScore);
  const maxCost = Math.min(currentScore, maxScore);

  return (
    <>
      <AppHeader />
      <main>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">예측 문제 만들기</h1>
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm text-amber-800">예측 문제는 운영자 검토 후 공개됩니다. 결과 기준이 명확하고 객관적으로 판정 가능한 문제를 만들어주세요.</p>
              </div>
            </div>

            <NewQuestionForm
              categories={categories}
              currentScore={currentScore}
              minCost={minCost}
              maxCost={maxCost}
            />
          </div>
        </div>
      </main>
    </>
  );
}
