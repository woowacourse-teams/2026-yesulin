"use client";

import { useId, useRef, useState } from "react";
import {
  changeCommonRanges,
  checkRange,
  commonRangesOf,
  customDates,
  datesBetween,
  normalizeTimeInput,
  rangesOf,
  readSettingForm,
  removeDates,
  selectDates,
  selectedDates,
  setDateRanges,
  sortRanges,
  toRangeForm,
  windowKey,
  type RangeForm,
  type SettingForm,
  type SettingFormErrors,
  type TimeRange,
} from "@/features/timetables/setting-form";
import { formatDate, formatShortDate, monthGrid, shiftMonth, slotsOf, todayInSeoul } from "@/features/timetables/time";
import { TIMETABLE_LIMITS } from "@/features/timetables/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

const ICON_BUTTON_CLASS =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-control text-muted-strong hover:bg-surface hover:text-foreground disabled:text-muted-soft";

/**
 * 왼쪽 달력에서 오디션 날짜를 고르고(누르면 선택·해제, 끌면 여러 날), 오른쪽에서 모든 날짜에 쓸 오디션 가능 시간과
 * 진행 시간·동시 인원을 정한다. 오른쪽은 달력 높이에 맞추고 넘치면 안에서 스크롤한다.
 * 고른 날짜는 아래 두 칸 목록에 나오고 날짜마다 시간을 따로 고칠 수 있다.
 *
 * `locked`를 주면 이미 저장한 일정표를 늘리는 화면이다. 저장한 날짜·시간은 빼거나 고칠 수 없고 진행 시간도 고정이며,
 * 날짜·시간을 더하고 인원을 늘리기만 한다.
 */
