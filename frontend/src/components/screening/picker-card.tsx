"use client";

import Link from "next/link";

const CARD_CLASS =
  "flex flex-col gap-[9px] rounded-[10px] border border-border bg-card p-4 text-left transition-[border-color,box-shadow] duration-150 hover:border-brand-line hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]";

export function PickerScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1080px] px-4 pb-16 pt-[34px] md:px-6">
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
    <div className="mb-6 flex flex-wrap items-start gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-[23px] font-bold tracking-[-0.03em]">{title}</h1>
        <p className="mt-[5px] text-[13.5px] text-muted">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

export function PickerGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-[13px] [grid-template-columns:repeat(auto-fill,minmax(258px,1fr))]">
      {children}
    </div>
  );
}

export function PickerEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="col-span-full rounded-[10px] border border-dashed border-muted-soft bg-card px-6 py-12 text-center text-[13px] leading-relaxed text-muted">
      {children}
    </div>
  );
}

export function PickerCard({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={CARD_CLASS}>
      {children}
    </Link>
  );
}

/** 아직 열람할 수 없는 항목. 왜 못 여는지 눌러서 확인할 수 있어야 하므로 버튼으로 둔다. */
export function PickerCardBlocked({
  onBlocked,
  children,
}: {
  onBlocked: () => void;
  children: React.ReactNode;
}) {
  return (
    <button type="button" onClick={onBlocked} className={`${CARD_CLASS} opacity-70`}>
      {children}
    </button>
  );
}

export function PickerTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[16.5px] font-bold tracking-[-0.02em]">
      {children}
    </div>
  );
}

export function PickerDescription({ children }: { children: React.ReactNode }) {
  return <p className="-mt-1.5 text-[12.5px] text-muted">{children}</p>;
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
        <span className="ml-[3px] text-[11.5px] text-muted">{primary.unit}</span>
      </span>
      <span>
        <b className="num text-[17px] font-bold leading-none tracking-[-0.03em] text-muted">
          {secondary.value}
        </b>
        <span className="ml-[3px] text-[11.5px] text-muted">{secondary.unit}</span>
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
}: {
  tone: keyof typeof DOT_TONE;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 border-t border-border-soft pt-[9px] text-[12.5px] text-muted-strong">
      <i aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DOT_TONE[tone]}`} />
      {children}
    </div>
  );
}
