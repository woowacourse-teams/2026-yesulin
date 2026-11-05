"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReviewKey, ReviewRole } from "@/features/pdf-reviews/types";

/** 배역 변경은 선택 즉시 저장한다. 표시 값은 서버 저장 성공 뒤 부모가 갱신한다. */
export function ReviewRoleSelect({ roles, value, disabled, label = "심사 배역", allowReselect = false, onChange }: {
  readonly roles: readonly ReviewRole[];
  readonly value: ReviewKey | null;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly allowReselect?: boolean;
  readonly onChange: (roleId: string | null) => void;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const options = [{ id: "", name: "미기재" }, ...roles.map(role => ({ id: String(role.id), name: role.name }))];
  const current = String(value ?? "");
  const [active, setActive] = useState(0);
  const expanded = open && !disabled;
  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [expanded]);
  useEffect(() => {
    if (expanded) root.current?.querySelector(`[id="${id}-${active}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [expanded, active, id]);
  function choose(index: number) {
    setOpen(false); trigger.current?.focus();
    if (allowReselect || options[index].id !== current) onChange(options[index].id || null);
  }
  return <div ref={root} className="relative min-w-40 text-sm" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <span id={`${id}-label`} className="mb-2 block font-semibold text-muted-strong">{label}</span>
    <button ref={trigger} type="button" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="listbox" aria-controls={id} aria-expanded={expanded}
      aria-activedescendant={expanded ? `${id}-${active}` : undefined} disabled={disabled}
      className="flex min-h-11 w-full items-center justify-between gap-3 rounded-control border border-border bg-card px-3 py-2 text-left font-semibold shadow-sm hover:border-brand-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50"
      onClick={() => { setActive(Math.max(0, options.findIndex(option => option.id === current))); setOpen(!expanded); }}
      onKeyDown={event => {
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
          event.preventDefault(); setOpen(true);
          setActive(index => !expanded ? Math.max(0, options.findIndex(option => option.id === current)) : event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : Math.max(0, Math.min(options.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))));
        } else if (event.key === "Escape" && expanded) { event.preventDefault(); setOpen(false); }
        else if ((event.key === "Enter" || event.key === " ") && expanded) { event.preventDefault(); choose(active); }
      }}>
      <span id={`${id}-value`} className="truncate">{options.find(option => option.id === current)?.name ?? "미기재"}</span>
      <span aria-hidden="true" className={`text-muted transition-transform ${expanded ? "rotate-180" : ""}`}>⌄</span>
    </button>
    {expanded && <div id={id} role="listbox" aria-labelledby={`${id}-label`} className="absolute inset-x-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-control border border-border bg-card p-1 shadow-[var(--shadow-modal)]">
      {options.map((option, index) => <div key={option.id} id={`${id}-${index}`} role="option" aria-selected={option.id === current}
        className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 ${active === index ? "bg-brand-soft text-brand" : "text-foreground hover:bg-surface"}`}
        onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(index)}>
        <span className="break-all">{option.name}</span>{option.id === current && <span aria-hidden="true">✓</span>}
      </div>)}
    </div>}
  </div>;
}
