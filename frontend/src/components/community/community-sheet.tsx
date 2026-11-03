"use client";

import { useEffect, useRef, type ReactNode } from "react";

type Props = { readonly open: boolean; readonly label: string; readonly onClose: () => void; readonly children: ReactNode };

export function CommunitySheet({ open, label, onClose, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return <dialog ref={ref} className="community-sheet" aria-label={label} onClose={onClose}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="community-sheet-panel"><span className="community-sheet-grab" aria-hidden="true" />{open && children}</div></dialog>;
}
