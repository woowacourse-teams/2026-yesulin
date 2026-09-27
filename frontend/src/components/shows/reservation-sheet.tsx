"use client";

import { useState } from "react";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { FieldInput, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { formatPhoneNumber, usePhoneInput } from "@/features/applications/phone-number";
import { createReservation } from "@/features/shows/api";
import { formatShowFullDateTime, sessionAvailability } from "@/features/shows/format";
import {
  RESERVATION_ERROR_CODES,
  type PublicShow,
  type PublicShowSession,
  type ReservationReceipt,
} from "@/features/shows/types";
import { validateReservationField, type ReservationField, type ReservationValues } from "@/features/shows/reservation-form";
import { SessionAvailabilityText } from "./show-status";
import { useModalClose } from "./use-modal-close";

const TITLE_ID = "show-reservation-title";
const EMPTY_VALUES: ReservationValues = { bookerName: "", bookerPhone: "", privacyAgreed: false };
const FIELDS: readonly ReservationField[] = ["bookerName", "bookerPhone", "privacyAgreed"];

/** 서버가 돌려준 코드별로 다음 행동을 알려 준다. 좌석·마감이 바뀐 경우에는 공연 정보를 다시 읽는다. */
const STALE_CODES = new Set<string>([
  RESERVATION_ERROR_CODES.notEnoughSeats,
  RESERVATION_ERROR_CODES.bookingClosed,
  RESERVATION_ERROR_CODES.showNotOpen,
  RESERVATION_ERROR_CODES.sessionNotFound,
]);

export function ReservationSheet({ open, show, session, onClose, onReserved, onStale }: {
  readonly open: boolean;
  readonly show: PublicShow;
  readonly session: PublicShowSession;
  readonly onClose: () => void;
  readonly onReserved: (receipt: ReservationReceipt) => void;
  readonly onStale: () => Promise<void>;
}) {
  const [values, setValues] = useState<ReservationValues>(EMPTY_VALUES);
  const [ticketCount, setTicketCount] = useState(1);
  const [errors, setErrors] = useState<Partial<Record<ReservationField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const onPhoneChange = usePhoneInput(formatPhoneNumber);

  const maxTickets = Math.min(show.maxTicketsPerReservation, session.remainingSeats);
  const count = Math.max(1, Math.min(ticketCount, maxTickets));
  const reservable = session.bookable && maxTickets > 0;

  const update = <Key extends ReservationField>(field: Key, value: ReservationValues[Key]) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: validateReservationField(field, { ...values, [field]: value }) ?? undefined }));
  };
  const validateOnBlur = (field: ReservationField) => {
    setErrors((current) => ({ ...current, [field]: validateReservationField(field, values) ?? undefined }));
  };
  const close = useModalClose(onClose, submitting);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = Object.fromEntries(FIELDS.map((field) => [field, validateReservationField(field, values) ?? undefined]));
    setErrors(nextErrors);
    const firstInvalid = FIELDS.find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const receipt = await createReservation(show.id, session.id, { ...values, ticketCount: count });
      onReserved(receipt);
    } catch (cause) {
      const code = cause instanceof AuditionRequestError ? cause.code : null;
      setFormError(reservationErrorMessage(cause, show.inquiryPhone));
      if (code && STALE_CODES.has(code)) await onStale();
      if (!(cause instanceof AuditionRequestError) || cause.status >= 500) console.error("[공연 예매 실패]", cause);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={close}
      labelledBy={TITLE_ID}
      placement="responsiveSheet"
      className="flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-modal border border-border bg-card shadow-[var(--shadow-modal)] md:w-[min(520px,calc(100vw-40px))] md:rounded-modal"
    >
      <DialogHeader id={TITLE_ID} title="예매 정보 입력" subtitle={show.title} />
      <form noValidate onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-surface px-4 py-3">
            <strong className="num text-sm">{formatShowFullDateTime(session.startsAt)}</strong>
            <SessionAvailabilityText availability={sessionAvailability(session)} />
          </div>

          <div className="mt-6 grid gap-5">
            <TextField
              field="bookerName"
              label="예매자 이름"
              value={values.bookerName}
              error={errors.bookerName}
              inputProps={{ autoComplete: "name", maxLength: 50, placeholder: "홍길동" }}
              onChange={(value) => update("bookerName", value)}
              onBlur={() => validateOnBlur("bookerName")}
            />
            <TextField
              field="bookerPhone"
              label="휴대폰 번호"
              value={values.bookerPhone}
              error={errors.bookerPhone}
              hint="예매 확인과 공연 안내 연락에 사용해요."
              inputProps={{ type: "tel", inputMode: "numeric", autoComplete: "tel", maxLength: 13, placeholder: "010-1234-5678" }}
              onChange={(value, event) => event ? onPhoneChange(event, (next) => update("bookerPhone", next)) : update("bookerPhone", value)}
              onBlur={() => validateOnBlur("bookerPhone")}
            />
            <TicketCountField count={count} max={maxTickets} disabled={!reservable} onChange={setTicketCount} />
            <p className="-mt-2 text-sm leading-6 text-muted-strong">
              {show.maxTicketsPerReservation + 1}명 이상 단체 관람은 <a href={`tel:${show.inquiryPhone.replaceAll("-", "")}`} className="num whitespace-nowrap font-semibold text-brand underline-offset-2 hover:underline">{show.inquiryPhone}</a>로 문의해 주세요.
            </p>
            <PrivacyConsent checked={values.privacyAgreed} error={errors.privacyAgreed} onChange={(checked) => update("privacyAgreed", checked)} />
          </div>

          {formError ? (
            <p role="alert" className="mt-5 rounded-control border border-fail/20 bg-fail-bg px-4 py-3 text-sm font-medium leading-6 text-fail">{formError}</p>
          ) : null}
          {!reservable && !formError ? (
            <p role="status" className="mt-5 rounded-control border border-border bg-surface px-4 py-3 text-sm leading-6 text-muted-strong">이 회차는 지금 예매할 수 없어요. 다른 회차를 선택해 주세요.</p>
          ) : null}
        </div>
        <DialogFooter>
          <SecondaryButton type="button" onClick={close} disabled={submitting}>닫기</SecondaryButton>
          <PrimaryButton type="submit" disabled={!reservable || submitting} aria-busy={submitting || undefined}>
            {submitting ? "예매하는 중…" : `${count}매 예매하기`}
          </PrimaryButton>
        </DialogFooter>
      </form>
    </ModalShell>
  );
}

