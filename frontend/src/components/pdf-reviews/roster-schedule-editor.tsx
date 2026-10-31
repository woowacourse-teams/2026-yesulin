"use client";

import styles from "./roster.module.css";
import type { ReactNode } from "react";
import { FieldInput, PrimaryButton, TextButton } from "@/components/ui/controls";
import type { RosterActor } from "@/features/pdf-reviews/timetables";
import { draftFor, emptySchedule, resetSlot, scheduleDirty, slotError, slotLabel, updateSlot, type ScheduleState } from "@/features/pdf-reviews/roster-schedule";

export function RosterScheduleEditor({ actors, value, onChange, disabled }: {
  actors: RosterActor[]; value: ScheduleState; onChange: (value: ScheduleState) => void;
  disabled: boolean;
}) {
  const batchError = slotError(value.batchDate, value.batchTime);
  function batch(clear: boolean) {
    let next = value;
    for (const actor of actors.filter(actor => value.selected.includes(actor.id))) {
      next = updateSlot(next, actor, clear ? "" : value.batchDate, clear ? "" : value.batchTime);
    }
    onChange({ ...next, batchDate: "", batchTime: "" });
  }
  return <section aria-label="날짜와 시간 배정" className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted-strong">변경 후 ‘배정 저장’을 눌러 주세요. 안내 메시지는 발송되지 않습니다.</p>
      <details className={styles.help}><summary>배정 방법</summary>
        <p>한국 시간 기준입니다. 같은 시간에 여러 명을 배정할 수 있고, 저장 후에도 바꾸거나 해제할 수 있어요. 이름만 등록한 사람도 배정할 수 있습니다.</p>
      </details>
    </div>
    <div className={styles.batch}>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="h-4 w-4 accent-brand" aria-label="배정 대상 전체 선택" disabled={disabled}
          checked={actors.length > 0 && value.selected.length === actors.length}
          onChange={event => onChange({ ...value, selected: event.target.checked ? actors.map(actor => actor.id) : [] })} />
        {value.selected.length}명 선택
      </label>
      <div className={styles.batchFields} hidden={!value.selected.length && !value.batchDate && !value.batchTime}>
      <label className="min-w-0 text-sm font-medium">일괄 날짜<FieldInput aria-label="일괄 날짜" type="date" min="1000-01-01" max="9999-12-31"
        className="mt-1 w-full" value={value.batchDate} disabled={disabled} onChange={event => onChange({ ...value, batchDate: event.target.value })} /></label>
      <label className="min-w-0 text-sm font-medium">일괄 시간<FieldInput aria-label="일괄 시간" type="time" step={60}
        className="mt-1 w-full" value={value.batchTime} disabled={disabled} onChange={event => onChange({ ...value, batchTime: event.target.value })} /></label>
      <PrimaryButton disabled={disabled || !value.selected.length || !value.batchDate || !!batchError} onClick={() => batch(false)}>선택한 사람에게 적용</PrimaryButton>
      <TextButton disabled={disabled || !value.selected.length} onClick={() => batch(true)}>선택한 배정 해제</TextButton>
      {batchError && <p role="alert" className="w-full text-sm text-fail">{batchError}</p>}
      </div>
      {!value.selected.length && !value.batchDate && !value.batchTime && <p className="text-sm text-muted-strong">사람을 선택하면 한 번에 배정할 수 있어요.</p>}
    </div>
    <div className={styles.columnHead} aria-hidden="true"><span>이름 · 배역</span><span>날짜</span><span>시간</span><span className="text-right">배정 관리</span></div>
    <ul className="divide-y divide-border">{actors.map(actor => {
      const draft = draftFor(value, actor);
      const error = slotError(draft.date, draft.time);
      const dirty = !!value.drafts[actor.id];
      return <li key={actor.id} className={`${styles.row} scroll-mb-48 ${dirty ? "bg-brand-soft" : ""}`}>
        <div className={styles.identity}><label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
          <input type="checkbox" className="h-4 w-4 shrink-0 accent-brand" aria-label={`${actor.name} 배정 대상 선택`} disabled={disabled}
            checked={value.selected.includes(actor.id)} onChange={event => onChange({ ...value,
              selected: event.target.checked ? [...value.selected, actor.id] : value.selected.filter(id => id !== actor.id) })} />
          <span className="break-words">{actor.name}</span></label>
          <div className="ml-7 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-strong">
            <span>{actor.roleName || "미기재"}</span>
            <span className={actor.slot ? styles.assigned : styles.unassigned}>{actor.slot ? "배정됨" : "미배정"}</span>
          </div>
          <p className="sr-only">저장된 시간: {slotLabel(actor.slot)}</p>
          {dirty && <p className="ml-7 mt-1 text-xs text-muted-strong num">저장된 시간: {slotLabel(actor.slot)}</p>}
          {actor.sourceDecision !== "PASS" && <p className="text-sm text-warn">서류 판정 변경 · 확인 필요</p>}
          {dirty && <span className="ml-7 mt-1 inline-block text-xs font-semibold text-brand">저장 전 변경</span>}
        </div>
        <label className="min-w-0 text-sm font-medium"><span className={styles.fieldLabel}>날짜</span><FieldInput aria-label={`${actor.name} 배정 날짜`} type="date" min="1000-01-01" max="9999-12-31"
          className="w-full num" value={draft.date} disabled={disabled} aria-invalid={!!error} aria-describedby={error ? `slot-error-${actor.id}` : undefined}
          onChange={event => onChange(updateSlot(value, actor, event.target.value, draft.time))} /></label>
        <label className="min-w-0 text-sm font-medium"><span className={styles.fieldLabel}>시간</span><FieldInput aria-label={`${actor.name} 배정 시간`} type="time" step={60}
          className="w-full num" value={draft.time} disabled={disabled} aria-invalid={!!error} aria-describedby={error ? `slot-error-${actor.id}` : undefined}
          onChange={event => onChange(updateSlot(value, actor, draft.date, event.target.value))} /></label>
        <div className={styles.rowActions}><TextButton disabled={disabled || (!draft.date && !draft.time)} onClick={() => onChange(updateSlot(value, actor, "", ""))}>배정 해제</TextButton>
          {dirty && <TextButton disabled={disabled} onClick={() => onChange(resetSlot(value, actor.id))}>저장값으로 되돌리기</TextButton>}</div>
        {error && <p id={`slot-error-${actor.id}`} role="alert" className="col-span-full text-sm text-fail">{error}</p>}
      </li>;
    })}</ul>
  </section>;
}

