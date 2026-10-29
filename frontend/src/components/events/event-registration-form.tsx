"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { FieldInput, FieldTextarea, PrimaryButton, TextButton } from "@/components/ui/controls";
import { registerForEvent } from "@/features/events/api";
import { formatKoreaDeadline } from "@/features/events/korea-time";
import {
  businessCardProblem,
  emptyRegistrationDraft,
  formatPhoneInput,
  registrationProblem,
  writeOfRegistration,
  type RegistrationDraft,
} from "@/features/events/registration-draft";
import { EVENT_PARTICIPANT_LABELS, MAX_EVENT_AFFILIATION_LENGTH, MAX_EVENT_CURRENT_WORK_LENGTH, type EventBankAccount, type EventParticipantType, type EventRegistrationWrite } from "@/features/events/types";
import { EventBusinessCardEditor } from "./event-business-card-editor";
import { EventBusinessCardPreview, type CardPreviewSide } from "./event-business-card-preview";
import { EventRegistrationConfirmation } from "./event-registration-confirmation";
import { RegistrationField, RequiredMark, koreaToday } from "./event-registration-field";

const PARTICIPANT_HINTS: Readonly<Record<EventParticipantType, string>> = {
  ACTOR: "배우·배우 지망생, 관련 학과 학생",
  PRODUCER: "공연 제작사·극단 등에서 일하는 분",
};

/**
 * 로그인 없이 쓰는 참가 신청서. 참가 구분을 먼저 고르면 이름·휴대폰 칸이 열리고, 공연사 관계자는 소속과 지금 하는 일을,
 * 프로필 명함을 희망한 배우는 명함에 들어갈 정보를 더 적는다.
 */
