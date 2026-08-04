import type { RoleGender } from "@/features/screening/types";
import { ROLE_GENDER_LABELS } from "@/features/screening/labels";
import { CreateField, createInputClass } from "./create-form";

export type RoleDraft = {
  readonly key: number;
  readonly name: string;
  readonly description: string;
  readonly gender: RoleGender;
  readonly ageMin: number;
  readonly ageMax: number;
};

let roleKey = 0;

export const emptyRoleDraft = (): RoleDraft => ({
  key: ++roleKey,
  name: "",
  description: "",
  gender: "ANY",
  ageMin: 20,
  ageMax: 39,
});

export function PerformanceRoleEditor({
  roles,
  onChange,
}: {
  roles: readonly RoleDraft[];
  onChange: (roles: readonly RoleDraft[]) => void;
}) {
  const patchRole = (key: number, patch: Partial<RoleDraft>) =>
    onChange(roles.map((role) => (role.key === key ? { ...role, ...patch } : role)));

  return (
    <div className="space-y-3">
      {roles.map((role, index) => (
        <div key={role.key} className="rounded-lg border border-border bg-surface p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <b className="text-[12.5px]">배역 {index + 1}</b>
            {roles.length > 1 ? (
              <button
                type="button"
                aria-label={`배역 ${index + 1} 삭제`}
                onClick={() => onChange(roles.filter((candidate) => candidate.key !== role.key))}
                className="text-xs text-muted hover:text-fail"
              >
                삭제
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <CreateField label="배역 이름">
              <input
                required
                value={role.name}
                onChange={(event) => patchRole(role.key, { name: event.target.value })}
                placeholder="예: 서연, 앙상블"
                className={createInputClass}
              />
            </CreateField>
            <CreateField label="한 줄 설명">
              <input
                required
                value={role.description}
                onChange={(event) => patchRole(role.key, { description: event.target.value })}
                placeholder="예: 여 · 20대 초중반"
                className={createInputClass}
              />
            </CreateField>
            <CreateField label="성별 조건">
              <select
                value={role.gender}
                onChange={(event) => patchRole(role.key, { gender: event.target.value as RoleGender })}
                className={createInputClass}
              >
                {(["ANY", "FEMALE", "MALE"] as const).map((gender) => (
                  <option key={gender} value={gender}>{ROLE_GENDER_LABELS[gender]}</option>
                ))}
              </select>
            </CreateField>
            <div className="grid grid-cols-2 gap-2">
              <CreateField label="최소 나이">
                <input
                  required
                  type="number"
                  min={0}
                  value={role.ageMin}
                  onChange={(event) => patchRole(role.key, { ageMin: Number(event.target.value) })}
                  className={createInputClass}
                />
              </CreateField>
              <CreateField label="최대 나이">
                <input
                  required
                  type="number"
                  min={role.ageMin}
                  value={role.ageMax}
                  onChange={(event) => patchRole(role.key, { ageMax: Number(event.target.value) })}
                  className={createInputClass}
                />
              </CreateField>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...roles, emptyRoleDraft()])}
        className="w-full rounded-control border border-dashed border-muted-soft py-2.5 text-[12.5px] font-semibold text-muted-strong hover:border-brand-line hover:text-brand"
      >
        배역 추가
      </button>
    </div>
  );
}
