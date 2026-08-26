"use client";

import { useState } from "react";
import type { AuditionRoundInput, PerformanceRoleTemplate, PostingRoleInput } from "@/features/auditions/creation-types";
import { ROLE_GENDER_LABELS } from "@/features/auditions/labels";
import type { RoleGender } from "@/features/auditions/types";
import { CreateField } from "./create-form";
import { FieldInput, FieldSelect } from "@/components/ui/controls";
import { CalendarDateRangeField } from "./calendar-date-range-field";

export type SelectedPostingRoles = Readonly<Record<string, PostingRoleInput>>;

/**
 * 입력 중에는 빈 문자열을 그대로 두어 앞자리 0을 지울 수 있게 한다.
 * 숫자로 읽히는 동안만 값을 올려보내고, 포커스를 잃으면 마지막 유효 값으로 되돌린다.
 */
function NumberField({ label, value, min, max, onChange }: {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max?: number;
  readonly onChange: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return <CreateField label={label}>
    <FieldInput
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft ?? String(value)}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        if (next.trim() !== "" && Number.isFinite(Number(next))) onChange(Number(next));
      }}
      onBlur={() => setDraft(null)}
    />
  </CreateField>;
}

export function PostingRoleSelector({ roles, selected, onChange }: {
  readonly roles: readonly PerformanceRoleTemplate[];
  readonly selected: SelectedPostingRoles;
  readonly onChange: (selected: SelectedPostingRoles) => void;
}) {
  const patch = (id: string, update: Partial<PostingRoleInput>) => onChange({ ...selected, [id]: { ...selected[id]!, ...update } });
  return <div className="grid gap-2.5">
    {roles.map((role) => {
      const value = selected[role.id];
      return <div key={role.id} className={`rounded-card border p-4 ${value ? "border-brand-line bg-brand-soft" : "border-border bg-card"}`}>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={Boolean(value)} onChange={(event) => {
            const next = { ...selected };
            if (event.target.checked) next[role.id] = { templateId: role.id, quota: 1, gender: "ANY", ageMin: 0, ageMax: 100 };
            else delete next[role.id];
            onChange(next);
          }} className="mt-0.5 h-5 w-5 shrink-0 accent-brand" />
          <span><strong className="block text-base">{role.name}</strong><span className="mt-1 block text-sm text-muted">{role.description}</span></span>
        </label>
        {value ? <div className="mt-4 grid gap-3 border-t border-brand-line/30 pt-4 sm:grid-cols-3">
          <NumberField label="모집 인원" min={1} value={value.quota} onChange={(quota) => patch(role.id, { quota })} />
          <CreateField label="성별 조건"><FieldSelect value={value.gender} onChange={(event) => patch(role.id, { gender: event.target.value as RoleGender })}>{(["ANY", "FEMALE", "MALE"] as const).map((gender) => <option key={gender} value={gender}>{ROLE_GENDER_LABELS[gender]}</option>)}</FieldSelect></CreateField>
          <div className="grid grid-cols-2 gap-2"><NumberField label="최소 나이" min={0} value={value.ageMin} onChange={(ageMin) => patch(role.id, { ageMin })} /><NumberField label="최대 나이" min={value.ageMin} value={value.ageMax} onChange={(ageMax) => patch(role.id, { ageMax })} /></div>
        </div> : null}
      </div>;
    })}
  </div>;
}

export function AuditionScheduleEditor({
  rounds,
  onChange,
  allowCountChange = true,
  lockedRounds = [],
  dateErrors = [],
  minimumDates = [],
  maximumDate,
}: {
  readonly rounds: readonly AuditionRoundInput[];
  readonly onChange: (rounds: readonly AuditionRoundInput[]) => void;
  readonly allowCountChange?: boolean;
  readonly lockedRounds?: readonly number[];
  readonly dateErrors?: readonly (string | undefined)[];
  readonly minimumDates?: readonly (string | undefined)[];
  readonly maximumDate?: string;
}) {
  const patch = (round: AuditionRoundInput["round"], update: Partial<AuditionRoundInput>) => onChange(rounds.map((item) => item.round === round ? { ...item, ...update } : item));
  const addRound = () => {
    if (rounds.length >= 5) return;
    const round = (rounds.length + 1) as AuditionRoundInput["round"];
    onChange([...rounds, { round, name: `${round}차 전형`, date: "", note: "" }]);
  };
  const removable = rounds.length > 1 && !lockedRounds.includes(rounds.at(-1)!.round);
  return <div className="space-y-2.5">
    {rounds.map((round, index) => {
      const locked = lockedRounds.includes(round.round);
      return <div key={round.round} className="grid items-end gap-3 rounded-card border border-border bg-surface p-4 md:grid-cols-[180px_170px_1fr]">
        <CreateField label={`${round.round}차 전형 이름`}><FieldInput required disabled={locked} value={round.name} onChange={(event) => patch(round.round, { name: event.target.value })} placeholder="예: 서류 심사" /></CreateField>
        <div>{locked ? <CreateField label="전형 일정"><FieldInput required disabled type="date" value={round.date} /></CreateField> : <div className="block min-w-0"><span className="mb-2 block text-base font-semibold text-muted-strong md:text-sm">전형 일정</span><CalendarDateRangeField single variant="compact" start={round.date} end="" minDate={minimumDates[index]} maxDate={maximumDate} startError={dateErrors[index]} onStartChange={(date) => patch(round.round, { date })} onEndChange={() => undefined} startLabel="전형 일정" /></div>}</div>
        <CreateField label="안내 사항"><FieldInput disabled={locked} value={round.note} onChange={(event) => patch(round.round, { note: event.target.value })} placeholder="예: 장소와 준비물을 안내해 주세요." /></CreateField>
      </div>;
    })}
    {allowCountChange ? <div className="grid grid-cols-2 gap-2">
      <button type="button" disabled={rounds.length >= 5} onClick={addRound} className="min-h-11 rounded-control border border-dashed border-muted-soft bg-card px-3 py-2.5 text-sm font-semibold text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand disabled:cursor-not-allowed disabled:border-border disabled:bg-border-soft disabled:text-muted">전형 추가 ({rounds.length}/5)</button>
      <button type="button" disabled={!removable} title={!removable ? rounds.length === 1 ? "1차 전형은 기본 전형이라 삭제할 수 없습니다." : "완료된 전형은 삭제할 수 없습니다." : undefined} onClick={() => onChange(rounds.slice(0, -1))} className="min-h-11 rounded-control border border-border bg-card px-3 text-sm font-semibold text-muted-strong hover:border-fail/30 hover:bg-fail-bg hover:text-fail disabled:cursor-not-allowed disabled:bg-border-soft disabled:text-muted">이전 전형 삭제</button>
    </div> : null}
  </div>;
}
