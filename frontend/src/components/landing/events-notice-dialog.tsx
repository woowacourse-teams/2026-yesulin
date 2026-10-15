"use client";

import { useId } from "react";
import { ModalShell } from "@/components/auditions/modal-shell";

export function EventsNoticeDialog({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const titleId = useId();
  return <ModalShell open={open} onClose={onClose} labelledBy={titleId} className="notebook-notice-dialog">
    <h2 id={titleId}>준비 중입니다</h2>
    <button type="button" className="notebook-notice-confirm" data-autofocus="true" onClick={onClose}>확인</button>
  </ModalShell>;
}
