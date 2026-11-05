"use client";

import { useEffect, useState, type RefObject } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";

export function ReviewDocumentHeading({ title, filename, disabled, headingRef, onSave, onDirtyChange }: {
  readonly title: string; readonly filename: string; readonly disabled: boolean;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly onSave: (title: string) => Promise<boolean>;
  readonly onDirtyChange: (dirty: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(title);
  const dirty = editing && draft !== title;
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.trim() || disabled) return;
    if (await onSave(draft.trim())) setEditing(false);
  }
  function cancel() { setDraft(title); setEditing(false); }
  if (editing) return <form onSubmit={event => void submit(event)} className="min-w-0 flex-1" aria-label="지원서 제목 편집">
    <label htmlFor="review-document-title" className="mb-1 block text-xs font-semibold text-muted-strong">지원서 제목</label>
    <div className="flex flex-wrap items-center gap-2"><input id="review-document-title" autoFocus value={draft} maxLength={255} disabled={disabled} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === "Escape" && !disabled) { event.preventDefault(); cancel(); } }} className="min-h-11 min-w-0 flex-1 rounded-control border border-brand bg-card px-3 text-base font-semibold outline-none focus:ring-2 focus:ring-brand-soft" />
      <PrimaryButton type="submit" disabled={disabled || !draft.trim()}>제목 저장</PrimaryButton><SecondaryButton disabled={disabled} onClick={cancel}>취소</SecondaryButton></div>
    <p className="mt-1 text-xs text-muted">원본 파일명과 PDF 내용은 바뀌지 않습니다.</p>
  </form>;
  return <div className="min-w-0 flex-1"><div className="flex items-start gap-2"><h2 ref={headingRef} tabIndex={-1} className="min-w-0 break-all text-lg font-bold leading-7 outline-none">{title}</h2><button type="button" disabled={disabled} onClick={() => { setDraft(title); setEditing(true); }} aria-label="지원서 제목 수정" className="min-h-11 shrink-0 rounded-lg px-2 text-xs font-semibold text-muted-strong hover:bg-surface">수정 ✎</button></div><p className="mt-1 break-all text-xs text-muted">원본 파일 · {filename}</p></div>;
}
