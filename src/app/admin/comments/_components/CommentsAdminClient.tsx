"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Trash2, X } from "lucide-react";
import { CommentType } from "@prisma/client";

interface CommentItem {
  id: string;
  content: string;
  commentType: CommentType;
  isHidden: boolean;
  deletedAt: string | null;
  deletedByAdminId: string | null;
  deletionReason: string | null;
  createdAt: string;
  user: { id: string; nickname: string; email: string };
  question: { id: string; title: string };
}

interface Props {
  initialItems: CommentItem[];
  total: number;
  page: number;
  totalPages: number;
  adminDeleted: string;
  hidden: string;
  q: string;
}

const TYPE_LABELS: Record<CommentType, string> = {
  GROUND:   "근거",
  COUNTER:  "반론",
  QUESTION: "질문",
  INFO:     "정보",
  OTHER:    "기타",
};

function DeleteModal({
  comment,
  onClose,
  onConfirm,
  isPending,
}: {
  comment: CommentItem;
  onClose: () => void;
  onConfirm: (reason: string, message: string) => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("운영자에 의해 삭제된 댓글입니다.");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-[var(--radius-xl)] shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--color-text-primary)]">댓글 삭제</h2>
          <button onClick={onClose} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-[var(--color-text-secondary)] line-clamp-3">
          {comment.content}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              삭제 사유 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="내부 사유 (사용자에게 미표시)"
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
              사용자 표시 메시지
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-[var(--radius-lg)] border border-[var(--color-border-default)] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-[var(--color-border-default)] rounded-[var(--radius-lg)] hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={() => onConfirm(reason, message)}
            disabled={!reason.trim() || isPending}
            className="px-4 py-2 text-sm bg-red-600 text-white rounded-[var(--radius-lg)] hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            삭제하기
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommentsAdminClient({
  initialItems,
  total,
  page,
  totalPages,
  adminDeleted,
  hidden,
  q,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState(q);
  const [deleteTarget, setDeleteTarget] = useState<CommentItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function buildUrl(params: Record<string, string>) {
    const base: Record<string, string> = { adminDeleted, hidden, q };
    const merged = { ...base, ...params };
    const qs = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `/admin/comments${qs ? `?${qs}` : ""}`;
  }

  function submitSearch() {
    router.push(buildUrl({ q: search, page: "1" }));
  }

  function confirmDelete(reason: string, message: string) {
    if (!deleteTarget) return;
    const commentId = deleteTarget.id;
    startTransition(async () => {
      const res = await fetch(`/internal/admin/comments/${commentId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deletionReason: reason,
          userVisibleDeletionMessage: message,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("댓글이 삭제되었습니다.");
        setItems((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  deletedAt: new Date().toISOString(),
                  deletedByAdminId: "admin",
                  deletionReason: reason,
                }
              : c
          )
        );
        setDeleteTarget(null);
        router.refresh();
      } else {
        toast.error(data.error ?? "삭제 처리 중 오류가 발생했습니다.");
      }
    });
  }

  return (
    <div>
      {deleteTarget && (
        <DeleteModal
          comment={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          isPending={isPending}
        />
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1.5">
          {[
            { v: "", label: "전체" },
            { v: "0", label: "정상" },
            { v: "1", label: "관리자 삭제" },
          ].map((f) => (
            <Link
              key={f.v}
              href={buildUrl({ adminDeleted: f.v, page: "1" })}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                adminDeleted === f.v
                  ? "bg-[var(--color-accent-primary)] text-white border-transparent"
                  : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/50"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="flex-1 flex gap-2 min-w-[200px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch()}
              placeholder="댓글 내용 검색..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--color-border-default)] rounded-[var(--radius-lg)]"
            />
          </div>
          <button
            onClick={submitSearch}
            className="px-3 py-1.5 text-xs bg-[var(--color-accent-primary)] text-white rounded-[var(--radius-lg)]"
          >
            검색
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--color-text-tertiary)] mb-3">
        총 {total.toLocaleString()}개
      </p>

      {items.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)]">
          <p className="text-[var(--color-text-tertiary)]">댓글이 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border-default)] bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)]">내용</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden md:table-cell">유형</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden sm:table-cell">작성자</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden lg:table-cell">문제</th>
                  <th className="text-center px-4 py-3 font-medium text-[var(--color-text-secondary)]">상태</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--color-text-secondary)] hidden md:table-cell">작성일</th>
                  <th className="text-center px-4 py-3 font-medium text-[var(--color-text-secondary)]">삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {items.map((c) => (
                  <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${c.deletedAt ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="line-clamp-2 text-[var(--color-text-primary)] max-w-[280px]">
                        {c.deletedAt && c.deletedByAdminId ? (
                          <span className="italic text-[var(--color-text-tertiary)]">운영자에 의해 삭제됨</span>
                        ) : (
                          c.content
                        )}
                      </p>
                      {c.deletionReason && (
                        <p className="text-xs text-red-500 mt-0.5">사유: {c.deletionReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {TYPE_LABELS[c.commentType] ?? c.commentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-[var(--color-text-secondary)] text-xs">
                      {c.user.nickname}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Link
                        href={`/predictions/${c.question.id}`}
                        className="text-xs text-[var(--color-accent-primary)] hover:underline line-clamp-1 max-w-[160px]"
                      >
                        {c.question.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.deletedAt ? (
                        <span className="text-xs text-red-500 font-medium">삭제됨</span>
                      ) : c.isHidden ? (
                        <span className="text-xs text-amber-600 font-medium">숨김</span>
                      ) : (
                        <span className="text-xs text-green-600 font-medium">정상</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--color-text-tertiary)] hidden md:table-cell">
                      {new Date(c.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!c.deletedAt && (
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className="px-3 py-1.5 rounded-lg border border-[var(--color-border-default)] text-sm hover:bg-gray-50"
            >
              이전
            </Link>
          )}
          <span className="px-3 py-1.5 text-sm text-[var(--color-text-secondary)]">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={buildUrl({ page: String(page + 1) })}
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
