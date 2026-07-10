"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ApproveModal } from "@/components/admin/predictions/ApproveModal";
import { RejectModal } from "@/components/admin/predictions/RejectModal";
import { HideModal } from "@/components/admin/predictions/HideModal";
import { ForceCloseModal } from "@/components/admin/predictions/ForceCloseModal";
import { ResolveModal } from "@/components/admin/predictions/ResolveModal";
import { VoidModal } from "@/components/admin/predictions/VoidModal";
import { toast } from "sonner";
import type { QuestionStatus } from "@prisma/client";

interface Option {
  id: string;
  label: string;
  participantCount: number;
  totalAllocated: number;
}

interface QuestionDetailClientProps {
  question: {
    id: string;
    title: string;
    status: QuestionStatus;
    totalParticipants: number;
    totalAllocated: number;
    creatorCost: number;
    closesAt: string | null;
    resolvesAt: string | null;
    category: { name: string; slug: string };
    author: { nickname: string; email: string };
    options: Option[];
  };
  prev: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
}

type ModalType = "approve" | "reject" | "hide" | "forceClose" | "resolve" | "void" | null;

export function QuestionDetailClient({ question, prev, next }: QuestionDetailClientProps) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalType>(null);

  const refresh = () => {
    router.refresh();
    toast.success("처리가 완료되었습니다.");
  };

  const STATUS_KO: Record<string, string> = {
    PENDING_REVIEW: "검토 중", OPEN: "진행 중", CLOSED: "마감",
    RESOLVED: "결과 확정", VOIDED: "무효", REJECTED: "반려", HIDDEN: "숨김",
  };

  const isTerminal = ["REJECTED", "VOIDED", "HIDDEN", "RESOLVED"].includes(question.status);
  const now = new Date();
  const isOverdue = question.resolvesAt && new Date(question.resolvesAt) <= now;

  return (
    <>
      {modal === "approve" && (
        <ApproveModal
          questionId={question.id}
          questionTitle={question.title}
          authorNickname={question.author.nickname}
          categoryName={question.category.name}
          creatorCost={question.creatorCost}
          onClose={() => setModal(null)}
          onSuccess={refresh}
        />
      )}
      {modal === "reject" && (
        <RejectModal
          questionId={question.id}
          questionTitle={question.title}
          authorNickname={question.author.nickname}
          creatorCost={question.creatorCost}
          onClose={() => setModal(null)}
          onSuccess={refresh}
        />
      )}
      {modal === "hide" && (
        <HideModal
          questionId={question.id}
          questionTitle={question.title}
          currentStatus={STATUS_KO[question.status] ?? question.status}
          participantCount={question.totalParticipants}
          onClose={() => setModal(null)}
          onSuccess={refresh}
        />
      )}
      {modal === "forceClose" && (
        <ForceCloseModal
          questionId={question.id}
          questionTitle={question.title}
          originalClosesAt={question.closesAt}
          onClose={() => setModal(null)}
          onSuccess={refresh}
        />
      )}
      {modal === "resolve" && (
        <ResolveModal
          questionId={question.id}
          questionTitle={question.title}
          totalParticipants={question.totalParticipants}
          totalAllocated={question.totalAllocated}
          creatorCost={question.creatorCost}
          closesAt={question.closesAt}
          options={question.options}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); refresh(); }}
        />
      )}
      {modal === "void" && (
        <VoidModal
          questionId={question.id}
          questionTitle={question.title}
          totalParticipants={question.totalParticipants}
          totalAllocated={question.totalAllocated}
          creatorCost={question.creatorCost}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); refresh(); }}
        />
      )}

      <div className="space-y-3">
        {question.status === "PENDING_REVIEW" && (prev || next) && (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-[var(--radius-lg)] px-3 py-2">
            <span className="text-xs text-amber-700 font-medium">검토 큐 탐색</span>
            <div className="flex gap-2">
              {prev ? (
                <Link href={`/admin/predictions/${prev.id}`} className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900">
                  <ChevronLeft className="h-3.5 w-3.5" />이전
                </Link>
              ) : <span className="text-xs text-amber-400">이전 없음</span>}
              <span className="text-amber-300">|</span>
              {next ? (
                <Link href={`/admin/predictions/${next.id}`} className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900">
                  다음<ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : <span className="text-xs text-amber-400">다음 없음</span>}
            </div>
          </div>
        )}

        {question.status === "CLOSED" && (
          <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4 space-y-2">
            <div className="text-xs text-[var(--color-text-tertiary)]">
              <p>참여자: <span className="font-medium text-[var(--color-text-primary)]">{question.totalParticipants}명</span></p>
              <p>총 배분: <span className="font-medium text-[var(--color-text-primary)]">{question.totalAllocated.toLocaleString()}점</span></p>
              {question.resolvesAt && (
                <p className={`mt-1 ${isOverdue ? "text-red-600 font-semibold" : ""}`}>
                  확정 예정: {isOverdue ? "⚠ 지연 — " : ""}{new Date(question.resolvesAt).toLocaleDateString("ko-KR")}
                </p>
              )}
              {question.options.map((o) => (
                <p key={o.id} className="mt-0.5">{o.label}: {o.participantCount}명 / {o.totalAllocated.toLocaleString()}점</p>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-[var(--radius-xl)] border border-[var(--color-border-default)] p-4">
          <h2 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase mb-3">액션</h2>
          {isTerminal ? (
            <p className="text-sm text-[var(--color-text-tertiary)]">더 이상 변경할 수 없는 상태입니다.</p>
          ) : (
            <div className="space-y-2">
              {question.status === "PENDING_REVIEW" && (
                <>
                  <Button variant="primary" size="sm" className="w-full" onClick={() => setModal("approve")}>승인</Button>
                  <Button variant="ghost" size="sm" className="w-full bg-red-600 text-white hover:bg-red-700" onClick={() => setModal("reject")}>반려</Button>
                </>
              )}
              {question.status === "OPEN" && (
                <>
                  <Button variant="ghost" size="sm" className="w-full bg-gray-700 text-white hover:bg-gray-800" onClick={() => setModal("hide")}>숨김 처리</Button>
                  <Button variant="ghost" size="sm" className="w-full bg-orange-600 text-white hover:bg-orange-700" onClick={() => setModal("forceClose")}>강제 마감</Button>
                  <Button variant="ghost" size="sm" className="w-full bg-red-700 text-white hover:bg-red-800" onClick={() => setModal("void")}>무효 처리</Button>
                </>
              )}
              {question.status === "CLOSED" && (
                <>
                  <Button variant="primary" size="sm" className="w-full" onClick={() => setModal("resolve")}>결과 확정</Button>
                  <Button variant="ghost" size="sm" className="w-full bg-orange-600 text-white hover:bg-orange-700" onClick={() => setModal("void")}>무효 처리</Button>
                  <Button variant="ghost" size="sm" className="w-full bg-gray-700 text-white hover:bg-gray-800" onClick={() => setModal("hide")}>숨김 처리</Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
