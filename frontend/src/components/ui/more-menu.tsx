"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { PiDotsThree } from "react-icons/pi";

/** 버튼 항목은 `onSelect`, 이동 항목은 `href`를 쓴다. `external`이면 새 창으로 연다. */
export type MoreMenuItem = { readonly label: string; readonly disabled?: boolean }
  & ({ readonly onSelect: () => void } | { readonly href: string; readonly external?: boolean });

const ITEM_CLASS = "flex min-h-11 w-full items-center px-4 text-left text-sm font-semibold text-foreground hover:bg-surface disabled:text-muted-soft";

/**
 * 자주 쓰지 않는 작업을 모아 두는 메뉴. 바깥을 누르거나 Esc로 닫고, Esc는 메뉴 버튼으로 초점을 돌린다. Tab으로 메뉴 밖에 나가도
 * 닫는다. Safari는 마우스로 누른 버튼에 초점을 주지 않으므로 초점이 사라졌다는 것만으로는 닫지 않는다.
 */
export function MoreMenu({ label, items }: { readonly label: string; readonly items: readonly MoreMenuItem[] }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      if (rootRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onBlur={(event) => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-11 items-center justify-center rounded-control border border-border bg-card text-muted-strong hover:border-brand-line hover:text-brand"
      >
        <PiDotsThree aria-hidden="true" size={24} />
      </button>
      {open ? (
        <ul id={id} role="menu" aria-label={label} className="absolute right-0 top-12 z-40 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-control border border-border bg-card py-1 shadow-[var(--shadow-2)]">
          {items.map((item) => (
            <li key={item.label} role="none">
              {"href" in item ? (
                item.external ? (
                  <a role="menuitem" href={item.href} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} className={ITEM_CLASS}>
                    {item.label}<span className="sr-only"> (새 창)</span>
                  </a>
                ) : (
                  <Link role="menuitem" href={item.href} onClick={() => setOpen(false)} className={ITEM_CLASS}>{item.label}</Link>
                )
              ) : (
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={ITEM_CLASS}
                >
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
