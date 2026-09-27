"use client";

import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { DestructiveButton, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { useModalClose } from "../use-modal-close";

const TITLE_ID = "show-confirm-dialog-title";

/** 되돌리기 어려운 관리 작업(예매 취소, 공연·회차 삭제, 예매 마감)을 한 번 더 확인한다. */
export function ConfirmDialog({ title, description, confirmLabel, destructive = false, busy, onConfirm, onClose }: {
  readonly title: string;
  readonly description: React.ReactNode;
  readonly confirmLabel: string;
  readonly destructive?: boolean;
  readonly busy: boolean;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}) {
  const ConfirmButton = destructive ? DestructiveButton : PrimaryButton;
  const close = useModalClose(onClose, busy);
  return (
    <ModalShell
      open
      onClose={close}
      labelledBy={TITLE_ID}
      placement="responsiveSheet"
      className="w-full overflow-hidden rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] md:w-[min(480px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader id={TITLE_ID} title={title} />
      <div className="px-5 py-6 text-base leading-7 text-muted-strong md:px-6 md:text-sm md:leading-6">{description}</div>
      <DialogFooter>
        <SecondaryButton data-autofocus="true" onClick={close} disabled={busy}>닫기</SecondaryButton>
        <ConfirmButton onClick={onConfirm} disabled={busy} aria-busy={busy || undefined}>
          {busy ? "처리 중…" : confirmLabel}
        </ConfirmButton>
      </DialogFooter>
    </ModalShell>
  );
}
