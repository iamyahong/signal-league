"use client";

import { useState } from "react";
import { DisputeSubmitModal } from "@/components/dispute/DisputeSubmitModal";
import { AlertCircle } from "lucide-react";

interface DisputeSubmitButtonProps {
  questionId: string;
  questionTitle: string;
}

export function DisputeSubmitButton({ questionId, questionTitle }: DisputeSubmitButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-900 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-[var(--radius-md)] transition-colors"
      >
        <AlertCircle className="h-4 w-4" />
        이의제기
      </button>
      {open && (
        <DisputeSubmitModal
          questionId={questionId}
          questionTitle={questionTitle}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
