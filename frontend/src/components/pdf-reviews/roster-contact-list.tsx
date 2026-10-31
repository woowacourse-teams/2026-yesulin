"use client";

import { useEffect, useRef } from "react";
import { FieldInput, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import type { RosterActor, RosterContact } from "@/features/pdf-reviews/timetables";
import { slotLabel } from "@/features/pdf-reviews/roster-schedule";

export function RosterContactList({ actors, editing, edited, disabled, onEdit, onChange, onSave, onCancel, onRemove }: {
  actors: RosterActor[]; editing: RosterActor | null; edited: RosterContact | null; disabled: boolean;
  onEdit: (actor: RosterActor) => boolean; onChange: (value: RosterContact) => void;
  onSave: () => void; onCancel: () => void; onRemove: (actor: RosterActor) => void;
}) {
  const returnFocus = useRef<number | null>(editing?.id ?? null);
  const list = useRef<HTMLElement>(null);
  useEffect(() => {
    if (editing) {
      returnFocus.current = editing.id;
    } else if (returnFocus.current !== null) {
      list.current?.querySelector<HTMLButtonElement>(`[data-contact-edit-id="${returnFocus.current}"]`)?.focus({ preventScroll: true });
      returnFocus.current = null;
    }
  }, [editing]);
  return <section ref={list} aria-label="일정 연락처 관리" className="space-y-3">
    <h4 className="sr-only">연락처 관리</h4>
    <ul className="divide-y divide-border rounded-control border border-border">{actors.map(actor => <li key={actor.id}
      className="scroll-mb-48 p-4" aria-label={`${actor.name} 연락처`}>
      <div className="grid gap-4 lg:grid-cols-[minmax(120px,1fr)_minmax(0,2fr)_auto] lg:items-center">
        <div className="min-w-0"><p className="break-words font-semibold">{actor.name}</p><p className="mt-1 text-sm text-muted-strong">{actor.roleName}</p>
          <p className="mt-1 text-sm num">{slotLabel(actor.slot)}</p>
          {actor.sourceDecision !== "PASS" && <p className="text-sm text-warn">서류 판정 변경 · 확인 필요</p>}</div>
        <dl className="grid min-w-0 gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-strong">전화번호</dt><dd className="mt-1 num">{actor.phone || "미입력"}</dd></div>
          <div className="min-w-0"><dt className="text-muted-strong">이메일</dt><dd className="mt-1 break-all">{actor.email || "미입력"}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-2"><SecondaryButton disabled={disabled} aria-expanded={editing?.id === actor.id}
          data-contact-edit-id={actor.id}
          aria-controls={editing?.id === actor.id ? `contact-editor-${actor.id}` : undefined}
          onClick={() => onEdit(actor)}>연락처 수정</SecondaryButton>
          <TextButton disabled={disabled} onClick={() => onRemove(actor)}>명단에서 제외</TextButton></div>
      </div>
      {editing?.id === actor.id && edited && <InlineContactEditor key={actor.id} actor={editing} value={edited}
        disabled={disabled} onChange={onChange} onSave={onSave} onCancel={onCancel} />}
    </li>)}</ul>
  </section>;
}

function InlineContactEditor({ actor, value, disabled, onChange, onSave, onCancel }: {
  actor: RosterActor; value: RosterContact; disabled: boolean; onChange: (value: RosterContact) => void;
  onSave: () => void; onCancel: () => void;
}) {
  const section = useRef<HTMLDivElement>(null);
  useEffect(() => {
    section.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
    section.current?.scrollIntoView?.({ block: "nearest" });
  }, []);
  return <div ref={section} id={`contact-editor-${actor.id}`} className="mt-4 space-y-3 scroll-mb-48 rounded-control border border-brand-line bg-brand-soft p-4">
    <h5 className="font-semibold">{actor.name} 연락처 수정</h5>
    <div className="grid gap-3 md:grid-cols-3">{([
      ["name", "이름", "text"], ["phone", "전화번호 (선택)", "tel"], ["email", "이메일 (선택)", "email"],
    ] as const).map(([key, label, type]) => <label key={key} className="min-w-0 text-sm font-medium" htmlFor={`edit-${key}`}>{label}
      <FieldInput id={`edit-${key}`} type={type} value={value[key]} disabled={disabled}
        className="mt-1 w-full" autoComplete="off" onChange={event => onChange({ ...value, [key]: event.target.value })} />
    </label>)}</div>
    <div className="flex flex-wrap gap-2"><PrimaryButton disabled={disabled} onClick={onSave}>연락처 저장</PrimaryButton>
      <SecondaryButton disabled={disabled} onClick={onCancel}>수정 취소</SecondaryButton></div>
  </div>;
}