function fieldId(field: ReservationField) {
  return `show-reservation-${field}`;
}

function TextField({ field, label, value, error, hint, inputProps, onChange, onBlur }: {
  readonly field: ReservationField;
  readonly label: string;
  readonly value: string;
  readonly error?: string;
  readonly hint?: string;
  readonly inputProps: React.InputHTMLAttributes<HTMLInputElement>;
  readonly onChange: (value: string, event?: React.ChangeEvent<HTMLInputElement>) => void;
  readonly onBlur: () => void;
}) {
  const id = fieldId(field);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-foreground">{label}</label>
      <FieldInput
        id={id}
        name={field}
        required
        value={value}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        onChange={(event) => onChange(event.target.value, event)}
        onBlur={onBlur}
        className={error ? "border-fail focus:border-fail focus:ring-fail-bg" : ""}
        {...inputProps}
      />
      {hint ? <p id={hintId} className="mt-2 text-xs leading-5 text-muted">{hint}</p> : null}
      {error ? <p id={errorId} role="alert" className="mt-2 text-sm font-medium leading-6 text-fail">{error}</p> : null}
    </div>
  );
}

function TicketCountField({ count, max, disabled, onChange }: {
  readonly count: number;
  readonly max: number;
  readonly disabled: boolean;
  readonly onChange: (count: number) => void;
}) {
  const stepClass = "h-11 w-11 shrink-0 px-0 text-lg";
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-foreground">매수</legend>
      <div className="flex items-center gap-3">
        <SecondaryButton type="button" aria-label="1매 줄이기" disabled={disabled || count <= 1} onClick={() => onChange(count - 1)} className={stepClass}>−</SecondaryButton>
        <output aria-live="polite" className="num min-w-12 text-center text-lg font-bold">{count}매</output>
        <SecondaryButton type="button" aria-label="1매 늘리기" disabled={disabled || count >= max} onClick={() => onChange(count + 1)} className={stepClass}>+</SecondaryButton>
        <span className="num text-xs text-muted">{max > 0 ? `최대 ${max}매` : "예매 불가"}</span>
      </div>
    </fieldset>
  );
}

function PrivacyConsent({ checked, error, onChange }: {
  readonly checked: boolean;
  readonly error?: string;
  readonly onChange: (checked: boolean) => void;
}) {
  const id = fieldId("privacyAgreed");
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`rounded-card border px-4 py-3 ${error ? "border-fail/40" : "border-border"}`}>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={errorId}
          onChange={(event) => onChange(event.target.checked)}
          className="h-5 w-5 shrink-0 accent-brand"
        />
        <span className="text-sm font-semibold">[필수] 개인정보 수집·이용에 동의합니다</span>
      </label>
      <details className="mt-1 text-sm text-muted-strong">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-medium text-muted-strong">내용 보기</summary>
        <dl className="mt-1 grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-2 pb-2 leading-6">
          <dt className="text-muted">수집 항목</dt><dd>이름, 휴대폰 번호</dd>
          <dt className="text-muted">이용 목적</dt><dd>예매 확인, 공연 관련 안내와 취소 연락</dd>
          {/* 보유 기간은 정책 미결정(U5) 상태의 임시 문구다. 확정되면 서버 동의 문서 버전과 함께 바꾼다. */}
          <dt className="text-muted">보유 기간</dt><dd>공연 종료 후 지체 없이 파기</dd>
        </dl>
        <p className="pb-1 text-xs leading-5 text-muted">동의하지 않으면 예매할 수 없어요.</p>
      </details>
      {error ? <p id={errorId} role="alert" className="mt-1 text-sm font-medium leading-6 text-fail">{error}</p> : null}
    </div>
  );
}

function reservationErrorMessage(cause: unknown, inquiryPhone: string) {
  if (!(cause instanceof AuditionRequestError)) return "예매 요청을 보내지 못했어요. 네트워크 연결을 확인하고 다시 시도해 주세요.";
  switch (cause.code) {
    case RESERVATION_ERROR_CODES.notEnoughSeats:
      return `${cause.message} 매수를 줄여 다시 시도해 주세요.`;
    case RESERVATION_ERROR_CODES.duplicate:
      return `이 휴대폰 번호로 이미 예매한 회차예요. 예매 내용 확인이나 변경은 ${inquiryPhone}로 문의해 주세요.`;
    case RESERVATION_ERROR_CODES.bookingClosed:
    case RESERVATION_ERROR_CODES.showNotOpen:
      return "예매가 마감됐어요. 다른 회차를 확인해 주세요.";
    case RESERVATION_ERROR_CODES.sessionNotFound:
    case RESERVATION_ERROR_CODES.showNotFound:
      return "회차 정보가 바뀌었어요. 회차를 다시 선택해 주세요.";
    case RESERVATION_ERROR_CODES.invalidInput:
      return cause.message;
    default:
      // 형식 검증(INVALID_REQUEST)은 서버가 항목별 사유를 메시지로 준다.
      return cause.status === 400 ? cause.message : "예매를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
}
