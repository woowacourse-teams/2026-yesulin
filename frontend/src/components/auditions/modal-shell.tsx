"use client";

import { useEffect, useRef } from "react";

/** 겹쳐 뜨는 레이어의 쌓임 순서. 클래스로 흩어 두면 어느 쪽이 위인지 읽히지 않는다. */
export const MODAL_LAYERS = {
  dialog: { scrim: 50, panel: 60 },
  video: { scrim: 85, panel: 86 },
} as const;

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const PLACEMENT_CLASS = {
  center: "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
  left: "bottom-0 left-0 top-0",
  responsiveSheet:
    "inset-x-0 bottom-0 top-auto md:bottom-auto md:left-1/2 md:right-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
} as const;

/** Escape로 닫고, 배경을 눌러도 닫히는 공용 다이얼로그 껍데기. */
export function ModalShell({
  open,
  onClose,
  labelledBy,
  layer = MODAL_LAYERS.dialog,
  placement = "center",
  scrimClassName = "bg-foreground/55",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  layer?: { readonly scrim: number; readonly panel: number };
  placement?: keyof typeof PLACEMENT_CLASS;
  scrimClassName?: string;
  className: string;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const isTopModal = () => {
      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
      return dialogs.item(dialogs.length - 1) === panel;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopModal()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
        (element) =>
          !element.hidden &&
          element.getClientRects().length > 0 &&
          element.getAttribute("aria-hidden") !== "true",
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    const focusFrame = requestAnimationFrame(() => {
      if (!panel.contains(document.activeElement)) {
        const autofocusTarget = window.matchMedia("(min-width: 768px)").matches
          ? panel.querySelector<HTMLElement>("[data-autofocus='true']")
          : null;
        const firstFocusable = panel.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        (autofocusTarget ?? (window.innerWidth >= 768 ? firstFocusable : null) ?? panel).focus();
      }
    });

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previouslyFocused?.isConnected) previouslyFocused.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="닫기"
        tabIndex={-1}
        onClick={onClose}
        style={{ zIndex: layer.scrim }}
        className={`fixed inset-0 cursor-default ${scrimClassName}`}
      />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        style={{ zIndex: layer.panel }}
        className={`fixed overscroll-contain focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand ${PLACEMENT_CLASS[placement]} ${className}`}
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
    <header className="glass-surface z-2 border-b border-border px-5 pb-4 pt-5 md:px-6">
      <h2 id={id} className="text-xl font-bold tracking-[-0.02em]">
        {title}
      </h2>
      {subtitle ? <p className="mt-1 text-base leading-relaxed text-muted-strong md:text-sm">{subtitle}</p> : null}
    </header>
  );
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return (
    <footer className="glass-surface z-2 flex justify-end gap-2 border-t border-border px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:px-6">
      {children}
    </footer>
  );
}
