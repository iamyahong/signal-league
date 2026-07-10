import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { CategoriesClient } from "./_components/CategoriesClient";

async function getCategoryData() {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });

  const counts = await Promise.all(
    categories.map((c) => prisma.predictionQuestion.count({ where: { categoryId: c.id, deletedAt: null } }))
  );

  return categories.map((c, i) => ({ ...c, questionCount: counts[i] }));
}

export default async function AdminCategoriesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[]) || [];
  const isSuperAdmin = roles.includes("SUPER_ADMIN");

  const categories = await getCategoryData();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">카테고리 관리</h1>
        <p className="text-sm text-[var(--color-text-secondary)] mt-0.5">예측 문제 카테고리를 관리합니다.</p>
      </div>

      <CategoriesClient categories={categories} isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
