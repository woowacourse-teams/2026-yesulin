"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { fieldControlClass } from "@/components/ui/controls";

export type AccountRole = "applicant" | "producer";

const ROLE_OPTIONS = [
  { value: "applicant", label: "지원자", description: "오디션을 찾고 지원해요" },
  { value: "producer", label: "공연사", description: "공고와 지원자를 관리해요" },
] as const;

export function RoleField({ value, onChange, purpose = "default" }: { readonly value: AccountRole; readonly onChange: (role: AccountRole) => void; readonly purpose?: "default" | "application" }) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold text-foreground">이용 목적</legend>
      <p className="mt-1 text-sm text-muted">{purpose === "application" ? "지원서 제출을 위해 지원자가 미리 선택되어 있어요. 공연사로 바꾸면 지원서 대신 공연사 화면으로 이동합니다." : "사용할 계정 유형을 선택해 주세요."}</p>
      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup">
        {ROLE_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex min-h-[76px] cursor-pointer flex-col justify-center rounded-control border px-4 py-3 transition-[border-color,background-color,color,box-shadow,transform] duration-150 active:scale-[0.99] ${
                selected
                  ? "border-brand bg-brand text-white shadow-[var(--shadow-1)]"
                  : "border-border bg-card hover:border-brand-line hover:bg-brand-soft/45"
              }`}
            >
              <input
                type="radio"
                name="account-role"
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              <span className={`text-base font-semibold ${selected ? "text-white" : "text-foreground"}`}>{option.label}</span>
              <span className={`mt-0.5 text-xs leading-relaxed ${selected ? "text-white/80" : "text-muted"}`}>{option.description}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  readonly label: string;
  readonly error?: string;
  readonly hint?: string;
};

export function AuthInput({ id, label, error, hint, className = "", ...props }: AuthInputProps) {
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <label htmlFor={id} className="block">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={descriptionId}
        className={`${fieldControlClass} mt-2 ${error ? "border-fail focus:border-fail focus:ring-fail-bg" : ""} ${className}`}
        {...props}
      />
      {error ? <span id={`${id}-error`} className="mt-1.5 block text-sm font-medium text-fail">{error}</span> : null}
      {!error && hint ? <span id={`${id}-hint`} className="mt-1.5 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

export function PasswordInput(props: Omit<AuthInputProps, "type">) {
  const [visible, setVisible] = useState(false);
  const { id, label, error, hint, className = "", ...inputProps } = props;
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-foreground">{label}</label>
      <div className="relative mt-2">
        <input
          {...inputProps}
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          className={`${fieldControlClass} pr-16 ${error ? "border-fail focus:border-fail focus:ring-fail-bg" : ""} ${className}`}
        />
        <button
          type="button"
          aria-label={visible ? `${label} 숨기기` : `${label} 보기`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-1 my-auto min-h-11 rounded-control px-3 text-sm font-semibold text-muted transition-colors hover:bg-surface hover:text-foreground"
        >
          {visible ? "숨김" : "보기"}
        </button>
      </div>
      {error ? <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-fail">{error}</p> : null}
      {!error && hint ? <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function ActionInput({ label, error, hint, actionLabel, onAction, ...props }: AuthInputProps & {
  readonly actionLabel: string;
  readonly onAction: () => void;
}) {
  const descriptionId = error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={props.id} className="text-sm font-semibold text-foreground">{label}</label>
      <div className="relative mt-2">
        <input
          {...props}
          aria-invalid={error ? true : undefined}
          aria-describedby={descriptionId}
          className={`${fieldControlClass} pr-28 ${error ? "border-fail focus:border-fail focus:ring-fail-bg" : ""}`}
        />
        <button
          type="button"
          onClick={onAction}
          className="absolute inset-y-0 right-1 my-auto min-h-11 rounded-control px-3 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft hover:text-brand-strong"
        >
          {actionLabel}
        </button>
      </div>
      {error ? <p id={`${props.id}-error`} className="mt-1.5 text-sm font-medium text-fail">{error}</p> : null}
      {!error && hint ? <p id={`${props.id}-hint`} className="mt-1.5 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}
