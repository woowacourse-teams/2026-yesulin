"use client";

import { useEffect, useId, useRef, useState } from "react";

export type MoreMenuItem = {
  readonly label: string;
  readonly onSelect: () => void;
  readonly disabled?: boolean;
};

/** 자주 쓰지 않는 일정표 설정을 모아 두는 메뉴. 바깥을 누르거나 Esc로 닫는다. */
export function MoreMenu({ items }: { readonly items: readonly MoreMenuItem[] }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label="일정표 설정"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 items-center justify-center rounded-control border border-border bg-card text-lg font-bold text-muted-strong hover:border-brand-line hover:text-brand"
      >
        ⋯
      </button>
      {open ? (
        <ul id={id} role="menu" className="absolute right-0 top-12 z-40 w-48 overflow-hidden rounded-control border border-border bg-card py-1 shadow-[var(--shadow-2)]">
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className="flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground hover:bg-surface disabled:text-muted-soft"
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
