"use client";

import { useId } from "react";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { useModalClose } from "@/components/shows/use-modal-close";

/** 보드의 작은 작업 창. 모바일은 아래에서 올라오고 데스크톱은 가운데에 뜬다. */
export function SheetDialog({ title, subtitle, busy = false, footer, onClose, children }: {
  readonly title: string;
  readonly subtitle?: string;
  readonly busy?: boolean;
  readonly footer?: React.ReactNode;
  readonly onClose: () => void;
  readonly children: React.ReactNode;
}) {
  const id = useId();
  const close = useModalClose(onClose, busy);
  return (
    <ModalShell
      open
      onClose={close}
      labelledBy={id}
      placement="responsiveSheet"
      className="flex max-h-[88dvh] w-full flex-col overflow-hidden break-keep rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] wrap-break-word md:w-[min(480px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader id={id} title={title} subtitle={subtitle} />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6">{children}</div>
      {footer ? <DialogFooter>{footer}</DialogFooter> : null}
    </ModalShell>
  );
}
