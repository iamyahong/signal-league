import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { StatusBadge, CategoryBadge } from "@/components/prediction/StatusBadge";
import { QuestionStatus } from "@prisma/client";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams { status?: string; submitted?: string }

export default async function MyQuestionsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const status = session.user.status;
  if (status !== "BETA_ACTIVE" && status !== "ACTIVE") redirect("/home");

  const sp = await searchParams;
  const filterStatus = sp.status as QuestionStatus | undefined;
  const submitted = sp.submitted === "1";

  const validStatuses = Object.values(QuestionStatus) as QuestionStatus[];
  const statusFilter = filterStatus && validStatuses.includes(filterStatus) ? filterStatus : undefined;

  const questions = await prisma.predictionQuestion.findMany({
    where: {
      authorId: session.user.id,
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { slug: true, name: true } },
      _count: { select: { participations: { where: { deletedAt: null } } } },
    },
  });

  const STATUS_FILTERS = [
    { value: "", label: "전체" },
    { value: "PENDING_REVIEW", label: "검토 중" },
    { value: "OPEN",           label: "공개 중" },
    { value: "CLOSED",         label: "마감" },
    { value: "RESOLVED",       label: "결과 확정" },
    { value: "REJECTED",       label: "반려" },
    { value: "VOIDED",         label: "무효" },
  ];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">내가 만든 문제</h1>
        <Link href="/predictions/new" className="flex items-center gap-1.5 rounded-xl bg-[var(--color-accent-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" />문제 만들기
        </Link>
      </div>

      {submitted && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm text-green-700">예측 문제가 제출되었습니다. 운영자 검토 후 공개됩니다.</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value ? `/me/questions?status=${f.value}` : "/me/questions"}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${(filterStatus ?? "") === f.value ? "bg-[var(--color-accent-primary)] text-white border-transparent" : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {questions.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-[var(--color-text-tertiary)] mb-3">아직 만든 예측 문제가 없습니다.</p>
          <Link href="/predictions/new" className="text-sm text-[var(--color-accent-primary)] hover:underline">첫 예측 문제를 만들어보세요.</Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)] bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">제목</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden sm:table-cell">카테고리</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">상태</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden md:table-cell">참여자</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden md:table-cell">총 배분</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden lg:table-cell">생성 비용</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden lg:table-cell">생성일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {questions.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/predictions/${q.id}`} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] line-clamp-2">
                        {q.title}
                      </Link>
                      {q.status === "PENDING_REVIEW" && (
                        <span className="block text-xs text-amber-600 mt-0.5">운영자 검토 중</span>
                      )}
                      {q.status === "REJECTED" && q.rejectionReason && (
                        <span className="block text-xs text-red-500 mt-0.5">반려 사유: {q.rejectionReason}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <CategoryBadge slug={q.category.slug} name={q.category.name} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={q.status as Parameters<typeof StatusBadge>[0]["status"]} />
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-secondary)] hidden md:table-cell">{q._count.participations.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-secondary)] hidden md:table-cell">{q.totalAllocated.toLocaleString()}점</td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-secondary)] hidden lg:table-cell">{q.creatorCost.toLocaleString()}점</td>
                    <td className="px-4 py-3 text-right text-[var(--color-text-secondary)] hidden lg:table-cell">{new Date(q.createdAt).toLocaleDateString("ko-KR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
