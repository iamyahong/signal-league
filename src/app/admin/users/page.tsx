import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { UserStatus } from "@prisma/client";
import { STATUS_LABELS, STATUS_COLORS, PLAN_LABELS } from "@/lib/constants/scoreLedger";
import { AdminUsersFilter } from "./_components/AdminUsersFilter";

interface Props {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}

async function getUsers(search: string, status: string, page: number) {
  const pageSize = 20;
  const where: import("@prisma/client").Prisma.UserWhereInput = {
    deletedAt: null,
    ...(search && {
      OR: [
        { email: { contains: search, mode: "insensitive" } },
        { nickname: { contains: search, mode: "insensitive" } },
      ],
    }),
    ...(status && status !== "all" && { status: status as UserStatus }),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: {
        profile: { select: { availableScore: true } },
        subscription: { include: { plan: { select: { code: true } } } },
        roles: { select: { role: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { users, total, totalPages: Math.ceil(total / pageSize) };
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const search = sp.search ?? "";
  const status = sp.status ?? "all";
  const page = Math.max(1, parseInt(sp.page ?? "1"));

  const { users, total, totalPages } = await getUsers(search, status, page);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[var(--color-text-primary)]">회원 관리</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">총 {total.toLocaleString()}명</p>
        </div>
      </div>

      <AdminUsersFilter currentSearch={search} currentStatus={status} />

      <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] overflow-hidden">
        {users.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--color-text-tertiary)]">조건에 맞는 회원이 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-muted)]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">닉네임/이메일</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">요금제</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-text-secondary)]">보유 점수</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">역할</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-text-secondary)]">가입일</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-[var(--color-surface-muted)] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-text-primary)]">{u.nickname}</p>
                      <p className="text-xs text-[var(--color-text-tertiary)]">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[u.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABELS[u.status] ?? u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                      {PLAN_LABELS[u.subscription?.plan?.code ?? ""] ?? (u.status === "PENDING_BETA" ? `희망: ${PLAN_LABELS[u.desiredPlanCode]}` : "—")}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {(u.profile?.availableScore ?? 0).toLocaleString()}점
                    </td>
                    <td className="px-4 py-3">
                      {u.roles.length > 0 ? (
                        <span className="text-xs text-[var(--color-accent-primary)] font-medium">
                          {u.roles.map((r) => r.role).join(", ")}
                        </span>
                      ) : <span className="text-xs text-[var(--color-text-tertiary)]">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--color-text-tertiary)]">
                      {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${u.id}`} className="text-xs text-[var(--color-accent-primary)] hover:underline">
                        상세 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/users?search=${search}&status=${status}&page=${p}`}
              className={`w-8 h-8 flex items-center justify-center rounded text-sm ${p === page ? "bg-[var(--color-accent-primary)] text-white font-medium" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
