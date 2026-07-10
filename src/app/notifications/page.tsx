import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { AppHeader } from "@/components/layout/AppHeader";
import Link from "next/link";
import { NotificationsClient } from "./_components/NotificationsClient";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string; unreadOnly?: string }>;
}

export default async function NotificationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.status === "PENDING_BETA") redirect("/pending");
  if (session.user.status === "SUSPENDED") redirect("/suspended");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1"));
  const pageSize = 20;
  const unreadOnly = sp.unreadOnly === "1";

  const userId = session.user.id;

  const where = {
    userId,
    deletedAt: null,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [total, items, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        isRead: true,
        readAt: true,
        data: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId, isRead: false, deletedAt: null } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <>
      <AppHeader />
      <main>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)]">알림</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    읽지 않은 알림 {unreadCount}개
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={unreadOnly ? "/notifications" : "/notifications?unreadOnly=1"}
                  className="text-xs border border-[var(--color-border-default)] rounded-lg px-3 py-1.5 text-[var(--color-text-secondary)] hover:bg-gray-50"
                >
                  {unreadOnly ? "전체 보기" : "읽지 않은 것만"}
                </Link>
              </div>
            </div>

            <NotificationsClient
              initialItems={items.map((n) => ({
                id: n.id,
                type: n.type,
                title: n.title,
                body: n.body,
                isRead: n.isRead,
                createdAt: n.createdAt.toISOString(),
              }))}
              total={total}
              page={page}
              totalPages={totalPages}
              unreadOnly={unreadOnly}
              hasUnread={unreadCount > 0}
            />
          </div>
        </div>
      </main>
    </>
  );
}