export function SettingFields({ form, errors, onChange, disabled = false, locked }: {
  readonly form: SettingForm;
  readonly errors: SettingFormErrors;
  readonly onChange: (form: SettingForm) => void;
  readonly disabled?: boolean;
  readonly locked?: { readonly windowKeys: ReadonlySet<string>; readonly minCapacity: number };
}) {
  const id = useId();
  const today = todayInSeoul();
  const [month, setMonth] = useState(() => (selectedDates(form)[0] ?? today).slice(0, 7));
  const [common, setCommon] = useState<readonly RangeForm[]>(() => commonRangesOf(form));
  const dates = selectedDates(form);
  const lockedIds = new Set(form.windows.filter((window) => locked?.windowKeys.has(windowKey(window))).map((window) => window.id));
  const lockedDates = [...new Set(form.windows.filter((window) => lockedIds.has(window.id)).map((window) => window.date))];
  const custom = customDates(form, common).filter((date) => !lockedDates.includes(date));
  const preview = readSettingForm(form).setting;
  const slotCount = preview ? slotsOf(preview).length : 0;

  const changeCommon = (next: readonly RangeForm[]) => {
    onChange(changeCommonRanges(form, common, next, lockedDates));
    setCommon(next);
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <DateCalendar
          month={month}
          minMonth={[today, ...dates].sort()[0].slice(0, 7)}
          today={today}
          selected={dates}
          custom={custom}
          locked={lockedDates}
          invalid={Boolean(errors.windows) && dates.length === 0}
          disabled={disabled}
          onMonthChange={setMonth}
          onToggle={(date) => {
            if (lockedDates.includes(date)) return;
            onChange(dates.includes(date) ? removeDates(form, [date]) : selectDates(form, [date], common));
          }}
          onRange={(from, to, mode) => {
            const range = datesBetween(from, to).filter((date) => !lockedDates.includes(date));
            onChange(mode === "remove" ? removeDates(form, range) : selectDates(form, range.filter((date) => date >= today), common));
          }}
        />

        <div className="relative rounded-control border border-border">
          <div className="space-y-5 p-4 md:absolute md:inset-0 md:overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <Stepper
                label="오디션 진행 시간"
                unit="분"
                value={form.slotMinutes}
                min={TIMETABLE_LIMITS.minSlotMinutes}
                max={TIMETABLE_LIMITS.maxSlotMinutes}
                step={TIMETABLE_LIMITS.minuteStep}
                invalid={Boolean(errors.slotMinutes)}
                disabled={disabled || Boolean(locked)}
                onChange={(slotMinutes) => onChange({ ...form, slotMinutes })}
              />
              <Stepper
                label="동시 오디션 인원"
                unit="명"
                value={form.slotCapacity}
                min={locked?.minCapacity ?? 1}
                max={TIMETABLE_LIMITS.maxSlotCapacity}
                step={1}
                invalid={Boolean(errors.slotCapacity)}
                disabled={disabled}
                onChange={(slotCapacity) => onChange({ ...form, slotCapacity })}
              />
            </div>
            {errors.slotMinutes ? <p className="text-sm text-fail">{errors.slotMinutes}</p> : null}
            {errors.slotCapacity ? <p className="text-sm text-fail">{errors.slotCapacity}</p> : null}
            <CommonRanges
              label={locked ? "새 날짜의 오디션 가능 시간" : "오디션 가능 시간"}
              common={common}
              slotMinutes={form.slotMinutes}
              disabled={disabled}
              onChange={changeCommon}
            />
          </div>
        </div>
      </div>

      {/* 날짜가 없으면 달력 테두리로만 알리고, 개수 초과처럼 이유가 필요한 오류만 문구로 보여 준다. */}
      {errors.windows && dates.length > 0 ? <p role="alert" className="text-sm text-fail">{errors.windows}</p> : null}

      {dates.length > 0 ? (
        <section aria-labelledby={`${id}-schedule`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id={`${id}-schedule`} className="text-sm font-semibold text-foreground">
              오디션 일정 <span className="num font-normal text-brand">{dates.length}일</span>
            </h3>
            {preview ? (
              <p className="text-sm text-muted-strong">
                총 <strong className="num text-foreground">{slotCount}</strong>칸 · 최대{" "}
                <strong className="num text-foreground">{slotCount * preview.slotCapacity}</strong>명
              </p>
            ) : null}
          </div>
          <ul className="mt-2 grid max-h-[26rem] gap-2 overflow-y-auto rounded-control border border-border bg-surface p-2 md:grid-cols-2">
            {dates.map((date) => (
              <ScheduleCard
                key={date}
                form={form}
                date={date}
                isCustom={custom.includes(date)}
                dateLocked={lockedDates.includes(date)}
                lockedIds={lockedIds}
                errors={errors}
                disabled={disabled}
                onChange={onChange}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/** 모든 날짜에 쓸 오디션 가능 시간. 점심시간처럼 쉬는 시간은 시간을 나눠 두 슬롯으로 넣는다. */
function CommonRanges({ label, common, slotMinutes, disabled, onChange }: {
  readonly label: string;
  readonly common: readonly RangeForm[];
  readonly slotMinutes: string;
  readonly disabled: boolean;
  readonly onChange: (next: readonly RangeForm[]) => void;
}) {
  const id = useId();
  return (
    <div>
      <p id={`${id}-label`} className="text-sm font-semibold text-foreground">{label}</p>
      <SlotEditor
        labelledBy={`${id}-label`}
        name={label}
        ranges={common}
        slotMinutes={slotMinutes}
        disabled={disabled}
        inputAlwaysVisible
        onChange={onChange}
      />
    </div>
  );
}

/**
 * 시간 범위를 슬롯(칩)으로 보여 주고, 시각을 적어 추가하거나 슬롯을 눌러 고친다. 슬롯은 하나 이상 남는다.
 * 넣기 전에 형식·순서·진행 시간·겹침을 검사하므로 저장된 슬롯은 항상 올바르다.
 */
function SlotEditor({
  labelledBy,
  name,
  ranges,
  slotMinutes,
  disabled,
  inputAlwaysVisible = false,
  adding = false,
  lockedIds,
  onAddingChange,
  onChange,
}: {
  readonly labelledBy: string;
  readonly name: string;
  readonly ranges: readonly RangeForm[];
  readonly slotMinutes: string;
  readonly disabled: boolean;
  readonly inputAlwaysVisible?: boolean;
  /** 입력 줄을 숨겨 두는 경우 바깥의 추가 버튼이 연다. */
  readonly adding?: boolean;
  readonly onAddingChange?: (adding: boolean) => void;
  /** 저장해 고칠 수 없는 슬롯. 잠긴 모양으로만 보여 준다. */
  readonly lockedIds?: ReadonlySet<string>;
  readonly onChange: (next: readonly RangeForm[]) => void;
}) {
  // 잠긴 슬롯이 있는 날짜는 새로 더한 슬롯을 모두 뺄 수 있고, 아니면 슬롯이 하나 이상 남아야 한다.
  const lockedHere = ranges.some((range) => lockedIds?.has(range.id));
  const removable = ranges.filter((range) => !lockedIds?.has(range.id)).length > (lockedHere ? 0 : 1);
  const [draft, setDraft] = useState<TimeRange>({ startTime: "", endTime: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setAdding = (value: boolean) => onAddingChange?.(value);
  const inputVisible = inputAlwaysVisible || adding || editingId !== null;

  const reset = () => {
    setDraft({ startTime: "", endTime: "" });
    setEditingId(null);
    setAdding(false);
    setError(null);
  };

  const submit = () => {
    const range = { startTime: normalizeTimeInput(draft.startTime), endTime: normalizeTimeInput(draft.endTime) };
    const message = checkRange(range, ranges.filter((item) => item.id !== editingId), slotMinutes);
    if (message) {
      setDraft(range);
      setError(message);
      return;
    }
    onChange(sortRanges(editingId
      ? ranges.map((item) => (item.id === editingId ? { ...item, ...range } : item))
      : [...ranges, toRangeForm(range)]));
    reset();
  };

  const input = (
    <div
      className="mt-2 flex flex-wrap items-center gap-1.5"
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        // 일정표 생성 폼이 제출되지 않도록 막고 시간만 넣는다.
        event.preventDefault();
        submit();
      }}
    >
      <TimeRangeInputs
        value={draft}
        size={inputAlwaysVisible ? "md" : "sm"}
        label={editingId ? `고칠 ${name}` : `추가할 ${name}`}
        invalid={Boolean(error)}
        disabled={disabled}
        onChange={(patch) => {
          setDraft({ ...draft, ...patch });
          setError(null);
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={submit}
        className={`${inputAlwaysVisible ? "h-10" : "h-9"} shrink-0 rounded-control bg-foreground px-3 text-sm font-semibold text-white hover:bg-sidebar-hover disabled:bg-border`}
      >
        {editingId ? "변경" : "추가"}
      </button>
      {editingId || adding ? (
        <button type="button" onClick={reset} aria-label="입력 취소" className={ICON_BUTTON_CLASS}>✕</button>
      ) : null}
      {error ? <p role="alert" className="basis-full text-sm text-fail">{error}</p> : null}
    </div>
  );

  return (
    <>
      {inputAlwaysVisible ? input : null}
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-labelledby={labelledBy}>
        {ranges.map((range) => (lockedIds?.has(range.id) ? (
          <li
            key={range.id}
            className="num inline-flex h-8 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-sm font-semibold text-muted-strong"
            aria-label={`${name} ${range.startTime}~${range.endTime} (저장됨, 바꿀 수 없음)`}
          >
            <LockIcon />
            {range.startTime}~{range.endTime}
          </li>
        ) : (
          <li
            key={range.id}
            className={`inline-flex h-8 items-center rounded-full border text-sm ${
              editingId === range.id ? "border-foreground bg-foreground text-white" : "border-brand-line bg-brand-soft text-brand"
            }`}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setEditingId(range.id);
                setAdding(false);
                setDraft({ startTime: range.startTime, endTime: range.endTime });
                setError(null);
              }}
              aria-label={`${name} ${range.startTime}~${range.endTime} 고치기`}
              className={`num h-full font-semibold ${removable ? "pl-2.5 pr-0.5" : "px-2.5"}`}
            >
              {range.startTime}~{range.endTime}
            </button>
            {removable ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (editingId === range.id) reset();
                  onChange(ranges.filter((item) => item.id !== range.id));
                }}
                aria-label={`${name} ${range.startTime}~${range.endTime} 빼기`}
                className="inline-flex size-6 items-center justify-center rounded-full text-xs opacity-70 hover:opacity-100"
              >
                ✕
              </button>
            ) : null}
          </li>
        )))}
      </ul>
      {!inputAlwaysVisible && inputVisible ? input : null}
    </>
  );
}

/** 숫자를 직접 적거나 −·+로 바꾼다. 한 줄 안에 머물러 옆 달력 높이를 바꾸지 않는다. */
function Stepper({ label, unit, value, min, max, step, invalid, disabled, onChange }: {
  readonly label: string;
  readonly unit: string;
  readonly value: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly invalid: boolean;
  readonly disabled: boolean;
  readonly onChange: (value: string) => void;
}) {
  const id = useId();
  const number = Number(value);
  const valid = value !== "" && Number.isFinite(number);
  const down = () => onChange(String(Math.max(min, Math.ceil(number / step) * step - step)));
  const up = () => onChange(String(Math.min(max, Math.floor(number / step) * step + step)));
  const buttonClass = "inline-flex size-9 shrink-0 items-center justify-center text-lg font-semibold text-muted-strong hover:bg-surface disabled:text-muted-soft";
  return (
    <div className="min-w-0">
      <p id={id} className="text-sm font-semibold text-foreground">{label}</p>
      <div
        role="group"
        aria-labelledby={id}
        className={`mt-2 flex h-10 items-center overflow-hidden rounded-control border bg-card ${invalid ? "border-fail ring-2 ring-fail-bg" : "border-border"}`}
      >
        <button type="button" aria-label={`${label} 줄이기`} disabled={disabled || !valid || number <= min} onClick={down} className={buttonClass}>−</button>
        <input
          type="text"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          aria-label={`${label}(${unit})`}
          aria-invalid={invalid ? true : undefined}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 3))}
          className="num w-full min-w-0 bg-transparent text-right text-base font-semibold outline-none md:text-sm"
        />
        <span aria-hidden="true" className="pl-0.5 pr-1 text-sm text-muted">{unit}</span>
        <button type="button" aria-label={`${label} 늘리기`} disabled={disabled || !valid || number >= max} onClick={up} className={buttonClass}>+</button>
      </div>
    </div>
  );
}

/** 고른 날짜 하나. 슬롯을 고치면 그 날짜만 바뀌고 "개별"로 표시된다. */
function ScheduleCard({ form, date, isCustom, dateLocked, lockedIds, errors, disabled, onChange }: {
  readonly form: SettingForm;
  readonly date: string;
  readonly isCustom: boolean;
  readonly dateLocked: boolean;
  readonly lockedIds: ReadonlySet<string>;
  readonly errors: SettingFormErrors;
  readonly disabled: boolean;
  readonly onChange: (form: SettingForm) => void;
}) {
  const id = useId();
  const [adding, setAdding] = useState(false);
  const ranges = rangesOf(form, date);
  const rowErrors = [...new Set(ranges.map((range) => errors[range.id]).filter(Boolean))];
  return (
    <li className={`rounded-control border bg-card px-3 py-2 ${rowErrors.length > 0 ? "border-fail" : "border-border"}`}>
      <div className="flex items-center gap-2">
        <span id={`${id}-date`} className="text-sm font-semibold text-foreground">{formatShortDate(date)}</span>
        {isCustom ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">개별</span> : null}
        <span className="ml-auto flex items-center">
          <button
            type="button"
            aria-label={`${formatDate(date)} 시간 추가`}
            disabled={disabled || adding || form.windows.length >= TIMETABLE_LIMITS.maxWindows}
            onClick={() => setAdding(true)}
            className="inline-flex h-8 items-center rounded-control px-2 text-sm font-semibold text-brand hover:bg-brand-soft disabled:text-muted-soft disabled:hover:bg-transparent"
          >
            + 시간
          </button>
          {dateLocked ? null : (
            <button
              type="button"
              aria-label={`${formatDate(date)} 빼기`}
              disabled={disabled}
              onClick={() => onChange(removeDates(form, [date]))}
              className={`${ICON_BUTTON_CLASS} hover:text-fail`}
            >
              ✕
            </button>
          )}
        </span>
      </div>
      <SlotEditor
        labelledBy={`${id}-date`}
        name={`${formatDate(date)} 시간`}
        ranges={ranges}
        slotMinutes={form.slotMinutes}
        disabled={disabled}
        adding={adding}
        lockedIds={lockedIds}
        onAddingChange={setAdding}
        onChange={(next) => onChange(setDateRanges(form, [date], next))}
      />
      {rowErrors.length > 0 ? <p className="mt-1 text-sm text-fail">{rowErrors.join(" ")}</p> : null}
    </li>
  );
}

function TimeRangeInputs({ value, label, onChange, invalid, disabled, size = "md" }: {
  readonly value: TimeRange;
  readonly label: string;
  readonly onChange: (patch: Partial<TimeRange>) => void;
  readonly invalid: boolean;
  readonly disabled: boolean;
  readonly size?: "sm" | "md";
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1" role="group" aria-label={label}>
      <TimeInput label="시작" size={size} value={value.startTime} invalid={invalid} disabled={disabled} onChange={(startTime) => onChange({ startTime })} />
      <span aria-hidden="true" className="text-muted">~</span>
      <TimeInput label="끝" size={size} value={value.endTime} invalid={invalid} disabled={disabled} onChange={(endTime) => onChange({ endTime })} />
    </span>
  );
}

/** 시각을 직접 적는다. 숫자만 적어도(930, 1000) 칸을 벗어나면 09:30, 10:00으로 맞춘다. */
function TimeInput({ label, value, onChange, invalid, disabled, size }: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly invalid: boolean;
  readonly disabled: boolean;
  readonly size: "sm" | "md";
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      maxLength={5}
      placeholder="00:00"
      aria-label={label}
      aria-invalid={invalid ? true : undefined}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value.replace(/[^\d:]/g, ""))}
      onBlur={(event) => {
        const normalized = normalizeTimeInput(event.target.value);
        if (normalized !== event.target.value) onChange(normalized);
      }}
      className={`num min-w-0 rounded-control border border-border bg-card text-center text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-soft hover:border-muted-soft focus:border-brand focus:ring-2 focus:ring-brand-soft aria-invalid:border-fail aria-invalid:ring-2 aria-invalid:ring-fail-bg disabled:bg-border-soft disabled:text-muted ${
        size === "sm" ? "h-9 w-16 text-sm" : "h-10 w-[4.5rem] text-base md:text-sm"
      }`}
    />
  );
}

