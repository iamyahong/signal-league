"use client";

import { useState } from "react";
import { DisputeProcessModal } from "@/components/dispute/DisputeProcessModal";
import { Button } from "@/components/ui/Button";

interface DisputeProcessButtonProps {
  disputeId: string;
  questionStatus: string;
}

export function DisputeProcessButton({ disputeId, questionStatus }: DisputeProcessButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} className="w-full sm:w-auto">
        이의제기 처리하기
      </Button>
      {open && (
        <DisputeProcessModal
          disputeId={disputeId}
          questionStatus={questionStatus}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
