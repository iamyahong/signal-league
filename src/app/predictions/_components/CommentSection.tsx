"use client";

import { useState, useEffect, useCallback } from "react";
import { Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { clsx } from "clsx";
import { ReportModal } from "@/components/prediction/ReportModal";

const COMMENT_TYPE_CONFIG = {
  GROUND:   { label: "근거",    className: "bg-green-100 text-green-700" },
  COUNTER:  { label: "반론",    className: "bg-orange-100 text-orange-700" },
  QUESTION: { label: "질문",    className: "bg-blue-100 text-blue-700" },
  INFO:     { label: "정보공유", className: "bg-gray-100 text-gray-600" },
  OTHER:    { label: "기타",    className: "bg-gray-100 text-gray-500" },
} as const;

const COMMENT_TYPES = [
  { value: "GROUND",   label: "근거" },
  { value: "COUNTER",  label: "반론" },
  { value: "QUESTION", label: "질문" },
  { value: "INFO",     label: "정보공유" },
  { value: "OTHER",    label: "기타" },
];

interface Comment {
  id: string;
  content: string;
  commentType: keyof typeof COMMENT_TYPE_CONFIG;
  createdAt: string;
  user: { id: string; nickname: string };
}

interface CommentSectionProps {
  questionId: string;
  currentUserId?: string;
  userStatus?: string;
}

export function CommentSection({ questionId, currentUserId, userStatus }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [commentType, setCommentType] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reportTarget, setReportTarget] = useState<{ type: "comment"; id: string } | null>(null);

  const fetchComments = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/internal/predictions/${questionId}/comments?page=${p}`);
      if (!res.ok) return;
      const j = await res.json();
      if (p === 1) setComments(j.comments);
      else setComments((prev) => [...prev, ...j.comments]);
      setTotal(j.total);
      setTotalPages(j.totalPages);
    } finally {
      setLoading(false);
    }
  }, [questionId]);

  useEffect(() => { fetchComments(1); }, [fetchComments]);

  async function handleSubmit() {
    if (!commentType) { toast.error("댓글 유형을 선택해주세요."); return; }
    if (!content.trim()) { toast.error("댓글 내용을 입력해주세요."); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/internal/predictions/${questionId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentType, content }),
      });
      const j = await res.json();
      if (!res.ok) { toast.error(j.error ?? "댓글 작성에 실패했습니다."); return; }
      toast.success("댓글이 등록되었습니다.");
      setCommentType("");
      setContent("");
      fetchComments(1);
      setPage(1);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: string) {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    const res = await fetch(`/internal/comments/${commentId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("삭제에 실패했습니다."); return; }
    toast.success("댓글이 삭제되었습니다.");
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    setTotal((prev) => prev - 1);
  }

  const canWrite = userStatus === "BETA_ACTIVE" || userStatus === "ACTIVE";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">댓글</h3>
        <span className="text-sm text-[var(--color-text-tertiary)]">{total}개</span>
      </div>

      {canWrite ? (
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {COMMENT_TYPES.map((t) => {
              const cfg = COMMENT_TYPE_CONFIG[t.value as keyof typeof COMMENT_TYPE_CONFIG];
              return (
                <label key={t.value} className={clsx("flex items-center gap-1.5 cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all", commentType === t.value ? `${cfg.className} border-transparent` : "border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)]/40")}>
                  <input type="radio" name="commentType" value={t.value} checked={commentType === t.value} onChange={() => setCommentType(t.value)} className="sr-only" />
                  {t.label}
                </label>
              );
            })}
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="댓글을 입력하세요. (최대 1000자)"
            className="w-full rounded-xl border border-[var(--color-border-default)] px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]/30"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-[var(--color-text-tertiary)]">{content.length}/1000</span>
            <button onClick={handleSubmit} disabled={submitting || !commentType || !content.trim()}
              className="rounded-xl bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40">
              {submitting ? "등록 중..." : "등록"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--color-border-default)] bg-gray-50 p-4 text-center">
          <p className="text-sm text-[var(--color-text-secondary)]">
            {!currentUserId ? "베타 회원만 댓글을 작성할 수 있습니다." : "베타 승인 후 댓글을 작성할 수 있습니다."}
          </p>
        </div>
      )}

      <div className="space-y-3">
        {loading && comments.length === 0 && (
          <div className="text-center py-8 text-sm text-[var(--color-text-tertiary)]">불러오는 중...</div>
        )}
        {!loading && comments.length === 0 && (
          <div className="text-center py-8 text-sm text-[var(--color-text-tertiary)]">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</div>
        )}
        {comments.map((c) => {
          const cfg = COMMENT_TYPE_CONFIG[c.commentType] ?? COMMENT_TYPE_CONFIG.OTHER;
          const isOwn = currentUserId === c.user.id;
          return (
            <div key={c.id} className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx("rounded-full px-2 py-0.5 text-xs font-medium", cfg.className)}>{cfg.label}</span>
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">{c.user.nickname}</span>
                  <span className="text-xs text-[var(--color-text-tertiary)]">{new Date(c.createdAt).toLocaleDateString("ko-KR")}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {currentUserId && !isOwn && (
                    <button onClick={() => setReportTarget({ type: "comment", id: c.id })}
                      className="p-1 rounded text-[var(--color-text-tertiary)] hover:text-red-400 hover:bg-red-50 transition-colors" title="신고">
                      <Flag className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {isOwn && (
                    <button onClick={() => handleDelete(c.id)}
                      className="p-1 rounded text-[var(--color-text-tertiary)] hover:text-red-400 hover:bg-red-50 transition-colors" title="삭제">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{c.content}</p>
            </div>
          );
        })}
      </div>

      {page < totalPages && (
        <button onClick={() => { const next = page + 1; setPage(next); fetchComments(next); }}
          disabled={loading}
          className="w-full py-2.5 rounded-xl border border-[var(--color-border-default)] text-sm text-[var(--color-text-secondary)] hover:bg-gray-50 disabled:opacity-50">
          {loading ? "불러오는 중..." : "더 보기"}
        </button>
      )}

      {reportTarget && (
        <ReportModal targetType={reportTarget.type} targetId={reportTarget.id} onClose={() => setReportTarget(null)} />
      )}
    </div>
  );
}
