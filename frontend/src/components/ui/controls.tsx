import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
type ControlLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
};

const CONTROL_BASE =
  "inline-flex min-h-11 items-center justify-center rounded-control px-4 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-150 ease-[var(--ease-standard)] active:translate-y-px active:scale-[0.99] disabled:pointer-events-none disabled:translate-y-0 disabled:scale-100 disabled:shadow-none";

const CONTROL_TONE = {
  primary:
    "border border-brand bg-brand text-white shadow-[var(--shadow-1)] hover:bg-brand-strong hover:shadow-[var(--shadow-2)] active:bg-brand-pressed disabled:border-border disabled:bg-border disabled:text-muted",
  secondary:
    "border border-border bg-card text-foreground hover:border-brand-line hover:bg-brand-soft active:bg-brand-soft-strong disabled:bg-surface disabled:text-muted",
  destructive:
    "border border-fail/30 bg-card text-fail hover:border-fail/50 hover:bg-fail-bg active:bg-fail-bg disabled:border-border disabled:bg-surface disabled:text-muted",
  text: "border border-transparent bg-transparent text-muted-strong hover:bg-surface hover:text-foreground active:bg-border-soft disabled:text-muted-soft",
  dark: "border border-foreground bg-foreground text-white hover:bg-sidebar-hover active:bg-sidebar disabled:border-border disabled:bg-border disabled:text-muted",
  add: "border border-dashed border-muted-soft bg-card text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand active:bg-brand-soft-strong disabled:border-border disabled:bg-surface disabled:text-muted",
} as const;

function ControlButton({ tone, className = "", type, ...props }: ButtonProps & { tone: keyof typeof CONTROL_TONE }) {
  return <button type={type ?? "button"} className={`${CONTROL_BASE} ${CONTROL_TONE[tone]} ${className}`} {...props} />;
}

function ControlLink({ tone, className = "", ...props }: ControlLinkProps & { tone: keyof typeof CONTROL_TONE }) {
  const controlClassName = `${CONTROL_BASE} ${CONTROL_TONE[tone]} ${className}`;
  if (props.href.startsWith("#")) return <a className={controlClassName} {...props} />;
  return <Link className={controlClassName} {...props} />;
}

export function PrimaryButton(props: ButtonProps) {
  return <ControlButton tone="primary" {...props} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <ControlButton tone="secondary" {...props} />;
}

export function DestructiveButton(props: ButtonProps) {
  return <ControlButton tone="destructive" {...props} />;
}

export function TextButton(props: ButtonProps) {
  return <ControlButton tone="text" {...props} />;
}

export function DarkButton(props: ButtonProps) {
  return <ControlButton tone="dark" {...props} />;
}

export function AddButton(props: ButtonProps) {
  return <ControlButton tone="add" {...props} />;
}

export function PrimaryLink(props: ControlLinkProps) {
  return <ControlLink tone="primary" {...props} />;
}

export function SecondaryLink(props: ControlLinkProps) {
  return <ControlLink tone="secondary" {...props} />;
}

export function TextLink(props: ControlLinkProps) {
  return <ControlLink tone="text" {...props} />;
}

export function DarkLink(props: ControlLinkProps) {
  return <ControlLink tone="dark" {...props} />;
}

export const fieldControlClass =
  "min-h-12 w-full rounded-control border border-border bg-card px-3 py-2.5 text-base text-foreground outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted-soft hover:border-muted-soft focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:border-border disabled:bg-border-soft disabled:text-muted md:text-sm";

export function FieldInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldControlClass} ${className}`} {...props} />;
}

export function FieldSelect({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${fieldControlClass} ${className}`} {...props} />;
}

/** 값을 입력해도 남아 있어야 하는 단위 표시. `relative` 컨테이너 안에서 입력칸 위에 겹친다. */
export function UnitSuffix({ unit }: { readonly unit: string }) {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
      {unit}
    </span>
  );
}

export function FieldTextarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldControlClass} ${className}`} {...props} />;
}

export function FilterChip({ pressed, className = "", ...props }: ButtonProps & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`min-h-9 whitespace-nowrap rounded-full border px-3 py-1.5 text-base font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:scale-100 disabled:border-border disabled:bg-border-soft disabled:text-muted lg:text-dense ${
        pressed
          ? "border-foreground bg-foreground text-white shadow-[var(--shadow-1)]"
          : "border-border bg-card text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand"
      } ${className}`}
      {...props}
    />
  );
}

export function WarningFilterChip({ pressed, className = "", ...props }: ButtonProps & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`min-h-9 whitespace-nowrap rounded-full border px-3 py-1.5 text-base font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:scale-100 disabled:border-border disabled:bg-border-soft disabled:text-muted lg:text-dense ${
        pressed
          ? "border-warn bg-warn text-white"
          : "border-warn-bg bg-card text-muted-strong hover:border-warn hover:bg-warn-bg hover:text-warn"
      } ${className}`}
      {...props}
    />
  );
}

export function SegmentButton({ pressed, className = "", ...props }: ButtonProps & { pressed: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`min-h-9 px-3 py-1.5 text-base font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:bg-border-soft disabled:text-muted lg:text-dense ${
        pressed ? "bg-foreground text-white" : "bg-card text-muted-strong hover:bg-surface hover:text-foreground"
      } ${className}`}
      {...props}
    />
  );
}
