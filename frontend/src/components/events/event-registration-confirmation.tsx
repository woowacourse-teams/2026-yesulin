"use client";

import { DialogFooter, ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";

export function EventRegistrationConfirmation({ open, message, busy, onClose, onConfirm }: {
  readonly open: boolean;
  readonly message: string;
  readonly busy: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}) {
  return (
    <ModalShell open={open} onClose={() => { if (!busy) onClose(); }} labelledBy="event-confirmation-title"
      className="public-theme flex max-h-[calc(100dvh-40px)] w-[min(520px,calc(100vw-32px))] flex-col overflow-hidden rounded-modal border border-border bg-card shadow-[var(--shadow-modal)]">
      <header className="border-b border-border-soft px-5 py-5 sm:px-6">
        <h2 id="event-confirmation-title" className="text-xl font-bold">신청 전 확인해 주세요</h2>
        <p className="mt-2 text-sm text-muted-strong">안내를 확인한 뒤 신청을 완료해 주세요.</p>
      </header>
      <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-6">
        <p className="whitespace-pre-wrap break-words text-sm leading-7">{message}</p>
      </div>
      <DialogFooter>
        <SecondaryButton disabled={busy} onClick={onClose}>돌아가기</SecondaryButton>
        <PrimaryButton disabled={busy} onClick={onConfirm}>{busy ? "보내는 중…" : "확인하고 신청하기"}</PrimaryButton>
      </DialogFooter>
    </ModalShell>
  );
}
