"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MoreHorizontal } from "lucide-react";
import { StatusBadge, CategoryBadge } from "@/components/prediction/StatusBadge";
import { ApproveModal } from "@/components/admin/predictions/ApproveModal";
import { RejectModal } from "@/components/admin/predictions/RejectModal";
import { HideModal } from "@/components/admin/predictions/HideModal";
import { ForceCloseModal } from "@/components/admin/predictions/ForceCloseModal";
import { toast } from "sonner";
import type { QuestionStatus } from "@prisma/client";

interface QuestionRow {
  id: string;
  title: string;
  status: QuestionStatus;
  createdAt: string;
  closesAt: string | null;
  resolvesAt: string | null;
  totalParticipants: number;
  totalAllocated: number;
  creatorCost: number;
  author: { nickname: string; email: string };
  category: { name: string; slug: string };
}

type ModalState =
  | { type: "approve"; q: QuestionRow }
  | { type: "reject"; q: QuestionRow }
  | { type: "hide"; q: QuestionRow }
  | { type: "forceClose"; q: QuestionRow }
  | null;

export function PredictionsListClient({ questions }: { questions: QuestionRow[] }) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const refresh = () => {
    router.refresh();
    toast.success("처리가 완료되었습니다.");
  };

  const STATUS_KO: Record<string, string> = {
    PENDING_REVIEW: "검토 중", OPEN: "진행 중", CLOSED: "마감", RESOLVED: "결과 확정",
    VOIDED: "무효", REJECTED: "반려", HIDDEN: "숨김", DRAFT: "작성 중",
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
      {modal?.type === "hide" && (
        <HideModal
          questionId={modal.q.id}
          questionTitle={modal.q.title}
          currentStatus={STATUS_KO[modal.q.status] ?? modal.q.status}
          participantCount={modal.q.totalParticipants}
          onClose={() => setModal(null)}
          onSuccess={refresh}
        />
      )}
      {modal?.type === "forceClose" && (
        <ForceCloseModal
          questionId={modal.q.id}
          questionTitle={modal.q.title}
          originalClosesAt={modal.q.closesAt}
          onClose={() => setModal(null)}
          onSuccess={refresh}
        />
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border-default)] text-[var(--color-text-tertiary)] text-xs">
              <th className="text-left py-2.5 pr-3 font-medium">생성일</th>
              <th className="text-left py-2.5 pr-3 font-medium">제목</th>
              <th className="text-left py-2.5 pr-3 font-medium">카테고리</th>
              <th className="text-left py-2.5 pr-3 font-medium">작성자</th>
              <th className="text-left py-2.5 pr-3 font-medium">상태</th>
              <th className="text-right py-2.5 pr-3 font-medium">참여자</th>
              <th className="text-right py-2.5 pr-3 font-medium">배분 점수</th>
              <th className="text-left py-2.5 pr-3 font-medium">마감일</th>
              <th className="py-2.5 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-default)]">
            {questions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-sm text-[var(--color-text-tertiary)]">
                  조건에 맞는 예측 문제가 없습니다.
                </td>
              </tr>
            ) : (
              questions.map((q) => (
                <tr key={q.id} className="hover:bg-[var(--color-surface-muted)] transition-colors">
                  <td className="py-2.5 pr-3 text-[var(--color-text-tertiary)] whitespace-nowrap">
                    {new Date(q.createdAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" })}
                  </td>
                  <td className="py-2.5 pr-3 max-w-[240px]">
                    <Link href={`/admin/predictions/${q.id}`} className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-primary)] line-clamp-1">
                      {q.title}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    <CategoryBadge slug={q.category.slug} name={q.category.name} />
                  </td>
                  <td className="py-2.5 pr-3">
                    <span title={q.author.email} className="text-[var(--color-text-secondary)] cursor-help">
                      {q.author.nickname}
                    </span>
                  </td>
                  <td className="py-2.5 pr-3">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="py-2.5 pr-3 text-right text-[var(--color-text-secondary)]">
                    {q.totalParticipants.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-[var(--color-text-secondary)]">
                    {q.totalAllocated.toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-3 text-[var(--color-text-tertiary)] whitespace-nowrap">
                    {q.closesAt ? new Date(q.closesAt).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) : "—"}
                  </td>
                  <td className="py-2.5 relative">
                    <button
                      onClick={() => setOpenMenu(openMenu === q.id ? null : q.id)}
                      className="p-1 rounded hover:bg-[var(--color-border-default)] text-[var(--color-text-tertiary)]"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {openMenu === q.id && (
                      <div
                        className="absolute right-0 top-full z-20 mt-1 w-36 bg-white border border-[var(--color-border-default)] rounded-[var(--radius-lg)] shadow-lg overflow-hidden"
                        onMouseLeave={() => setOpenMenu(null)}
                      >
                        <Link
                          href={`/admin/predictions/${q.id}`}
                          className="block px-3 py-2 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                        >
                          상세 보기
                        </Link>
                        {q.status === "PENDING_REVIEW" && (
                          <>
                            <button
                              onClick={() => { setModal({ type: "approve", q }); setOpenMenu(null); }}
                              className="block w-full text-left px-3 py-2 text-xs text-green-700 hover:bg-green-50"
                            >
                              빠른 승인
                            </button>
                            <button
                              onClick={() => { setModal({ type: "reject", q }); setOpenMenu(null); }}
                              className="block w-full text-left px-3 py-2 text-xs text-red-700 hover:bg-red-50"
                            >
                              빠른 반려
                            </button>
                          </>
                        )}
                        {q.status === "OPEN" && (
                          <>
                            <button
                              onClick={() => { setModal({ type: "hide", q }); setOpenMenu(null); }}
                              className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              숨김 처리
                            </button>
                            <button
                              onClick={() => { setModal({ type: "forceClose", q }); setOpenMenu(null); }}
                              className="block w-full text-left px-3 py-2 text-xs text-orange-700 hover:bg-orange-50"
                            >
                              강제 마감
                            </button>
                          </>
                        )}
                        {q.status === "CLOSED" && (
                          <button
                            onClick={() => { setModal({ type: "hide", q }); setOpenMenu(null); }}
                            className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                          >
                            숨김 처리
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
