"use client";

import {
  emptyNumeric,
  NUMERIC_FIELDS,
  NUMERIC_FIELD_META,
  type NumericField,
} from "@/features/auditions/filters";
import type { Gender } from "@/features/auditions/types";
import { FilterChip, PrimaryButton, TextButton } from "@/components/ui/controls";
import { useBoard } from "./board-context";
import { ModalShell } from "./modal-shell";

const TITLE_ID = "audition-detail-filter-title";

export function AuditionFilterSheet({ open, activeCount, onClose }: { open: boolean; activeCount: number; onClose: () => void }) {
  const { board, filters, setFilters, visible } = useBoard();
  const mismatches = board.applicants.filter((applicant) => applicant.mismatchReasons.length > 0).length;
  const clear = () => {
    setFilters((current) => ({ ...current, genders: new Set(), numeric: emptyNumeric(), mismatchOnly: false }));
    window.requestAnimationFrame(() => document.getElementById("audition-filter-close")?.focus());
  };

  const toggleGender = (gender: Gender) => setFilters((current) => {
    const genders = new Set(current.genders);
    if (genders.has(gender)) genders.delete(gender);
    else genders.add(gender);
    return { ...current, genders };
  });

  return <ModalShell open={open} onClose={onClose} labelledBy={TITLE_ID} placement="responsiveSheet" className="flex max-h-[min(88dvh,720px)] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:w-[min(560px,94vw)] md:rounded-modal">
    <header className="flex shrink-0 items-start gap-4 border-b border-border px-5 pb-4 pt-5 md:px-6">
      <div><p className="text-sm font-semibold text-brand">배우 상세 조건</p><h2 id={TITLE_ID} className="mt-1 text-xl font-bold">필터</h2><p className="mt-1 text-sm text-muted">조건을 바꾸면 목록에 바로 반영됩니다.</p></div>
      <button id="audition-filter-close" type="button" onClick={onClose} aria-label="필터 닫기" className="ml-auto grid min-h-11 min-w-11 place-items-center rounded-control text-xl text-muted-strong hover:bg-surface">×</button>
    </header>

    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
      <fieldset><legend className="text-sm font-bold">성별</legend><div className="mt-3 flex flex-wrap gap-2">{(["FEMALE", "MALE"] as const).map((gender) => <FilterChip key={gender} pressed={filters.genders.has(gender)} onClick={() => toggleGender(gender)}>{gender === "FEMALE" ? "여성" : "남성"}</FilterChip>)}</div></fieldset>
      <div className="mt-6 space-y-3"><h3 className="text-sm font-bold">신체 조건</h3>{NUMERIC_FIELDS.map((field) => <SheetNumericFilter key={field} field={field} />)}</div>
      <label className="mt-6 flex min-h-14 cursor-pointer items-center gap-3 rounded-card border border-warn/25 bg-warn-bg px-4 py-3"><input type="checkbox" checked={filters.mismatchOnly} onChange={(event) => setFilters((current) => ({ ...current, mismatchOnly: event.target.checked }))} className="h-5 w-5 shrink-0 accent-warn" /><span className="min-w-0"><strong className="block text-sm text-warn">조건 불일치만 보기</strong><span className="mt-0.5 block text-xs leading-5 text-muted-strong">배역의 성별·나이 조건과 다른 배우 {mismatches}명</span></span></label>
    </div>

    <footer className="flex shrink-0 items-center gap-2 border-t border-border px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 md:px-6">
      {activeCount > 0 ? <TextButton onClick={clear} className="px-3 text-fail hover:bg-fail-bg hover:text-fail">모두 초기화</TextButton> : <span className="text-sm text-muted">적용된 필터 없음</span>}
      <PrimaryButton onClick={onClose} className="ml-auto min-w-32">{visible.length}명 보기</PrimaryButton>
    </footer>
  </ModalShell>;
}

function SheetNumericFilter({ field }: { field: NumericField }) {
  const { filters, setFilters } = useBoard();
  const meta = NUMERIC_FIELD_META[field];
  const condition = filters.numeric[field];
  const update = (next: (typeof filters)["numeric"][NumericField]) => setFilters((current) => ({ ...current, numeric: { ...current.numeric, [field]: next } }));

  return <div className={`rounded-card border p-4 ${condition ? "border-brand-line bg-brand-soft" : "border-border bg-surface"}`}>
    <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={Boolean(condition)} onChange={(event) => update(event.target.checked ? { op: "gte", value: meta.initial } : null)} className="h-5 w-5 accent-brand" /><strong className="text-sm">{meta.label}</strong>{condition ? <span className="ml-auto text-xs font-semibold text-brand">적용 중</span> : null}</label>
    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_84px] gap-2">
      <label className="sr-only" htmlFor={`sheet-filter-${field}`}>{meta.label} 기준값</label>
      <div className="relative"><input id={`sheet-filter-${field}`} type="number" disabled={!condition} value={condition?.value ?? meta.initial} onChange={(event) => update({ op: condition?.op ?? "gte", value: Number(event.target.value) })} className="num min-h-12 w-full rounded-control border border-border bg-card px-3 pr-10 text-right text-base disabled:bg-border-soft disabled:text-muted" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">{meta.unit}</span></div>
      <select aria-label={`${meta.label} 비교 방향`} disabled={!condition} value={condition?.op ?? "gte"} onChange={(event) => update({ value: condition?.value ?? meta.initial, op: event.target.value === "lte" ? "lte" : "gte" })} className="min-h-12 rounded-control border border-border bg-card px-3 text-sm disabled:bg-border-soft disabled:text-muted"><option value="gte">이상</option><option value="lte">이하</option></select>
    </div>
  </div>;
}