export function EventRegistrationForm({ eventId, businessCardOpen, businessCardClosesAt, registrationConfirmationEnabled, registrationConfirmationMessage, registrationBankAccount, onDone }: {
  readonly eventId: number;
  /** 지금 명함 제작 희망을 받는지. 마감 시각이 지나면 명함 체크 칸 대신 현장 안내를 보인다. */
  readonly businessCardOpen: boolean;
  readonly businessCardClosesAt: string | null;
  readonly registrationConfirmationEnabled: boolean;
  readonly registrationConfirmationMessage: string | null;
  readonly registrationBankAccount?: EventBankAccount | null;
  readonly onDone: () => void;
}) {
  const [draft, setDraft] = useState<RegistrationDraft>(emptyRegistrationDraft);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [cardEditorOpen, setCardEditorOpen] = useState(false);
  const [cardEditorError, setCardEditorError] = useState<string | null>(null);
  const [cardSide, setCardSide] = useState<CardPreviewSide>("front");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<EventRegistrationWrite | null>(null);
  const sending = useRef(false);
  const update = (patch: Partial<RegistrationDraft>) => setDraft((current) => ({ ...current, ...patch }));
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  const send = async (write: EventRegistrationWrite) => {
    if (sending.current) return;
    sending.current = true;
    setSubmitting(true);
    setError(null);
    try {
      await registerForEvent(eventId, write);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "신청을 보내지 못했습니다. 다시 시도해 주십시오.");
    } finally {
      sending.current = false;
      setPending(null);
      setSubmitting(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending.current || photoBusy || pending || cardEditorOpen) return;
    const current = businessCardOpen ? draft : { ...draft, businessCardRequested: false };
    const problem = registrationProblem(current, koreaToday());
    if (problem) {
      if (current.participantType === "ACTOR" && current.businessCardRequested && current.name.trim() && businessCardProblem(current, koreaToday()) === problem) {
        setCardEditorError(problem);
        setCardEditorOpen(true);
      }
      setError(problem);
      return;
    }
    setError(null);
    const write = writeOfRegistration(current);
    if (registrationConfirmationEnabled && registrationConfirmationMessage?.trim()) {
      setPending(write);
      return;
    }
    await send(write);
  };

  // 명함 제작을 취소하거나 공연사 관계자로 바꾸면 명함 사진도 해제한다. 모달을 닫을 때는 유지한다.
  const clearPhoto = () => { setPhotoUrl(null); setPhotoBusy(false); };
  const chooseType = (participantType: EventParticipantType) => {
    if (participantType !== "ACTOR") { clearPhoto(); setCardEditorOpen(false); }
    setDraft((current) => ({ ...current, participantType, photoUploadKey: participantType === "ACTOR" ? current.photoUploadKey : null }));
  };
  const chooseCard = (businessCardRequested: boolean) => {
    if (!businessCardRequested) { clearPhoto(); setCardEditorOpen(false); }
    setDraft((current) => ({ ...current, businessCardRequested, photoUploadKey: businessCardRequested ? current.photoUploadKey : null }));
  };
  const editCard = () => { chooseCard(true); setCardEditorError(null); setCardEditorOpen(true); };
  const finishCard = () => {
    const problem = !draft.name.trim() ? "명함에 들어갈 이름을 입력해 주세요." : businessCardProblem(draft, koreaToday());
    setCardEditorError(problem);
    if (!problem) setCardEditorOpen(false);
  };
  const cardComplete = draft.name.trim() && !businessCardProblem(draft, koreaToday());
  const cardPreview = <EventBusinessCardPreview draft={draft} photoUrl={photoUrl} side={cardSide} onSideChange={setCardSide} />;

  const type = draft.participantType;
  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8">
      <fieldset className="flex flex-col gap-2" aria-describedby="registration-participant-guide registration-participant-hint">
        <legend className="mb-2 text-sm font-semibold">참가 구분<RequiredMark /></legend>
        <div className="event-participant-options">
          {(["ACTOR", "PRODUCER"] as const).map((option) => (
            <label key={option} className="event-participant-option">
              <input type="radio" name="participant-type" value={option} checked={type === option} onChange={() => chooseType(option)} aria-label={`${EVENT_PARTICIPANT_LABELS[option]} ${PARTICIPANT_HINTS[option]}`} className="sr-only" />
              <span>{EVENT_PARTICIPANT_LABELS[option]}</span>
            </label>
          ))}
        </div>
        <p id="registration-participant-guide" className="mt-1 text-sm font-medium leading-6 text-foreground">일반 참가자도 ‘배우’를 선택해 주세요. 명함 제작은 선택 사항입니다.</p>
        <p id="registration-participant-hint" className="mt-1 text-sm text-muted-strong">{type ? PARTICIPANT_HINTS[type] : "참가 구분을 선택하면 입력 칸이 열립니다."}</p>
      </fieldset>

      {type ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <RegistrationField id="registration-name" label="이름" required>
              <FieldInput id="registration-name" autoComplete="name" value={draft.name} maxLength={50} onFocus={() => setCardSide("front")} onChange={(event) => update({ name: event.target.value })} />
            </RegistrationField>
            <RegistrationField id="registration-phone" label="휴대폰 번호" required hint="참가 확인과 행사 안내 연락에만 사용합니다.">
              <FieldInput id="registration-phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-1234-5678" value={draft.phone} onChange={(event) => update({ phone: formatPhoneInput(event.target.value) })} />
            </RegistrationField>
          </div>

          {type === "PRODUCER" ? (
            <div className="flex flex-col gap-2 rounded-control border border-border-soft p-4">
              <RegistrationField id="registration-affiliation" label="소속" required hint="예: 남극장">
                <FieldInput id="registration-affiliation" autoComplete="organization" value={draft.affiliation} maxLength={MAX_EVENT_AFFILIATION_LENGTH} onChange={(event) => update({ affiliation: event.target.value })} />
              </RegistrationField>
              <RegistrationField id="registration-current-work" label="지금 하고 계신 일" required hint="예: 캐스팅과 제작 담당">
                <FieldTextarea id="registration-current-work" rows={3} value={draft.currentWork} maxLength={MAX_EVENT_CURRENT_WORK_LENGTH} onChange={(event) => update({ currentWork: event.target.value })} />
              </RegistrationField>
              <p className="text-xs text-muted">공연사 관계자는 프로필 명함을 제작하지 않습니다.</p>
            </div>
          ) : null}

          {type === "ACTOR" ? (
            <>
              {businessCardOpen ? (
                <section aria-labelledby="business-card-intro" className="overflow-hidden rounded-control border border-brand-line">
                  <div className="grid items-center gap-6 bg-brand-soft/50 p-5 lg:grid-cols-2 lg:p-6">
                    <div>
                      <p className="text-sm font-semibold text-brand">참가 배우를 위한 특별 혜택</p>
                      <h2 id="business-card-intro" className="mt-3 text-2xl font-bold leading-tight sm:text-[30px]"><span className="text-brand">무료</span> 프로필 명함<br />제작 이벤트</h2>
                      <p className="mt-4 text-base font-semibold leading-7">나를 소개하는 명함, 무료로 준비해 드려요.</p>
                      <p className="mt-2 text-sm leading-6 text-muted-strong">사진과 연락처, 활동 분야와 경력을 담아 만들어 드립니다. 행사 당일 공연사 관계자와 다른 배우에게 나눠 주며 나를 소개해 보세요.</p>
                      <p className="mt-2 text-xs leading-5 text-muted-strong">앞면에는 사진·이름·생년월일·이메일·SNS, 뒷면에는 활동 분야·경력이 들어갑니다. 휴대폰 번호는 넣지 않습니다.</p>
                      {businessCardClosesAt ? <p className="mt-3 text-sm font-semibold text-brand">{formatKoreaDeadline(businessCardClosesAt)}까지 신청해 주세요.</p> : null}
                    </div>
                    <figure className="mx-auto w-full max-w-[320px]">
                      <Image src="/images/events/profile-card-example-v3.png" alt="프로필 명함 앞·뒷면 제작 예시. 앞면은 사진이 여백 없이 배경으로 부드럽게 이어지고, 뒷면에는 활동 분야·경력과 오른쪽 위 예술in 로고, 아래 예시 QR이 들어갑니다." width={1122} height={1402} sizes="(max-width: 640px) 80vw, 320px" className="h-auto w-full rounded-control" />
                      <figcaption className="mt-2 text-center text-xs leading-5 text-muted-strong">명함 제작 예시 · 가상 인물과 예시 QR입니다.<br />실제 제작 디자인은 달라질 수 있습니다.</figcaption>
                    </figure>
                  </div>
                  <div className="border-t border-border-soft p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <PrimaryButton onClick={editCard} aria-haspopup="dialog">{draft.businessCardRequested ? "명함 정보 수정" : "무료 명함 만들기"}</PrimaryButton>
                      {draft.businessCardRequested ? <TextButton onClick={() => chooseCard(false)}>명함 제작 취소</TextButton> : null}
                    </div>
                    {draft.businessCardRequested ? (
                      <p className="mt-3 text-sm text-muted-strong" role="status">{cardComplete ? "명함 정보 입력 완료 · 행사 신청 시 함께 접수됩니다." : "명함 정보를 작성 중입니다. 명함 정보 수정을 눌러 이어서 작성해 주세요."}</p>
                    ) : <p className="mt-3 text-xs text-muted-strong">선택 혜택입니다. 명함 제작을 신청하지 않아도 행사에 참가할 수 있습니다.</p>}
                  </div>
                </section>
              ) : (
                <p className="rounded-control border border-border-soft bg-surface p-4 text-sm text-muted-strong">
                  {businessCardClosesAt ? `프로필 명함 제작 신청은 ${formatKoreaDeadline(businessCardClosesAt)}에 마감되었습니다. ` : "프로필 명함 제작 신청은 마감되었습니다. "}
                  행사 당일 현장에서 명함 용지에 직접 작성해 교환할 수 있습니다.
                </p>
              )}
            </>
          ) : null}

          {error ? <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">{error}</p> : null}
          <div className="flex flex-col gap-4 border-t border-border-soft pt-5 sm:flex-row sm:items-start sm:justify-between">
            <PrivacyConsent checked={draft.privacyAgreed} onChange={(privacyAgreed) => update({ privacyAgreed })} />
            <PrimaryButton type="submit" disabled={submitting || photoBusy} className="w-full shrink-0 sm:w-auto">
              {submitting ? "보내는 중…" : photoBusy ? "사진 올리는 중…" : "신청하기"}
            </PrimaryButton>
          </div>
        </>
      ) : null}
      <EventBusinessCardEditor
        open={cardEditorOpen && draft.participantType === "ACTOR" && businessCardOpen}
        eventId={eventId} draft={draft} preview={cardPreview} photoUrl={photoUrl} busy={photoBusy} error={cardEditorError}
        onChange={(patch) => { update(patch); setCardEditorError(null); }} onPreviewSideChange={setCardSide}
        onPhotoChange={(photoUploadKey, photo) => { update({ photoUploadKey }); setPhotoUrl(URL.createObjectURL(photo)); setCardSide("front"); setCardEditorError(null); }}
        onPhotoBusyChange={setPhotoBusy} onClose={() => setCardEditorOpen(false)} onDone={finishCard}
      />
      <EventRegistrationConfirmation
        open={pending !== null}
        message={registrationConfirmationMessage ?? ""}
        bankAccount={registrationBankAccount}
        busy={submitting}
        onClose={() => setPending(null)}
        onConfirm={() => { if (pending) void send(pending); }}
      />
    </form>
  );
}

function PrivacyConsent({ checked, onChange }: { readonly checked: boolean; readonly onChange: (checked: boolean) => void }) {
  return (
    <div className="min-w-0 flex-1 text-sm">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 shrink-0 accent-brand" />
        <span>개인정보 수집·이용에 동의합니다<RequiredMark /></span>
      </label>
      <details className="mt-1">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-muted-strong underline underline-offset-4">수집 항목·이용 목적 등 상세 보기</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-strong">
          <li>수집 항목: 이름, 휴대폰 번호, 공연사 관계자는 소속·지금 하는 일, 명함을 희망한 배우는 이메일·SNS 유형·계정명(선택)·생년월일·프로필 사진·활동 분야·경력</li>
          <li>이용 목적: 참가 확인과 행사 안내 연락, 배우 프로필 명함 제작</li>
          <li>명함에 들어갈 정보는 명함 제작 업체에 전달합니다. 휴대폰 번호는 전달하지 않습니다.</li>
          <li>보관 기간: 행사 종료 후 15일 이내 파기합니다.</li>
          <li>동의를 거부할 수 있으나, 이 경우 참가 신청을 할 수 없습니다.</li>
        </ul>
      </details>
    </div>
  );
}
