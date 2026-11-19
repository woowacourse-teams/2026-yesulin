"use client";

import { createPortal } from "react-dom";
import type { EntryFilter } from "@/features/pdf-reviews/types";

export type RoleChip = { readonly key: string; readonly value: EntryFilter; readonly label: string; readonly count: number };

type Props = {
  readonly slot: HTMLElement;
  readonly title: string;
  readonly chips: readonly RoleChip[];
  readonly selected: string;
  readonly onSelect: (value: EntryFilter) => void;
};

const itemClass = "flex min-h-10 w-full items-center justify-between gap-2 rounded-control py-1.5 pl-3 pr-2 text-left text-sm text-sidebar-muted hover:bg-sidebar-hover hover:text-white aria-pressed:bg-sidebar-hover aria-pressed:font-semibold aria-pressed:text-white";

export function ReviewSidebarRoles({ slot, title, chips, selected, onSelect }: Props) {
  return createPortal(<div className="ml-3 border-l border-sidebar-line pl-2">
    <p className="px-2 py-2 text-sm font-semibold text-white wrap-anywhere">{title}</p>
    {chips.length > 0 && <nav aria-label="배역별 지원자" className="space-y-0.5 pb-1">
      {chips.map(chip => <button key={chip.key} type="button" aria-pressed={selected === chip.key} onClick={() => onSelect(chip.value)} className={itemClass}>
        <span className="min-w-0 wrap-anywhere">{chip.label}</span><span className="num shrink-0 text-xs">{chip.count}</span>
      </button>)}
    </nav>}
  </div>, slot);
}
