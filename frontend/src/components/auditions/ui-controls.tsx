import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import Link from "next/link";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center rounded-control px-4 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[var(--ease-standard)] active:translate-y-px active:scale-[0.99] disabled:pointer-events-none disabled:translate-y-0 disabled:scale-100 disabled:shadow-none";

function ControlButton({ tone, className = "", type, ...props }: ButtonProps & { tone: string }) {
  return <button type={type ?? "button"} className={`${BUTTON_BASE} ${tone} ${className}`} {...props} />;
}

export function PrimaryButton(props: ButtonProps) {
  return (
    <ControlButton
      tone="border border-brand bg-brand text-white shadow-[var(--shadow-1)] hover:bg-brand-strong hover:shadow-[var(--shadow-2)] active:bg-brand-pressed disabled:border-border disabled:bg-border disabled:text-muted"
      {...props}
    />
  );
}

export function SecondaryButton(props: ButtonProps) {
  return (
    <ControlButton
      tone="border border-border bg-card text-foreground hover:border-brand-line hover:bg-brand-soft active:bg-brand-soft-strong disabled:bg-surface disabled:text-muted"
      {...props}
    />
  );
}

export function DestructiveButton(props: ButtonProps) {
  return (
    <ControlButton
      tone="border border-fail/30 bg-card text-fail hover:border-fail/50 hover:bg-fail-bg active:bg-fail-bg disabled:border-border disabled:bg-surface disabled:text-muted"
      {...props}
    />
  );
}

export function SecondaryLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-control border border-border bg-card px-4 text-sm font-semibold text-foreground transition-[background-color,border-color,color,transform] duration-150 hover:border-brand-line hover:bg-brand-soft active:translate-y-px active:scale-[0.99] active:bg-brand-soft-strong ${className}`}
    >
      {children}
    </Link>
  );
}

export function TextButton(props: ButtonProps) {
  return (
    <ControlButton
      tone="border border-transparent bg-transparent text-muted-strong hover:bg-surface hover:text-foreground active:bg-border-soft disabled:text-muted-soft"
      {...props}
    />
  );
}

export function DarkButton(props: ButtonProps) {
  return (
    <ControlButton
      tone="border border-foreground bg-foreground text-white hover:bg-sidebar-hover active:bg-sidebar disabled:border-border disabled:bg-border disabled:text-muted"
      {...props}
    />
  );
}

export const fieldControlClass =
  "min-h-12 w-full rounded-control border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-soft hover:border-muted-soft focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:border-border disabled:bg-border-soft disabled:text-muted md:text-sm";

export function FieldInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldControlClass} ${className}`} {...props} />;
}

export function FieldSelect({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldControlClass} ${className}`} {...props} />;
}

export function FieldTextarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldControlClass} ${className}`} {...props} />;
}

export function FilterChip({
  pressed,
  className = "",
  ...props
}: ButtonProps & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`min-h-9 whitespace-nowrap rounded-full border px-3 py-1.5 text-base font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:scale-100 disabled:border-border disabled:bg-border-soft disabled:text-muted lg:text-[13px] ${
        pressed
          ? "border-foreground bg-foreground text-white shadow-[var(--shadow-1)]"
          : "border-border bg-card text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand"
      } ${className}`}
      {...props}
    />
  );
}

export function WarningFilterChip({
  pressed,
  className = "",
  ...props
}: ButtonProps & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`min-h-9 whitespace-nowrap rounded-full border px-3 py-1.5 text-base font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:scale-100 disabled:border-border disabled:bg-border-soft disabled:text-muted lg:text-[13px] ${
        pressed
          ? "border-warn bg-warn text-white"
          : "border-warn-bg bg-card text-muted-strong hover:border-warn hover:bg-warn-bg hover:text-warn"
      } ${className}`}
      {...props}
    />
  );
}

export function SegmentButton({
  pressed,
  className = "",
  ...props
}: ButtonProps & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`min-h-9 px-3 py-1.5 text-base font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:bg-border-soft disabled:text-muted lg:text-[13px] ${
        pressed ? "bg-foreground text-white" : "bg-card text-muted-strong hover:bg-surface hover:text-foreground"
      } ${className}`}
      {...props}
    />
  );
}
