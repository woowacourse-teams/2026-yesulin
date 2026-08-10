import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { FieldInput } from "./ui-controls";

const fieldCardClass =
  "flex min-h-12 min-w-0 items-center gap-2 rounded-control border border-border bg-card px-3 py-2.5";

export function ApplicationFieldEditor({
  fields,
  onChange,
}: {
  fields: readonly ApplicationFieldInput[];
  onChange: (fields: readonly ApplicationFieldInput[]) => void;
}) {
  const patch = (id: string, update: Partial<ApplicationFieldInput>) =>
    onChange(fields.map((field) => (field.id === id ? { ...field, ...update } : field)));

  const remove = (id: string) => onChange(fields.filter((field) => field.id !== id));

  const addCustom = () => {
    const id = `custom-${Date.now()}`;
    const order = Math.max(0, ...fields.map((field) => field.order)) + 10;
    onChange([
      ...fields,
      {
        id,
        label: "",
        enabled: true,
        required: false,
        custom: true,
        section: "CUSTOM",
        inputType: "TEXT",
        order,
        layout: "FULL",
        config: { placeholder: "답변을 입력해 주세요." },
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.filter((field) => !field.custom).map((field) => (
          <div key={field.id} className={fieldCardClass}>
            <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-2 text-base md:min-h-0 md:text-[12.5px]">
              <input
                type="checkbox"
                checked={field.enabled}
                onChange={(event) => patch(field.id, { enabled: event.target.checked })}
                className="h-4 w-4 shrink-0 accent-brand"
              />
              <span className={field.enabled ? "truncate text-foreground" : "truncate text-muted"}>
                {field.label}
              </span>
            </label>
            <RequirementSelect
              disabled={!field.enabled}
              required={field.required}
              label={field.label}
              onChange={(required) => patch(field.id, { required })}
            />
          </div>
        ))}
      </div>

      {fields.some((field) => field.custom) ? (
        <div className="space-y-2 rounded-card border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-muted-strong">직접 추가한 항목</p>
          {fields.filter((field) => field.custom).map((field, index) => (
            <div key={field.id} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
              <FieldInput
                required
                autoFocus={index === fields.filter((item) => item.custom).length - 1}
                name={`application-field-${field.id}`}
                autoComplete="off"
                value={field.label}
                onChange={(event) => patch(field.id, { label: event.target.value })}
                placeholder="예: 특기, 개인 SNS 주소"
                aria-label="사용자 정의 지원서 항목 이름"
                className="min-w-52 flex-1"
              />
              <RequirementSelect
                required={field.required}
                label={field.label || "사용자 정의 항목"}
                onChange={(required) => patch(field.id, { required })}
              />
              <button
                type="button"
                onClick={() => remove(field.id)}
                className="min-h-11 rounded-control border border-border bg-card px-3 text-base text-muted-strong hover:border-muted-soft hover:text-foreground md:h-9 md:min-h-0 md:text-[12px]"
              >
                삭제
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={addCustom}
        className="min-h-11 w-full rounded-control border border-dashed border-muted-soft bg-card px-3 py-2.5 text-base font-semibold text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand md:text-[12.5px]"
      >
        지원서 항목 추가
      </button>
    </div>
  );
}

function RequirementSelect({
  required,
  disabled = false,
  label,
  onChange,
}: {
  required: boolean;
  disabled?: boolean;
  label: string;
  onChange: (required: boolean) => void;
}) {
  return (
    <select
      aria-label={`${label} 필수 여부`}
      disabled={disabled}
      value={required ? "required" : "optional"}
      onChange={(event) => onChange(event.target.value === "required")}
      className="min-h-11 shrink-0 rounded-control border border-border bg-card px-2 text-base text-muted-strong disabled:cursor-not-allowed disabled:opacity-40 md:h-8 md:min-h-0 md:text-[11.5px]"
    >
      <option value="required">필수</option>
      <option value="optional">선택</option>
    </select>
  );
}
