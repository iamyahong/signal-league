"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { ReportModal } from "@/components/prediction/ReportModal";

interface ExternalLinkReportButtonProps {
  questionId: string;
  userId?: string;
}

export function ExternalLinkReportButton({ questionId, userId }: ExternalLinkReportButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);

  if (!userId) return null;

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:bg-gray-100 transition-colors"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-32 rounded-xl border border-[var(--color-border-default)] bg-white shadow-lg z-50 py-1">
            <button
              onClick={() => { setMenuOpen(false); setShowReport(true); }}
              className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
            >
              신고하기
            </button>
          </div>
        </>
      )}
      {showReport && (
        <ReportModal targetType="question" targetId={questionId} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
