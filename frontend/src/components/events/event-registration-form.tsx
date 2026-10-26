"use client";

import { useState, type FormEvent } from "react";
import { FieldInput, FieldTextarea, PrimaryButton } from "@/components/ui/controls";
import { registerForEvent } from "@/features/events/api";
import {
  emptyRegistrationDraft,
  formatPhoneInput,
  registrationProblem,
  writeOfRegistration,
  type RegistrationDraft,
} from "@/features/events/registration-draft";
import { EVENT_PARTICIPANT_LABELS, type EventParticipantType } from "@/features/events/types";
import { ActorProfileFields } from "./event-registration-actor";
import { RegistrationField, RequiredMark, koreaToday } from "./event-registration-field";

const PARTICIPANT_HINTS: Readonly<Record<EventParticipantType, string>> = {
  ACTOR: "배우·배우 지망생, 관련 학과 학생",
  PRODUCER: "공연 제작사·극단에서 일하는 분",
};

/**
 * 로그인 없이 쓰는 참가 신청서. 배우는 생년월일·프로필 사진·활동 분야·경력을, 공연사 관계자는 소속과 하는 일을 적는다.
 */
export function EventRegistrationForm({ eventId, onDone }: { readonly eventId: number; readonly onDone: () => void }) {
  const [draft, setDraft] = useState<RegistrationDraft>(emptyRegistrationDraft);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = (patch: Partial<RegistrationDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = registrationProblem(draft, koreaToday());
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await registerForEvent(eventId, writeOfRegistration(draft));
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "신청을 보내지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 배우에서 다른 구분으로 바꾸면 올린 사진은 버린다. 다시 배우로 오면 사진을 새로 올린다.
  const chooseType = (option: EventParticipantType) => setDraft((current) => ({
    ...current,
    participantType: option,
    photoUploadKey: option === "ACTOR" ? current.photoUploadKey : null,
  }));

  const type = draft.participantType;
  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-6 px-5 py-6 sm:px-8 sm:py-8">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">참가 구분<RequiredMark /></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(["ACTOR", "PRODUCER"] as const).map((option) => (
            <label key={option} className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-control border p-4 ${type === option ? "border-brand bg-brand-soft" : "border-border bg-card hover:border-brand-line"}`}>
              <input type="radio" name="participant-type" checked={type === option} onChange={() => chooseType(option)} className="mt-1 size-4 accent-brand" />
              <span>
                <span className="block font-semibold">{EVENT_PARTICIPANT_LABELS[option]}</span>
                <span className="block text-sm text-muted-strong">{PARTICIPANT_HINTS[option]}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <RegistrationField id="registration-name" label="이름" required>
          <FieldInput id="registration-name" autoComplete="name" value={draft.name} maxLength={50} onChange={(event) => update({ name: event.target.value })} />
        </RegistrationField>
        <RegistrationField id="registration-phone" label="휴대폰 번호" required>
          <FieldInput id="registration-phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-1234-5678" value={draft.phone} onChange={(event) => update({ phone: formatPhoneInput(event.target.value) })} />
        </RegistrationField>
        <RegistrationField id="registration-email" label="이메일" required>
          <FieldInput id="registration-email" type="email" inputMode="email" autoComplete="email" value={draft.email} maxLength={254} onChange={(event) => update({ email: event.target.value })} />
        </RegistrationField>
        <RegistrationField id="registration-sns" label="SNS 계정" hint="인스타그램 등. 예: @yesulin">
          <FieldInput id="registration-sns" value={draft.snsHandle} maxLength={100} onChange={(event) => update({ snsHandle: event.target.value })} />
        </RegistrationField>
      </div>

      {type === "ACTOR" ? (
        <ActorProfileFields
          eventId={eventId}
          draft={draft}
          onChange={update}
          onPhotoChange={(photoUploadKey) => update({ photoUploadKey })}
          onPhotoBusyChange={setPhotoBusy}
        />
      ) : null}

      {type === "PRODUCER" ? (
        <div className="flex flex-col gap-2 rounded-control border border-border-soft p-4">
          <RegistrationField id="registration-affiliation" label="소속과 지금 하는 일" required hint="예: 남극장 · 캐스팅과 제작 담당">
            <FieldTextarea id="registration-affiliation" rows={3} value={draft.affiliation} maxLength={500} onChange={(event) => update({ affiliation: event.target.value })} />
          </RegistrationField>
          <p className="text-xs text-muted">공연사 관계자는 프로필 명함을 만들지 않아요. 그래서 생년월일·사진·경력은 받지 않아요.</p>
        </div>
      ) : null}

      <PrivacyConsent checked={draft.privacyAgreed} onChange={(privacyAgreed) => update({ privacyAgreed })} />

      {error ? <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">{error}</p> : null}
      <PrimaryButton type="submit" disabled={submitting || photoBusy} className="w-full sm:w-auto sm:self-end">
        {submitting ? "보내는 중…" : photoBusy ? "사진 올리는 중…" : "신청하기"}
      </PrimaryButton>
    </form>
  );
}

function PrivacyConsent({ checked, onChange }: { readonly checked: boolean; readonly onChange: (checked: boolean) => void }) {
  return (
    <div className="rounded-control border border-border-soft bg-surface p-4 text-sm">
      <p className="font-semibold">개인정보 수집·이용 동의<RequiredMark /></p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-strong">
        <li>수집 항목: 이름, 휴대폰 번호, 이메일, SNS 계정(선택), 배우는 생년월일·프로필 사진·활동 분야·경력, 공연사 관계자는 소속과 하는 일</li>
        <li>이용 목적: 참가 확인과 행사 안내 연락, 배우 프로필 명함 제작</li>
        <li>명함 제작 대상 배우의 명함에 들어갈 정보는 명함 제작 업체에 전달해요.</li>
        <li>보관 기간: 행사가 끝나고 15일 안에 파기해요.</li>
        <li>동의하지 않을 수 있지만, 그러면 참가 신청을 할 수 없어요.</li>
      </ul>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 font-semibold">
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-4 accent-brand" />
        위 내용에 동의해요
      </label>
    </div>
  );
}
