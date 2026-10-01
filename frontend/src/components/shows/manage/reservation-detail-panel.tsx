"use client";

import { useRef, useState } from "react";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { formatShowDateTime } from "@/features/shows/format";
import { changeReservationTicketCount, updateReservationMemo } from "@/features/shows/producer-api";
import {
  MAX_RESERVATION_MEMO_LENGTH,
  MAX_TICKETS_PER_RESERVATION,
  type ProducerReservation,
} from "@/features/shows/types";

type UpdatedKind = "tickets" | "memo";

/**
 * 목록 안에서 펼쳐지는 상세라 기본 컨트롤보다 작게 그린다. 보이는 높이는 32px이지만 가상 요소로
 * 누를 수 있는 영역을 44px까지 넓혀 터치하기 어렵지 않게 한다. 1023px 이하에서 모든 버튼을 44px로 키우는
 * 전역 규칙(`interactions.css`)은 레이어 밖에 있어 `min-h-0!`로만 덮을 수 있다.
 */
const COMPACT_BASE =
  "relative inline-flex h-8 min-h-0! shrink-0 items-center justify-center rounded-control text-xs font-semibold transition-colors before:absolute before:-inset-1.5 before:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none";
const COMPACT_TONE = {
  step: "w-8 border border-border bg-card text-sm text-foreground hover:border-brand-line hover:bg-brand-soft disabled:text-muted-soft",
  primary: "border border-brand bg-brand px-3 text-white hover:bg-brand-strong disabled:border-border disabled:bg-border disabled:text-muted",
  text: "px-2 text-muted-strong hover:bg-border-soft hover:text-foreground disabled:text-muted-soft",
  danger: "border border-fail/40 bg-card px-3 text-fail hover:border-fail/60 hover:bg-fail-bg",
} as const;