type DragMode = "add" | "remove";
type Drag = { readonly anchor: string; readonly current: string; readonly mode: DragMode };

/**
 * 날짜를 누르면 고르거나 빼고, 누른 채 끌면 지나간 날짜를 한꺼번에 고른다. 고른 날짜에서 끌기 시작하면 한꺼번에 뺀다.
 * 마우스·터치는 포인터 이벤트로, 키보드는 버튼 활성화(click detail 0)로 처리한다.
 */
function DateCalendar({ month, minMonth, today, selected, custom, locked, invalid, disabled, onMonthChange, onToggle, onRange }: {
  readonly month: string;
  readonly minMonth: string;
  readonly today: string;
  readonly selected: readonly string[];
  readonly custom: readonly string[];
  readonly locked: readonly string[];
  readonly invalid: boolean;
  readonly disabled: boolean;
  readonly onMonthChange: (month: string) => void;
  readonly onToggle: (date: string) => void;
  readonly onRange: (from: string, to: string, mode: DragMode) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const selectedSet = new Set(selected);
  const customSet = new Set(custom);
  const lockedSet = new Set(locked);
  const preview = drag && drag.anchor !== drag.current ? new Set(datesBetween(drag.anchor, drag.current)) : new Set<string>();
  const navClass = "inline-flex size-10 items-center justify-center rounded-control text-lg text-muted-strong hover:bg-surface disabled:text-muted-soft";

  const dateAt = (x: number, y: number) => {
    const element = document.elementFromPoint(x, y);
    const button = element instanceof HTMLElement ? element.closest<HTMLButtonElement>("button[data-date]") : null;
    return button && !button.disabled && gridRef.current?.contains(button) ? button.dataset.date ?? null : null;
  };

  return (
    <div
      data-invalid={invalid ? "true" : undefined}
      className={`rounded-control border p-3 ${invalid ? "border-fail ring-2 ring-fail-bg" : "border-border"}`}
    >
      <div className="flex items-center justify-between">
        <button type="button" aria-label="이전 달" disabled={month <= minMonth} onClick={() => onMonthChange(shiftMonth(month, -1))} className={navClass}>‹</button>
        <p className="num text-sm font-bold" aria-live="polite">{year}년 {monthNumber}월</p>
        <button type="button" aria-label="다음 달" onClick={() => onMonthChange(shiftMonth(month, 1))} className={navClass}>›</button>
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} aria-hidden="true" className="py-1 text-xs font-semibold text-muted">{weekday}</span>
        ))}
      </div>
      <div
        ref={gridRef}
        className="grid touch-none select-none auto-rows-[2.75rem] grid-cols-7 gap-1 text-center"
        onPointerDown={(event) => {
          if (disabled || event.button !== 0) return;
          const date = dateAt(event.clientX, event.clientY);
          if (!date) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          setDrag({ anchor: date, current: date, mode: selectedSet.has(date) ? "remove" : "add" });
        }}
        onPointerMove={(event) => {
          if (!drag) return;
          const date = dateAt(event.clientX, event.clientY);
          if (date && date !== drag.current) setDrag({ ...drag, current: date });
        }}
        onPointerUp={() => {
          if (!drag) return;
          if (drag.anchor === drag.current) onToggle(drag.anchor);
          else onRange(drag.anchor, drag.current, drag.mode);
          setDrag(null);
        }}
        onPointerCancel={() => setDrag(null)}
      >
        {monthGrid(month).map((date, index) => {
          if (!date) return <span key={`blank-${index}`} aria-hidden="true" />;
          const isSelected = selectedSet.has(date);
          const isPast = date < today;
          const inPreview = preview.has(date) && !isPast;
          const removing = inPreview && drag?.mode === "remove" && isSelected;
          const adding = inPreview && drag?.mode === "add" && !isSelected;
          const tone = lockedSet.has(date)
            ? "bg-muted-strong font-bold text-white"
            : removing
            ? "bg-brand/30 text-white line-through"
            : isSelected
              ? "bg-brand font-bold text-white hover:bg-brand-strong"
              : adding
                ? "bg-brand-soft-strong text-brand"
                : date === today
                  ? "border border-brand-line font-semibold text-brand hover:bg-brand-soft"
                  : "text-foreground hover:bg-brand-soft disabled:text-muted-soft disabled:hover:bg-transparent";
          return (
            <button
              key={date}
              type="button"
              data-date={date}
              aria-pressed={isSelected}
              aria-label={`${formatDate(date)}${lockedSet.has(date) ? " (저장됨)" : customSet.has(date) ? " (개별 시간)" : ""}`}
              aria-current={date === today ? "date" : undefined}
              disabled={disabled || (isPast && !isSelected)}
              onClick={(event) => {
                // 마우스·터치는 포인터 이벤트에서 처리했으므로 키보드로 누른 경우만 다룬다.
                if (event.detail === 0) onToggle(date);
              }}
              className={`num relative rounded-control text-sm transition-colors ${tone}`}
            >
              {Number(date.slice(8))}
              {customSet.has(date) && isSelected ? (
                <span aria-hidden="true" className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white" />
              ) : null}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted">
        드래그로 여러 날 선택
        {locked.length > 0 ? <><span aria-hidden="true"> · </span><span className="inline-block size-2 rounded-sm bg-muted-strong align-middle" /> 저장된 날짜</> : null}
      </p>
    </div>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3" y="7" width="10" height="7" rx="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}
