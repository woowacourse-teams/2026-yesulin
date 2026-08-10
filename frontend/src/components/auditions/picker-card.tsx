"use client";

import Link from "next/link";

const CARD_CLASS =
  "flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-5 text-left transition-[background-color,border-color,box-shadow,transform] duration-150 ease-[var(--ease-standard)] hover:-translate-y-0.5 hover:border-brand-line hover:shadow-[var(--shadow-2)] active:translate-y-0 active:scale-[0.995] active:bg-brand-soft";

export function PickerScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[1440px] px-5 pb-16 pt-10 md:px-8 xl:px-10">
      {children}
    </div>
  );
}

export function PickerHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start gap-5">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-[-0.025em] md:text-[28px]">{title}</h1>
        <p className="mt-2 text-base text-muted-strong md:text-sm">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function PickerGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))] xl:gap-5">
      {children}
    </div>
  );
}

export function PickerEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="col-span-full rounded-card border border-dashed border-muted-soft bg-card px-6 py-16 text-center text-sm leading-relaxed text-muted-strong">
      <strong className="block text-lg text-foreground">{title}</strong>
      <p className="mx-auto mt-2 max-w-md">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function PickerCard({
  href,
  children,
  action,
}: {
  href: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  if (!action) {
    return (
      <Link href={href} className={CARD_CLASS}>
        {children}
      </Link>
    );
  }

  return (
    <div className={`${CARD_CLASS} gap-0 p-0`}>
      <Link href={href} className="flex min-w-0 flex-col gap-3 p-5">
        {children}
      </Link>
      <div className="flex justify-end border-t border-border-soft px-5 py-3">{action}</div>
    </div>
  );
}

/** 아직 열람할 수 없는 항목. 왜 못 여는지 눌러서 확인할 수 있어야 하므로 버튼으로 둔다. */
export function PickerCardBlocked({
  onBlocked,
  children,
  action,
}: {
  onBlocked: () => void;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const blockedClass = `${CARD_CLASS} cursor-not-allowed opacity-75 hover:translate-y-0 hover:border-border hover:shadow-none active:bg-surface`;

  if (!action) {
    return (
      <button type="button" onClick={onBlocked} className={blockedClass}>
        {children}
      </button>
    );
  }

  return (
    <div className={`${blockedClass} gap-0 p-0`}>
      <button type="button" onClick={onBlocked} className="flex min-w-0 flex-col gap-3 p-5 text-left">
        {children}
      </button>
      <div className="flex justify-end border-t border-border-soft px-5 py-3">{action}</div>
    </div>
  );
}

export function PickerTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-lg font-bold tracking-[-0.015em]">
      {children}
    </div>
  );
}

export function PickerDescription({ children }: { children: React.ReactNode }) {
  return <p className="-mt-2 line-clamp-2 text-base text-muted lg:text-sm">{children}</p>;
}

export function PickerStats({
  primary,
  secondary,
}: {
  primary: { value: number; unit: string };
  secondary: { value: number; unit: string };
}) {
  return (
    <div className="flex items-baseline gap-4 py-[3px]">
      <span>
        <b className="num text-2xl font-bold leading-none tracking-[-0.03em]">{primary.value}</b>
        <span className="ml-1 text-xs text-muted">{primary.unit}</span>
      </span>
      <span>
        <b className="num text-[17px] font-bold leading-none tracking-[-0.03em] text-muted">
          {secondary.value}
        </b>
        <span className="ml-1 text-xs text-muted">{secondary.unit}</span>
      </span>
    </div>
  );
}

export function PickerProgress({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="h-[5px] flex-1 overflow-hidden rounded-full bg-border-soft">
        <i className="block h-full bg-pass transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </span>
      <span className="num shrink-0 text-[11px] font-semibold text-muted">{percent}%</span>
    </div>
  );
}

const DOT_TONE = {
  pending: "bg-warn",
  done: "bg-pass",
  idle: "bg-muted-soft",
} as const;

export function PickerState({
  tone,
  children,
  className = "",
}: {
  tone: keyof typeof DOT_TONE;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-2 border-t border-border-soft pt-3 text-[13px] font-medium text-muted-strong ${className}`}>
      <i aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DOT_TONE[tone]}`} />
      {children}
    </div>
  );
}