function CompactButton({ tone, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { readonly tone: keyof typeof COMPACT_TONE }) {
  return <button type="button" className={`${COMPACT_BASE} ${COMPACT_TONE[tone]} ${className}`} {...props} />;
}

/**
 * 예매 관객 줄을 펼치면 보이는 상세. 전화 응대 중 다른 창을 열지 않고 매수 조정, 메모, 취소를 한곳에서 한다.
 * 매수는 바꿨을 때만 저장 버튼이 나타나고, 메모는 관객에게 보이지 않는 내부 기록이다.
 */
export function ReservationDetailPanel({ reservation, remainingSeats, onUpdated, onCancel }: {
  readonly reservation: ProducerReservation;
  /** 이 회차에 남은 좌석. 목록을 읽은 시점 기준이라 서버가 정원을 다시 확인한다. */
  readonly remainingSeats: number;
  readonly onUpdated: (reservation: ProducerReservation, kind: UpdatedKind) => void;
  readonly onCancel: (reservation: ProducerReservation) => void;
}) {
  const confirmed = reservation.status === "CONFIRMED";
  return (
    <div className="grid gap-4 border-t border-border-soft bg-surface px-4 py-3 text-sm text-foreground @min-[42rem]:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] @min-[42rem]:gap-x-8 @min-[42rem]:pl-[4.25rem] @min-[42rem]:pr-5">
      <div className="flex flex-col gap-3">
        {confirmed ? (
          <TicketCountEditor reservation={reservation} remainingSeats={remainingSeats} onSaved={(updated) => onUpdated(updated, "tickets")} />
        ) : (
          <div>
            <p className="text-xs font-semibold text-muted-strong">매수</p>
            <p className="mt-1.5"><span className="num">{reservation.ticketCount}매</span> · 취소됨</p>
            {reservation.canceledAt ? <p className="num mt-0.5 text-xs text-muted">{formatShowDateTime(reservation.canceledAt)} 취소</p> : null}
          </div>
        )}
        {confirmed ? (
          <CompactButton tone="danger" onClick={() => onCancel(reservation)} className="self-start">예매 취소</CompactButton>
        ) : null}
      </div>
      <MemoEditor reservation={reservation} onSaved={(updated) => onUpdated(updated, "memo")} />
    </div>
  );
}

/**
 * 숫자를 바로 입력하거나 −/+로 조정한다. 늘릴 수 있는 한도는 1회 최대 매수와 (남은 좌석 + 지금 매수) 중 작은 값이다.
 */
function TicketCountEditor({ reservation, remainingSeats, onSaved }: {
  readonly reservation: ProducerReservation;
  readonly remainingSeats: number;
  readonly onSaved: (reservation: ProducerReservation) => void;
}) {
  const [draft, setDraft] = useState(String(reservation.ticketCount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const max = Math.max(reservation.ticketCount, Math.min(MAX_TICKETS_PER_RESERVATION, remainingSeats + reservation.ticketCount));
  const parsed = Number(draft);
  const valid = draft.trim() !== "" && Number.isInteger(parsed) && parsed >= 1 && parsed <= max;
  const base = valid ? parsed : reservation.ticketCount;
  const changed = valid && parsed !== reservation.ticketCount;
  const inputError = !valid && draft.trim() !== "" ? `1~${max}매로 입력해 주세요.` : "";
  const ids = { label: `reservation-${reservation.id}-tickets`, input: `reservation-${reservation.id}-tickets-input`, hint: `reservation-${reservation.id}-tickets-hint` };

  const update = (next: string) => {
    setDraft(next);
    setError("");
  };

  const save = async () => {
    if (!changed || saving) return;
    setSaving(true);
    setError("");
    try {
      onSaved(await changeReservationTicketCount(reservation.id, parsed));
      // 누른 변경 버튼이 사라지므로 입력칸으로 포커스를 돌린다.
      window.setTimeout(() => inputRef.current?.focus());
    } catch (cause) {
      console.error("[예매 매수 변경 실패]", cause);
      setError(cause instanceof AuditionRequestError ? cause.message : "매수를 바꾸지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="group" aria-labelledby={ids.label}>
      <label id={ids.label} htmlFor={ids.input} className="text-xs font-semibold text-muted-strong">매수</label>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        <CompactButton tone="step" aria-label="1매 줄이기" disabled={saving || base <= 1} onClick={() => update(String(base - 1))}>−</CompactButton>
        <input
          ref={inputRef}
          id={ids.input}
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          step={1}
          value={draft}
          readOnly={saving}
          onChange={(event) => update(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") void save(); }}
          aria-invalid={inputError ? true : undefined}
          aria-describedby={ids.hint}
          className={`num h-8 min-h-0! w-12 rounded-control border bg-card px-1 text-center text-sm font-semibold outline-none [appearance:textfield] focus:border-brand focus:ring-2 focus:ring-brand-soft [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${inputError ? "border-fail" : "border-border"}`}
        />
        <CompactButton tone="step" aria-label="1매 늘리기" disabled={saving || base >= max} onClick={() => update(String(base + 1))}>+</CompactButton>
        <span className="ml-0.5 text-xs text-muted">매 · 최대 <span className="num">{max}</span>매</span>
      </div>
      {changed ? (
        <div className="mt-2 flex items-center gap-1">
          <CompactButton tone="primary" onClick={() => void save()} disabled={saving} aria-busy={saving || undefined}>
            {saving ? "바꾸는 중…" : <><span className="num">{reservation.ticketCount}</span>매 → <span className="num">{parsed}</span>매로 변경</>}
          </CompactButton>
          <CompactButton tone="text" onClick={() => update(String(reservation.ticketCount))} disabled={saving}>되돌리기</CompactButton>
        </div>
      ) : null}
      <p id={ids.hint} className={`mt-1.5 text-xs leading-5 ${inputError ? "font-medium text-fail" : "text-muted"}`}>
        {inputError || (max < MAX_TICKETS_PER_RESERVATION
          ? <>남은 좌석이 <span className="num">{remainingSeats}</span>석이에요. 더 늘리려면 회차 정원을 먼저 늘려 주세요.</>
          : changed ? "변경 버튼이나 Enter로 저장해요." : "숫자를 입력하거나 −/+로 조정해 주세요.")}
      </p>
      {error ? <p role="alert" className="mt-1 text-xs font-medium leading-5 text-fail">{error}</p> : null}
    </div>
  );
}

/** 비우고 저장하면 메모를 지운다. 취소된 예매에도 남길 수 있다. */
function MemoEditor({ reservation, onSaved }: {
  readonly reservation: ProducerReservation;
  readonly onSaved: (reservation: ProducerReservation) => void;
}) {
  const [memo, setMemo] = useState(reservation.memo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const unchanged = memo.trim() === reservation.memo;
  const fieldId = `reservation-${reservation.id}-memo`;
  const hintId = `${fieldId}-hint`;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      onSaved(await updateReservationMemo(reservation.id, memo));
    } catch (cause) {
      console.error("[예매 메모 저장 실패]", cause);
      setError(cause instanceof AuditionRequestError ? cause.message : "메모를 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={fieldId} className="text-xs font-semibold text-muted-strong">
          메모 <span className="font-normal text-muted">· 관객에게 보이지 않아요</span>
        </label>
        <span className="num shrink-0 text-xs text-muted">{memo.length} / {MAX_RESERVATION_MEMO_LENGTH}</span>
      </div>
      <textarea
        id={fieldId}
        rows={2}
        maxLength={MAX_RESERVATION_MEMO_LENGTH}
        value={memo}
        onChange={(event) => setMemo(event.target.value)}
        placeholder="예: 휠체어 이용, 입구 경사로 쪽으로 안내 / 7세 아이 동반"
        aria-describedby={hintId}
        className="mt-1.5 block w-full resize-none rounded-control border border-border bg-card px-3 py-2 text-sm leading-6 text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-soft hover:border-muted-soft focus:border-brand focus:ring-2 focus:ring-brand-soft"
      />
      <div className="mt-1.5 flex items-start justify-between gap-3">
        <p id={hintId} className="min-w-0 flex-1 text-xs leading-5 text-muted">
          건강·장애 관련 내용은 응대에 꼭 필요한 만큼만 적어 주세요.
        </p>
        <CompactButton tone="primary" onClick={() => void save()} disabled={saving || unchanged} aria-busy={saving || undefined}>
          {saving ? "저장 중…" : memo.trim() || !reservation.memo ? "메모 저장" : "메모 지우기"}
        </CompactButton>
      </div>
      {error ? <p role="alert" className="mt-1 text-xs font-medium leading-5 text-fail">{error}</p> : null}
    </div>
  );
}
