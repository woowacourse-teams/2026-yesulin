"use client";

import { useEffect } from "react";

/** 겹쳐 뜨는 레이어의 쌓임 순서. 클래스로 흩어 두면 어느 쪽이 위인지 읽히지 않는다. */
export const MODAL_LAYERS = {
  dialog: { scrim: 50, panel: 60 },
  video: { scrim: 85, panel: 86 },
} as const;

/** Escape로 닫고, 배경을 눌러도 닫히는 공용 다이얼로그 껍데기. */
export function ModalShell({
  open,
  onClose,
  labelledBy,
  layer = MODAL_LAYERS.dialog,
  scrimClassName = "bg-foreground/40",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  layer?: { readonly scrim: number; readonly panel: number };
  scrimClassName?: string;
  className: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        style={{ zIndex: layer.scrim }}
        className={`fixed inset-0 cursor-default ${scrimClassName}`}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        style={{ zIndex: layer.panel }}
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${className}`}
      >
        {children}
      </section>
    </>
  );
}

export function DialogHeader({
  id,
  title,
  subtitle,
}: {
  id: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="border-b border-border px-[22px] pb-[13px] pt-[17px]">
      <h2 id={id} className="text-[16.5px] font-bold tracking-[-0.02em]">
        {title}
      </h2>
      {subtitle ? <p className="mt-[3px] text-[12.5px] text-muted">{subtitle}</p> : null}
    </header>
  );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className="flex justify-end gap-2 border-t border-border px-[22px] py-3">{children}</footer>
  );
}

export const dialogButton =
  "rounded-control border border-border bg-card px-[15px] py-2 text-[13.5px] hover:bg-surface";

export const dialogPrimaryButton =
  "rounded-control border border-brand bg-brand px-[15px] py-2 text-[13.5px] text-white hover:bg-brand-strong";
