"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type RangePosition = "start" | "end";

export function CalendarDateRangeField({
  start,
  end,
  onStartChange,
  onEndChange,
  startLabel = "시작일",
  endLabel = "종료일",
  endOptional = false,
  includeTime = false,
  single = false,
  startDisabled = false,
  variant = "labelled",
}: {
  readonly start: string;
  readonly end: string;
  readonly onStartChange: (value: string) => void;
  readonly onEndChange: (value: string) => void;
  readonly startLabel?: string;
  readonly endLabel?: string;
  readonly endOptional?: boolean;
  readonly includeTime?: boolean;
  readonly single?: boolean;
  readonly startDisabled?: boolean;
  readonly variant?: "labelled" | "compact";
}) {
  const pickerId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<RangePosition>("start");
  const [visibleMonth, setVisibleMonth] = useState(() => monthOf(start || end));
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!containerRef.current?.contains(target) && !pickerRef.current?.contains(target)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const openFor = (nextPosition: RangePosition) => {
    if (nextPosition === "start" && startDisabled) return;
    setPosition(nextPosition);
    setVisibleMonth(monthOf(nextPosition === "start" ? start : end || start));
    if (variant === "compact") setPortalTarget(containerRef.current?.closest<HTMLElement>('[role="dialog"][aria-modal="true"]') ?? document.body);
    setOpen(true);
  };

  const selectDate = (value: string) => {
    if (single) {
      onStartChange(includeTime ? withTime(value, timeOf(start, "09:00")) : value);
      if (!includeTime) setOpen(false);
      return;
    }
    if (position === "start") {
      onStartChange(includeTime ? withTime(value, timeOf(start, "09:00")) : value);
      if (end && dateOf(end) < value) onEndChange("");
      setPosition("end");
      return;
    }
    onEndChange(includeTime ? withTime(value, timeOf(end, "23:59")) : value);
    if (!includeTime) setOpen(false);
  };

  const updateTime = (target: RangePosition, time: string) => {
    const value = target === "start" ? start : end;
    if (!dateOf(value)) return;
    if (target === "start") onStartChange(withTime(dateOf(value), time));
    else onEndChange(withTime(dateOf(value), time));
  };

  const picker = open ? <div ref={pickerRef} id={pickerId} role="dialog" aria-label={`${single ? startLabel : `${startLabel}·${endLabel}`} 선택`} className={`${variant === "compact" ? "max-h-[calc(100dvh-48px)] w-full max-w-[760px] overflow-y-auto rounded-modal" : "relative z-10 mt-2 rounded-card"} border border-border bg-card p-4 shadow-[var(--shadow-modal)] md:p-5`}>
    <div className="flex items-center justify-between">
      <button type="button" aria-label="이전 달" onClick={() => setVisibleMonth(shiftMonth(visibleMonth, -1))} className="grid h-11 w-11 place-items-center rounded-control text-xl text-muted-strong hover:bg-surface hover:text-foreground">‹</button>
      <strong className="text-sm">{monthRangeLabel(visibleMonth)}</strong>
      <button type="button" aria-label="다음 달" onClick={() => setVisibleMonth(shiftMonth(visibleMonth, 1))} className="grid h-11 w-11 place-items-center rounded-control text-xl text-muted-strong hover:bg-surface hover:text-foreground">›</button>
    </div>

    <div className="grid gap-5 md:grid-cols-2">
      <CalendarMonth month={visibleMonth} start={dateOf(start)} end={single ? "" : dateOf(end)} position={position} onSelect={selectDate} />
      <div className="hidden md:block"><CalendarMonth month={shiftMonth(visibleMonth, 1)} start={dateOf(start)} end={single ? "" : dateOf(end)} position={position} onSelect={selectDate} /></div>
    </div>

    <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-border-soft pt-3">
      <button type="button" onClick={() => selectDate(todayIso())} className="min-h-11 rounded-control px-3 text-sm font-semibold text-brand hover:bg-brand-soft">오늘</button>
      {!single && endOptional && end ? <button type="button" onClick={() => onEndChange("")} className="min-h-11 rounded-control px-3 text-sm font-semibold text-muted-strong hover:bg-surface hover:text-foreground">종료일 지우기</button> : null}
      {includeTime ? <div className="ml-auto flex flex-wrap items-end justify-end gap-2">
        <TimeInput label={single ? "시간" : `${startLabel} 시간`} value={start} fallback="09:00" onChange={(time) => updateTime("start", time)} />
        {!single ? <TimeInput label={`${endLabel} 시간`} value={end} fallback="23:59" onChange={(time) => updateTime("end", time)} /> : null}
      </div> : null}
      <button type="button" onClick={() => setOpen(false)} className={`${includeTime ? "" : "ml-auto"} min-h-11 rounded-control border border-border bg-card px-4 text-sm font-semibold hover:border-brand-line hover:bg-brand-soft`}>완료</button>
    </div>
  </div> : null;

  return <div ref={containerRef} className="relative">
    <div className={`grid items-stretch gap-2 ${single ? "" : "md:grid-cols-[1fr_auto_1fr] md:gap-3"}`}>
      <DateTrigger label={startLabel} value={start} includeTime={includeTime} disabled={startDisabled} active={open && position === "start"} controls={pickerId} compact={variant === "compact"} onClick={() => openFor("start")} />
      {!single ? <><span aria-hidden="true" className="hidden items-center text-lg text-muted md:flex">→</span>
      <DateTrigger label={`${endLabel}${endOptional ? " (선택)" : ""}`} value={end} includeTime={includeTime} disabled={false} active={open && position === "end"} controls={pickerId} compact={false} onClick={() => openFor("end")} /></> : null}
    </div>

    {open && picker ? variant === "compact" && portalTarget ? createPortal(<div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/25 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>{picker}</div>, portalTarget) : picker : null}
  </div>;
}

