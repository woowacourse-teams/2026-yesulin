"use client";

import { useState, type FormEvent } from "react";
import { FieldInput, FieldTextarea, PrimaryButton } from "@/components/ui/controls";
import { registerForEvent } from "@/features/events/api";
import { formatKoreaDeadline } from "@/features/events/korea-time";
import {
  emptyRegistrationDraft,
  formatPhoneInput,
  registrationProblem,
  writeOfRegistration,
  type RegistrationDraft,
} from "@/features/events/registration-draft";
import { EVENT_PARTICIPANT_LABELS, type EventParticipantType } from "@/features/events/types";
import { BusinessCardFields } from "./event-registration-actor";
import { RegistrationField, RequiredMark, koreaToday } from "./event-registration-field";

const PARTICIPANT_HINTS: Readonly<Record<EventParticipantType, string>> = {
  ACTOR: "배우·배우 지망생, 관련 학과 학생",
  PRODUCER: "공연 제작사·극단에서 일하는 분",
};

/**
 * 로그인 없이 쓰는 참가 신청서. 참가 구분을 먼저 고르면 이름·휴대폰 칸이 열리고, 공연사 관계자는 소속과 하는 일을,
 * 프로필 명함을 희망한 배우는 명함에 들어갈 정보를 더 적는다.
 */
export function EventRegistrationForm({ eventId, businessCardOpen, businessCardClosesAt, onDone }: {
  readonly eventId: number;
  /** 지금 명함 제작 희망을 받는지. 마감 시각이 지나면 명함 체크 칸 대신 현장 안내를 보인다. */
  readonly businessCardOpen: boolean;
  readonly businessCardClosesAt: string | null;
  readonly onDone: () => void;
}) {
  const [draft, setDraft] = useState<RegistrationDraft>(emptyRegistrationDraft);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = (patch: Partial<RegistrationDraft>) => setDraft((current) => ({ ...current, ...patch }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = registrationProblem(businessCardOpen ? draft : { ...draft, businessCardRequested: false }, koreaToday());
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await registerForEvent(eventId, writeOfRegistration(businessCardOpen ? draft : { ...draft, businessCardRequested: false }));
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "신청을 보내지 못했어요. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 명함 칸이 닫히면 사진 미리 보기도 사라지므로 올린 사진은 버린다. 다시 열면 사진을 새로 올린다.
  const chooseType = (participantType: EventParticipantType) => setDraft((current) => ({
    ...current,
    participantType,
    photoUploadKey: participantType === "ACTOR" ? current.photoUploadKey : null,
  }));
  const chooseCard = (businessCardRequested: boolean) => setDraft((current) => ({
    ...current,
    businessCardRequested,
    photoUploadKey: businessCardRequested ? current.photoUploadKey : null,
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
        {type ? null : <p className="text-sm text-muted">참가 구분을 고르면 적을 칸이 나와요.</p>}
      </fieldset>

      {type ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <RegistrationField id="registration-name" label="이름" required>
              <FieldInput id="registration-name" autoComplete="name" value={draft.name} maxLength={50} onChange={(event) => update({ name: event.target.value })} />
            </RegistrationField>
            <RegistrationField id="registration-phone" label="휴대폰 번호" required hint="참가 확인과 행사 안내 연락에만 써요.">
              <FieldInput id="registration-phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="010-1234-5678" value={draft.phone} onChange={(event) => update({ phone: formatPhoneInput(event.target.value) })} />
            </RegistrationField>
          </div>

          {type === "PRODUCER" ? (
            <div className="flex flex-col gap-2 rounded-control border border-border-soft p-4">
              <RegistrationField id="registration-affiliation" label="소속과 지금 하는 일" required hint="예: 남극장 · 캐스팅과 제작 담당">
                <FieldTextarea id="registration-affiliation" rows={3} value={draft.affiliation} maxLength={500} onChange={(event) => update({ affiliation: event.target.value })} />
              </RegistrationField>
              <p className="text-xs text-muted">공연사 관계자는 프로필 명함을 만들지 않아요.</p>
            </div>
          ) : null}

          {type === "ACTOR" ? (
            <>
              {businessCardOpen ? (
                <div className="rounded-control border border-border-soft p-4">
                  <label className="flex min-h-11 cursor-pointer items-start gap-3">
                    <input type="checkbox" checked={draft.businessCardRequested} onChange={(event) => chooseCard(event.target.checked)} className="mt-1 size-4 shrink-0 accent-brand" />
                    <span>
                      <span className="block font-semibold">프로필 명함 제작을 희망해요</span>
                      <span className="mt-1 block text-sm text-muted-strong">
                        행사 당일 나눠 드릴 내 프로필 명함을 무료로 만들어 드려요. 체크하면 명함에 들어갈 정보를 적는 칸이 열려요.
                      </span>
                      {businessCardClosesAt ? (
                        <span className="mt-1 block text-sm font-semibold text-brand">{formatKoreaDeadline(businessCardClosesAt)}까지 신청한 분께 만들어 드려요.</span>
                      ) : null}
                    </span>
                  </label>
                </div>
              ) : (
                <p className="rounded-control border border-border-soft bg-surface p-4 text-sm text-muted-strong">
                  {businessCardClosesAt ? `프로필 명함 제작 신청은 ${formatKoreaDeadline(businessCardClosesAt)}에 마감됐어요. ` : "프로필 명함 제작 신청은 마감됐어요. "}
                  행사 당일 현장에서 명함 용지에 직접 써서 주고받을 수 있어요.
                </p>
              )}
              {businessCardOpen && draft.businessCardRequested ? (
                <BusinessCardFields
                  eventId={eventId}
                  draft={draft}
                  onChange={update}
                  onPhotoChange={(photoUploadKey) => update({ photoUploadKey })}
                  onPhotoBusyChange={setPhotoBusy}
                />
              ) : null}
            </>
          ) : null}

          <PrivacyConsent checked={draft.privacyAgreed} onChange={(privacyAgreed) => update({ privacyAgreed })} />

          {error ? <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">{error}</p> : null}
          <PrimaryButton type="submit" disabled={submitting || photoBusy} className="w-full sm:w-auto sm:self-end">
            {submitting ? "보내는 중…" : photoBusy ? "사진 올리는 중…" : "신청하기"}
          </PrimaryButton>
        </>
      ) : null}
    </form>
  );
}

function PrivacyConsent({ checked, onChange }: { readonly checked: boolean; readonly onChange: (checked: boolean) => void }) {
  return (
    <div className="rounded-control border border-border-soft bg-surface p-4 text-sm">
      <p className="font-semibold">개인정보 수집·이용 동의<RequiredMark /></p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-strong">
        <li>수집 항목: 이름, 휴대폰 번호, 공연사 관계자는 소속과 하는 일, 명함을 희망한 배우는 이메일·SNS 계정(선택)·생년월일·프로필 사진·활동 분야·경력</li>
        <li>이용 목적: 참가 확인과 행사 안내 연락, 배우 프로필 명함 제작</li>
        <li>명함에 들어갈 정보는 명함 제작 업체에 전달해요. 휴대폰 번호는 전달하지 않아요.</li>
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
