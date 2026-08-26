export function RoleApplicationMode({ selectedRoleCount, allowsMultipleRoles, onChange }: {
  readonly selectedRoleCount: number;
  readonly allowsMultipleRoles: boolean;
  readonly onChange: (allows: boolean) => void;
}) {
  const multipleEnabled = selectedRoleCount >= 2;
  return <fieldset>
    <legend className="sr-only">지원 방식</legend>
    <div className="mb-3 flex items-center justify-between rounded-control bg-surface px-4 py-3 text-sm">
      <span className="text-muted-strong">선택한 모집 배역</span>
      <strong className="num text-brand">{selectedRoleCount}개</strong>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <ApplicationModeOption checked={!allowsMultipleRoles} title="한 배역만 지원" description="지원자는 모집 배역 중 하나만 선택합니다." onChange={() => onChange(false)} />
      <ApplicationModeOption checked={allowsMultipleRoles} disabled={!multipleEnabled} title="여러 배역에 지원" description={multipleEnabled ? "한 지원서로 여러 배역을 함께 선택할 수 있습니다." : "모집 배역을 2개 이상 선택하면 사용할 수 있습니다."} onChange={() => onChange(true)} />
    </div>
  </fieldset>;
}

function ApplicationModeOption({ checked, disabled = false, title, description, onChange }: {
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly title: string;
  readonly description: string;
  readonly onChange: () => void;
}) {
  return <label className={`flex min-h-28 items-start gap-3 rounded-card border p-4 transition-colors ${disabled ? "cursor-not-allowed border-border-soft bg-surface" : checked ? "cursor-pointer border-brand-line bg-brand-soft" : "cursor-pointer border-border bg-card hover:border-brand-line"}`}>
    <input type="radio" name="role-application-mode" checked={checked} disabled={disabled} onChange={onChange} className="mt-0.5 h-5 w-5 shrink-0 accent-brand disabled:opacity-40" />
    <span><strong className={`block text-sm ${disabled ? "text-muted" : "text-foreground"}`}>{title}</strong><span className="mt-1 block text-sm leading-6 text-muted">{description}</span></span>
  </label>;
}