function DateTrigger({ label, value, includeTime, disabled, active, controls, compact, onClick }: { readonly label: string; readonly value: string; readonly includeTime: boolean; readonly disabled: boolean; readonly active: boolean; readonly controls: string; readonly compact: boolean; readonly onClick: () => void }) {
  const displayedValue = value ? formatDate(value, includeTime) : includeTime ? "날짜와 시간 선택" : "날짜 선택";
  return <button type="button" disabled={disabled} aria-label={`${label} ${displayedValue}`} aria-expanded={active} aria-controls={controls} onClick={onClick} className={`flex w-full min-w-0 items-center rounded-control border text-left transition-colors disabled:cursor-not-allowed disabled:bg-border-soft disabled:text-muted ${compact ? "min-h-12 gap-2 px-3 py-2" : "min-h-[72px] gap-3 px-4 py-3"} ${active ? "border-brand bg-brand-soft ring-2 ring-brand-soft" : "border-border bg-card hover:border-brand-line hover:bg-surface"}`}>
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-lg ${compact ? "h-8 w-8" : "h-9 w-9"} ${active ? "bg-brand text-white" : "bg-surface text-muted-strong"}`}><CalendarIcon /></span>
    <span className="min-w-0"><span className={compact ? "sr-only" : "block text-xs font-semibold text-muted"}>{label}</span><strong className={`${compact ? "block" : "mt-1 block"} truncate text-sm ${value ? "text-foreground" : "text-muted"}`}>{displayedValue}</strong></span>
  </button>;
}

function TimeInput({ label, value, fallback, onChange }: { readonly label: string; readonly value: string; readonly fallback: string; readonly onChange: (time: string) => void }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-muted">{label}</span><input type="time" step={60} disabled={!dateOf(value)} value={timeOf(value, fallback)} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-control border border-border bg-card px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-border-soft disabled:text-muted" /></label>;
}

function CalendarMonth({ month, start, end, position, onSelect }: { readonly month: Date; readonly start: string; readonly end: string; readonly position: RangePosition; readonly onSelect: (value: string) => void }) {
  const days = monthDays(month);
  return <section aria-label={`${month.getFullYear()}년 ${month.getMonth() + 1}월`}>
    <h3 className="mb-2 text-center text-sm font-bold">{month.getFullYear()}년 {month.getMonth() + 1}월</h3>
    <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted">{["일", "월", "화", "수", "목", "금", "토"].map((day) => <span key={day} className="py-2">{day}</span>)}</div>
    <div className="grid grid-cols-7 gap-y-1">{days.map((day, index) => {
      if (!day) return <span key={`empty-${index}`} />;
      const value = toIso(day);
      const disabled = position === "end" && Boolean(start) && value < start;
      const endpoint = value === start || value === end;
      const inRange = Boolean(start && end && value > start && value < end);
      const today = value === todayIso();
      return <button key={value} type="button" disabled={disabled} aria-label={formatDate(value)} aria-pressed={endpoint} onClick={() => onSelect(value)} className={`num relative grid h-9 place-items-center rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:text-muted-soft ${endpoint ? "bg-brand font-bold text-white" : inRange ? "bg-brand-soft font-semibold text-brand" : "hover:bg-surface"} ${today && !endpoint ? "font-bold text-brand ring-1 ring-inset ring-brand-line" : ""}`}>{day.getDate()}</button>;
    })}</div>
  </section>;
}

function monthOf(value = "") { const date = parseDate(value) ?? new Date(); return new Date(date.getFullYear(), date.getMonth(), 1); }
function shiftMonth(month: Date, amount: number) { return new Date(month.getFullYear(), month.getMonth() + amount, 1); }
function parseDate(value: string) { const [year, month, day] = value.slice(0, 10).split("-").map(Number); return year && month && day ? new Date(year, month - 1, day) : null; }
function toIso(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function todayIso() { return toIso(new Date()); }
function dateOf(value: string) { return value.slice(0, 10); }
function timeOf(value: string, fallback: string) { return value.includes("T") ? value.slice(11, 16) : fallback; }
function withTime(date: string, time: string) { return `${date}T${time}`; }
function monthDays(month: Date): readonly (Date | null)[] { const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay(); const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); return [...Array.from({ length: firstDay }, () => null), ...Array.from({ length: count }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1))]; }
function monthRangeLabel(month: Date) { const next = shiftMonth(month, 1); return `${month.getFullYear()}년 ${month.getMonth() + 1}월 – ${next.getFullYear()}년 ${next.getMonth() + 1}월`; }
function formatDate(value: string, includeTime = false) { const date = parseDate(value); return date ? `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 (${["일", "월", "화", "수", "목", "금", "토"][date.getDay()]})${includeTime ? ` · ${timeOf(value, "--:--")}` : ""}` : value; }
function CalendarIcon() { return <svg viewBox="0 0 20 20" className="h-5 w-5 fill-none stroke-current stroke-[1.7]"><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><path d="M6.5 2.5v4M13.5 2.5v4M3 8h14" /></svg>; }
