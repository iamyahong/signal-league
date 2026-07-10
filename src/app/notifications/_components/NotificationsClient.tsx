"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCheck, Bell } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface NotifItem {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

interface Props {
  initialItems: NotifItem[];
  total: number;
  page: number;
  totalPages: number;
  unreadOnly: boolean;
  hasUnread: boolean;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

export function NotificationsClient({
  initialItems,
  total,
  page,
  totalPages,
  unreadOnly,
  hasUnread,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function markAllRead() {
    startTransition(async () => {
      const res = await fetch("/internal/notifications/read-all", { method: "POST" });
      if (res.ok) {
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        toast.success("모든 알림을 읽음 처리했습니다.");
        router.refresh();
      } else {
        toast.error("처리 중 오류가 발생했습니다.");
      }
    });
  }

  async function markOneRead(id: string) {
    const res = await fetch(`/internal/notifications/${id}/read`, { method: "POST" });
    if (res.ok) {
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    }
  }

  return (
    <div>
      {hasUnread && (
        <div className="mb-4 flex justify-end">
          <button
            onClick={markAllRead}
            disabled={isPending}
            className="flex items-center gap-1.5 text-sm text-[var(--color-accent-primary)] hover:underline disabled:opacity-50"
          >
            <CheckCheck className="h-4 w-4" />
            모두 읽음 처리
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)]">
          <Bell className="h-8 w-8 text-[var(--color-text-tertiary)] mx-auto mb-2" />
          <p className="text-[var(--color-text-tertiary)]">
            {unreadOnly ? "읽지 않은 알림이 없습니다." : "알림이 없습니다."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markOneRead(n.id)}
              className={`rounded-[var(--radius-xl)] border p-4 transition-colors cursor-default ${
                n.isRead
                  ? "bg-white border-[var(--color-border-default)]"
                  : "bg-blue-50 border-blue-200 cursor-pointer hover:bg-blue-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                    <p
                      className={`text-sm font-medium ${
                        n.isRead
                          ? "text-[var(--color-text-secondary)]"
                          : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {n.title}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{n.body}</p>
                </div>
                <span className="text-xs text-[var(--color-text-tertiary)] shrink-0">
                  {timeAgo(n.createdAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/notifications?${unreadOnly ? "unreadOnly=1&" : ""}page=${page - 1}`}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm hover:bg-gray-50"
            >
              이전
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)]">
            {page} / {totalPages} ({total}개)
          </span>
          {page < totalPages && (
            <Link
              href={`/notifications?${unreadOnly ? "unreadOnly=1&" : ""}page=${page + 1}`}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm hover:bg-gray-50"
            >
              다음
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