export function RosterScheduleActions({ value, onChange, onSave, disabled, feedback, context = false }: {
  value: ScheduleState; onChange: (value: ScheduleState) => void; onSave: () => void;
  disabled: boolean; feedback: ReactNode; context?: boolean;
}) {
  const changed = Object.keys(value.drafts).length;
  const invalid = Object.values(value.drafts).some(draft => !!slotError(draft.date, draft.time));
  return <div aria-label="배정 저장 도구" className={`sticky bottom-0 z-10 space-y-2 border-t bg-card px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] ${changed ? "border-brand-line shadow-[var(--shadow-1)]" : "border-border"}`}>
    {feedback}
    {context && <p className="text-xs font-semibold text-brand">날짜·시간 배정의 저장 전 변경</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p role="status" className="text-sm font-semibold">{changed ? `${changed}명의 배정이 변경되었습니다.` : "저장할 배정 변경이 없습니다."}</p>
        {(value.batchDate || value.batchTime) && <p className="mt-1 text-sm text-muted-strong">일괄 입력은 ‘선택한 사람에게 적용’을 눌러야 저장 대상에 포함됩니다.</p>}
        {invalid && <p className="mt-1 text-sm text-fail">날짜와 시간을 확인해 주세요. 입력이 덜 된 항목은 저장할 수 없습니다.</p>}</div>
      <div className={styles.saveButtons}><TextButton disabled={disabled || !scheduleDirty(value)}
        onClick={() => onChange({ ...emptySchedule(), selected: value.selected })}>배정 변경 전체 취소</TextButton>
        <PrimaryButton disabled={disabled || !changed || invalid} onClick={onSave}>{disabled ? "처리 중…" : `배정 저장${changed ? ` (${changed}명)` : ""}`}</PrimaryButton></div>
    </div>
  </div>;
}
