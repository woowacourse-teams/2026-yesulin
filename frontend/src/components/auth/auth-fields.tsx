"use client";

import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import { fieldControlClass } from "@/components/ui/controls";

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
        className={`${fieldControlClass} mt-2 ${error ? "border-fail focus:border-fail focus:ring-fail" : ""} ${className}`}
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
          className={`${fieldControlClass} pr-16 ${error ? "border-fail focus:border-fail focus:ring-fail" : ""} ${className}`}
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
          className={`${fieldControlClass} pr-28 ${error ? "border-fail focus:border-fail focus:ring-fail" : ""}`}
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
