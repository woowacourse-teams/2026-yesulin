import type { ReactNode } from "react";

export type PasswordResetStep = "EMAIL" | "SENT" | "VERIFYING" | "PASSWORD" | "INVALID" | "COMPLETE";

const STEPS = [
  { id: "EMAIL", label: "이메일" },
  { id: "VERIFY", label: "메일 인증" },
  { id: "PASSWORD", label: "새 비밀번호" },
] as const;

const STEP_INDEX: Record<PasswordResetStep, number> = {
  EMAIL: 0,
  SENT: 1,
  VERIFYING: 1,
  INVALID: 1,
  PASSWORD: 2,
  COMPLETE: 3,
};

export function PasswordResetStepIndicator({ step }: { readonly step: PasswordResetStep }) {
  const currentIndex = STEP_INDEX[step];
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="비밀번호 재설정 단계">
      {STEPS.map((item, index) => {
        const current = index === currentIndex;
        const completed = index < currentIndex;
        return (
          <li
            key={item.id}
            aria-current={current ? "step" : undefined}
            className={`rounded-control border px-2 py-3 text-center text-xs font-semibold sm:text-sm ${
              current
                ? "border-brand bg-brand-soft text-brand"
                : completed
                  ? "border-brand-line bg-card text-brand"
                  : "border-border bg-surface text-muted"
            }`}
          >
            <span className="num mr-1">{completed ? "✓" : index + 1}</span>
            {item.label}
          </li>
        );
      })}
    </ol>
  );
}

export function RequestError({ message }: { readonly message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">
      {message}
    </p>
  );
}

export function StatusPanel({ icon, title, description, children }: {
  readonly icon: string;
  readonly title: string;
  readonly description: ReactNode;
  readonly children?: ReactNode;
}) {
  return (
    <section
      className="space-y-6 text-center"
      aria-labelledby="password-reset-status-title"
      aria-live="polite"
    >
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-2xl font-bold text-brand"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div>
        <h2 id="password-reset-status-title" className="text-xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-strong">{description}</p>
      </div>
      {children}
    </section>
  );
}
