import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { CommentsAdminClient } from "./_components/CommentsAdminClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    page?: string;
    adminDeleted?: string;
    hidden?: string;
    q?: string;
  }>;
}

export default async function AdminCommentsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const roles = (session.user.roles as string[]) || [];
  const isAdmin = roles.includes("SUPER_ADMIN") || roles.includes("OPERATOR");
  if (!isAdmin) redirect("/home");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const pageSize = 30;
  const adminDeleted = sp.adminDeleted ?? "";
  const hidden = sp.hidden ?? "";
  const q = sp.q ?? "";

  const where: Prisma.CommentWhereInput = {
    ...(adminDeleted === "1"
      ? { deletedByAdminId: { not: null } }
      : adminDeleted === "0"
        ? { deletedByAdminId: null, deletedAt: null }
        : { deletedAt: null }),
    ...(hidden === "1" ? { isHidden: true } : hidden === "0" ? { isHidden: false } : {}),
    ...(q ? { content: { contains: q, mode: "insensitive" as const } } : {}),
  };

  const [total, items] = await Promise.all([
    prisma.comment.count({ where }),
    prisma.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, nickname: true, email: true } },
        question: { select: { id: true, title: true } },
      },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">댓글 관리</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          전체 댓글을 검색하고 운영자 삭제 처리합니다.
        </p>
      </div>

      <CommentsAdminClient
        initialItems={items.map((c) => ({
          id: c.id,
          content: c.content,
          commentType: c.commentType,
          isHidden: c.isHidden,
          deletedAt: c.deletedAt?.toISOString() ?? null,
          deletedByAdminId: c.deletedByAdminId,
          deletionReason: c.deletionReason,
          createdAt: c.createdAt.toISOString(),
          user: c.user,
          question: c.question,
        }))}
        total={total}
        page={page}
        totalPages={Math.ceil(total / pageSize)}
        adminDeleted={adminDeleted}
        hidden={hidden}
        q={q}
      />
    </div>
  );
}
