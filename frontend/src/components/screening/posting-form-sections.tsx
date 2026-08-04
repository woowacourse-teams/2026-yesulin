import type {
  PerformanceRoleTemplate,
  ScreeningRoundInput,
} from "@/features/screening/creation-types";
import { ROLE_GENDER_LABELS } from "@/features/screening/labels";
import { CreateField, createInputClass } from "./create-form";

export function PostingRoleSelector({
  roles,
  selected,
  onChange,
}: {
  roles: readonly PerformanceRoleTemplate[];
  selected: Readonly<Record<string, number>>;
  onChange: (selected: Readonly<Record<string, number>>) => void;
}) {
  return (
    <div className="grid gap-2.5 md:grid-cols-2">
      {roles.map((role) => {
        const checked = selected[role.id] !== undefined;
        return (
          <label
            key={role.id}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors ${
              checked ? "border-brand-line bg-brand-soft" : "border-border bg-card hover:border-muted-soft"
            }`}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                const next = { ...selected };
                if (event.target.checked) next[role.id] = 1;
                else delete next[role.id];
                onChange(next);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">{role.name}</span>
              <span className="mt-0.5 block text-[11.5px] text-muted">
                {ROLE_GENDER_LABELS[role.gender]} · 만 {role.ageMin}~{role.ageMax}세 · {role.description}
              </span>
              {checked ? (
                <span className="mt-2 flex items-center gap-2 text-[11.5px] text-muted-strong">
                  모집 인원
                  <input
                    type="number"
                    aria-label={`${role.name} 모집 인원`}
                    min={1}
                    value={selected[role.id] ?? 1}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => onChange({ ...selected, [role.id]: Number(event.target.value) })}
                    className="num w-16 rounded-control border border-border bg-card px-2 py-1 text-right"
                  />
                  명
                </span>
              ) : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export function ScreeningScheduleEditor({
  rounds,
  onChange,
}: {
  rounds: readonly ScreeningRoundInput[];
  onChange: (rounds: readonly ScreeningRoundInput[]) => void;
}) {
  const patch = (round: ScreeningRoundInput["round"], update: Partial<ScreeningRoundInput>) =>
    onChange(rounds.map((item) => (item.round === round ? { ...item, ...update } : item)));

  const addRound = () => {
    if (rounds.length >= 3) return;
    const round = (rounds.length + 1) as ScreeningRoundInput["round"];
    onChange([...rounds, { round, name: `${round}차 전형`, date: "", note: "" }]);
  };

  const removeLastRound = () => onChange(rounds.slice(0, -1));

  return (
    <div className="space-y-2.5">
      {rounds.map((round) => (
        <div key={round.round} className="grid items-end gap-2.5 rounded-lg border border-border bg-surface p-3 md:grid-cols-[180px_170px_1fr_auto]">
          <CreateField label={`${round.round}차 전형 이름`}>
            <input
              required
              value={round.name}
              onChange={(event) => patch(round.round, { name: event.target.value })}
              placeholder={round.round === 1 ? "예: 서류 심사" : "예: 대면 오디션"}
              className={createInputClass}
            />
          </CreateField>
          <CreateField label="진행일">
            <input
              required
              type="date"
              name={`round-${round.round}-date`}
              value={round.date}
              onChange={(event) => patch(round.round, { date: event.target.value })}
              className={createInputClass}
            />
          </CreateField>
          <CreateField label="안내 메모">
            <input
              value={round.note}
              onChange={(event) => patch(round.round, { note: event.target.value })}
              placeholder={round.round === 1 ? "예: 온라인 서류 심사" : "예: 연습실 A, 자유 연기 2분"}
              className={createInputClass}
            />
          </CreateField>
          {round.round > 2 && round.round === rounds.at(-1)?.round ? (
            <button
              type="button"
              onClick={removeLastRound}
              className="h-[38px] rounded-control border border-border bg-card px-3 text-[12px] text-muted-strong hover:border-muted-soft hover:text-foreground"
            >
              삭제
            </button>
          ) : <span className="hidden md:block" />}
        </div>
      ))}
      {rounds.length < 3 ? (
        <button
          type="button"
          onClick={addRound}
          className="w-full rounded-control border border-dashed border-muted-soft bg-card px-3 py-2.5 text-[12.5px] font-semibold text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand"
        >
          전형 추가
        </button>
      ) : null}
    </div>
  );
}
