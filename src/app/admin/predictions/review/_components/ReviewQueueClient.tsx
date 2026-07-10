"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { CategoryBadge } from "@/components/prediction/StatusBadge";
import { ApproveModal } from "@/components/admin/predictions/ApproveModal";
import { RejectModal } from "@/components/admin/predictions/RejectModal";
import { toast } from "sonner";

interface ReviewQuestion {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  closesAt: string | null;
  creatorCost: number;
  waitMinutes: number;
  author: {
    nickname: string;
    email: string;
    profile: { availableScore: number } | null;
  };
  category: { name: string; slug: string };
  options: { id: string; label: string }[];
}

type ModalState =
  | { type: "approve"; q: ReviewQuestion }
  | { type: "reject"; q: ReviewQuestion }
  | null;

export function ReviewQueueClient({ questions }: { questions: ReviewQuestion[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);

  const refresh = () => {
    router.refresh();
    toast.success("처리가 완료되었습니다.");
  };

  const formatWait = (minutes: number) => {
    if (minutes < 60) return `${minutes}분 전`;
    if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
    return `${Math.floor(minutes / (60 * 24))}일 전`;
  };

  return (
    <>
      {modal?.type === "approve" && (
        <ApproveModal
          questionId={modal.q.id}
          questionTitle={modal.q.title}
          authorNickname={modal.q.author.nickname}
          categoryName={modal.q.category.name}
          creatorCost={modal.q.creatorCost}
          onClose={() => setModal(null)}
          onSuccess={refresh}
        />
      )}
      {modal?.type === "reject" && (
        <RejectModal
          questionId={modal.q.id}
          questionTitle={modal.q.title}
          authorNickname={modal.q.author.nickname}
          creatorCost={modal.q.creatorCost}
          onClose={() => setModal(null)}
          onSuccess={refresh}
        />
      )}

      {questions.length === 0 ? (
        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-12 text-center">
          <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--color-text-primary)]">검토 대기 중인 예측 문제가 없습니다.</p>
          <p className="text-xs text-[var(--color-text-tertiary)] mt-1">새로운 신청이 들어오면 이곳에 표시됩니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CategoryBadge slug={q.category.slug} name={q.category.name} />
                    <span className="flex items-center gap-1 text-xs text-[var(--color-text-tertiary)]">
                      <Clock className="h-3 w-3" />
                      {formatWait(q.waitMinutes)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-[var(--color-text-primary)] text-sm leading-snug mb-1">{q.title}</h3>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    작성자: {q.author.nickname} ({q.author.email})
                  </p>
                  {q.description && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                      {q.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {q.options.slice(0, 4).map((opt) => (
                      <span key={opt.id} className="text-xs bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)] rounded px-2 py-0.5">
                        {opt.label}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="shrink-0 text-right space-y-1 min-w-[120px]">
                  <div className="text-xs text-[var(--color-text-tertiary)]">
                    생성 비용 <span className="font-semibold text-[var(--color-text-primary)]">{q.creatorCost.toLocaleString()}점</span>
                  </div>
                  {q.author.profile && (
                    <div className="text-xs text-[var(--color-text-tertiary)]">
                      현 보유 <span className="font-medium text-[var(--color-text-secondary)]">{q.author.profile.availableScore.toLocaleString()}점</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 mt-3">
                    <Link
                      href={`/admin/predictions/${q.id}`}
                      className="text-xs px-3 py-1.5 bg-[var(--color-surface-muted)] text-[var(--color-text-primary)] rounded-[var(--radius-md)] hover:bg-[var(--color-border-default)] text-center"
                    >
                      상세 검토
                    </Link>
                    <button
                      onClick={() => setModal({ type: "approve", q })}
                      className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded-[var(--radius-md)] hover:bg-green-700"
                    >
                      <CheckCircle className="h-3 w-3" />
                      승인
                    </button>
                    <button
                      onClick={() => setModal({ type: "reject", q })}
                      className="flex items-center justify-center gap-1 text-xs px-3 py-1.5 bg-red-600 text-white rounded-[var(--radius-md)] hover:bg-red-700"
                    >
                      <XCircle className="h-3 w-3" />
                      반려
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
