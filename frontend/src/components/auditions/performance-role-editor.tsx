import { CreateField } from "./create-form";
import { FieldInput } from "@/components/ui/controls";
import { PERFORMANCE_ROLE_DESCRIPTION_MAX_LENGTH, PERFORMANCE_ROLE_NAME_MAX_LENGTH } from "@/features/auditions/performance-validation";

export type RoleDraft = {
  readonly key: number;
  readonly id?: string;
  readonly name: string;
  readonly description: string;
};

let roleKey = 0;

export const emptyRoleDraft = (): RoleDraft => ({
  key: ++roleKey,
  name: "",
  description: "",
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
        <div key={role.key} className="rounded-card border border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <b className="text-base md:text-xs">배역 {index + 1}</b>
            {roles.length > 1 ? (
              <button
                type="button"
                aria-label={`배역 ${index + 1} 삭제`}
                onClick={() => onChange(roles.filter((candidate) => candidate.key !== role.key))}
                className="min-h-11 px-2 text-base text-muted hover:text-fail md:min-h-0 md:text-xs"
              >
                삭제
              </button>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <CreateField label="배역 이름">
              <FieldInput
                required
                maxLength={PERFORMANCE_ROLE_NAME_MAX_LENGTH}
                name={`role-${role.key}-name`}
                autoComplete="off"
                value={role.name}
                onChange={(event) => patchRole(role.key, { name: event.target.value })}
                placeholder="예: 서연, 앙상블"
              />
            </CreateField>
            <CreateField label="한 줄 설명">
              <FieldInput
                required
                maxLength={PERFORMANCE_ROLE_DESCRIPTION_MAX_LENGTH}
                name={`role-${role.key}-description`}
                autoComplete="off"
                value={role.description}
                onChange={(event) => patchRole(role.key, { description: event.target.value })}
                placeholder="예: 서사의 중심을 이끄는 주인공"
              />
            </CreateField>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...roles, emptyRoleDraft()])}
        className="min-h-11 w-full rounded-control border border-dashed border-muted-soft py-2.5 text-base font-semibold text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand md:text-sm"
      >
        배역 추가
      </button>
    </div>
  );
}

export function PerformanceRoleReadOnlyList({ roles }: {
  readonly roles: readonly Pick<RoleDraft, "id" | "name" | "description">[];
}) {
  return (
    <div className="space-y-3">
      {roles.map((role, index) => (
        <div key={role.id ?? `${role.name}-${index}`} className="rounded-card border border-border bg-surface p-4">
          <b className="mb-3 block text-base md:text-xs">배역 {index + 1}</b>
          <div className="grid gap-3 md:grid-cols-2">
            <CreateField label="배역 이름">
              <FieldInput readOnly value={role.name} />
            </CreateField>
            <CreateField label="한 줄 설명">
              <FieldInput readOnly value={role.description} />
            </CreateField>
          </div>
        </div>
      ))}
    </div>
  );
}
