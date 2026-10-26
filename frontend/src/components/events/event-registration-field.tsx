import type { ReactNode } from "react";

/** 참가 신청서의 입력 칸 틀. 필수가 아니면 제목 옆에 "선택"을 붙인다. */
export function RegistrationField({ id, label, required = false, hint, children }: {
  readonly id: string;
  readonly label: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        {required ? <RequiredMark /> : <span className="ml-1 text-xs font-normal text-muted">선택</span>}
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function RequiredMark() {
  return <span className="ml-1 text-xs font-normal text-muted">필수</span>;
}

/** 생년월일이 미래인지 볼 한국 날짜 `YYYY-MM-DD` */
export function koreaToday(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
