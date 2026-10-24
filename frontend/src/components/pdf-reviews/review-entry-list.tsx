"use client";

import { FilterChip } from "@/components/ui/controls";
import {
  decisionLabels, matchesFilter, matchStatusLabels, sameKey,
  type EntryFilter, type ReviewDetail, type ReviewEntry, type ReviewKey,
} from "@/features/pdf-reviews/types";

type Props = {
  readonly review: ReviewDetail;
  readonly filter: EntryFilter;
  readonly selectedEntryId: ReviewKey | null;
  readonly onFilter: (filter: EntryFilter) => void;
  readonly onSelect: (entry: ReviewEntry) => void;
};

const sameFilter = (a: EntryFilter, b: EntryFilter) =>
  typeof a === "object" && typeof b === "object" ? sameKey(a.roleId, b.roleId) : a === b;

export function ReviewEntryList({ review, filter, selectedEntryId, onFilter, onSelect }: Props) {
  const roleName = (id: ReviewKey | null) => review.roles.find(role => sameKey(role.id, id))?.name;
  const chips: { readonly key: string; readonly value: EntryFilter; readonly label: string }[] = [
    { key: "all", value: "ALL", label: "전체" },
    ...review.roles.map(role => ({ key: `role-${role.id}`, value: { roleId: role.id } as EntryFilter, label: role.name })),
    { key: "check", value: "NEEDS_CHECK", label: "배역 확인 필요" },
    { key: "waiting", value: "WAITING", label: "내용 정리 중" },
  ];
  const visible = review.entries.filter(entry => matchesFilter(entry, filter));
  return <section aria-label="지원 항목" className="min-w-0 rounded-card border border-border bg-card p-4">
    <h2 className="mb-1 px-1 text-sm font-bold">지원 항목 <span className="num font-normal text-muted-strong">{review.entries.length}개</span></h2>
    <p className="mb-3 px-1 text-xs leading-5 text-muted-strong">지원서에 적힌 지원 배역이 분명한 것만 배역별로 나뉘고, 나머지는 ‘배역 확인 필요’에 남습니다. 합격·불합격은 담당자가 직접 정합니다.</p>
    <div role="group" aria-label="배역별 보기" className="mb-3 flex flex-wrap gap-2">
      {chips.map(chip => {
        const count = review.entries.filter(entry => matchesFilter(entry, chip.value)).length;
        return <FilterChip key={chip.key} pressed={sameFilter(filter, chip.value)} onClick={() => onFilter(chip.value)} className="max-w-full whitespace-normal! break-words text-left">
          {chip.label} <span className="num">{count}</span>
        </FilterChip>;
      })}
    </div>
    {!review.entries.length ? <p className="p-3 text-sm leading-7 text-muted-strong">아직 올린 지원서가 없습니다. 위에서 PDF를 선택해 올려 주세요.</p>
      : !visible.length ? <p role="status" className="p-3 text-sm leading-7 text-muted-strong">이 보기에 해당하는 지원 항목이 없습니다.</p>
        : <ul className="max-h-[640px] space-y-2 overflow-y-auto">
          {visible.map(entry => {
            const active = sameKey(entry.id, selectedEntryId);
            const role = entry.matchStatus === "MATCHED" ? roleName(entry.roleId) : undefined;
            return <li key={String(entry.id)}>
              <button type="button" aria-pressed={active} onClick={() => onSelect(entry)}
                className={`min-h-11 w-full min-w-0 rounded-control border p-3 text-left ${active ? "border-brand bg-brand-soft" : "border-border hover:border-brand-line"}`}>
                <span className="block break-words text-sm font-semibold">{entry.applicantName?.trim() || "이름 확인 필요"}</span>
                <span className="mt-1 block break-all text-xs text-muted-strong">{entry.originalFilename}</span>
                <span className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-surface px-2.5 py-1 font-semibold text-muted-strong">{role ?? matchStatusLabels[entry.matchStatus]}</span>
                  <span className="rounded-full bg-surface px-2.5 py-1 font-semibold text-muted-strong">{decisionLabels[entry.decision]}</span>
                </span>
              </button>
            </li>;
          })}
        </ul>}
  </section>;
}
