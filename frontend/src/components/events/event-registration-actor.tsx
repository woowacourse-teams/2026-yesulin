"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AddButton, FieldInput, FieldSelect, SecondaryButton, TextButton } from "@/components/ui/controls";
import { shrinkPhoto } from "@/features/companies/photo-image";
import { uploadEventRegistrationPhoto } from "@/features/events/api";
import { careerYears, emptyCareer, toggleActivityField, type CareerDraft, type RegistrationDraft } from "@/features/events/registration-draft";
import { EVENT_ACTIVITY_FIELDS, EVENT_ACTIVITY_LABELS, MAX_REGISTRATION_CAREERS } from "@/features/events/types";
import { BirthDateField } from "./event-registration-birth-date";
import { RegistrationField, RequiredMark, koreaToday } from "./event-registration-field";

type CardDraft = Pick<RegistrationDraft, "email" | "snsHandle" | "birthDate" | "activityFields" | "otherActivity" | "noCareer" | "careers">;

const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));

/** 명함 제작을 희망한 배우만 적는 칸. 여기 적은 정보는 프로필 명함에 그대로 들어간다(휴대폰 번호는 넣지 않는다). */
export function BusinessCardFields({ eventId, draft, onChange, onPhotoChange, onPhotoBusyChange }: {
  readonly eventId: number;
  readonly draft: CardDraft;
  readonly onChange: (patch: Partial<CardDraft>) => void;
  readonly onPhotoChange: (uploadKey: string | null) => void;
  readonly onPhotoBusyChange: (busy: boolean) => void;
}) {
  return (
    <section aria-labelledby="registration-card-title" className="flex flex-col gap-5 rounded-control border border-brand-line bg-brand-soft/40 p-4">
      <div>
        <h2 id="registration-card-title" className="text-sm font-bold text-brand">프로필 명함에 들어갈 정보</h2>
        <p className="mt-1 text-xs text-muted-strong">아래 정보가 명함에 그대로 들어갑니다. 휴대폰 번호는 명함에 넣지 않습니다.</p>
      </div>
      <RegistrationField id="registration-email" label="이메일" required>
        <FieldInput id="registration-email" type="email" inputMode="email" autoComplete="email" value={draft.email} maxLength={254} onChange={(event) => onChange({ email: event.target.value })} />
      </RegistrationField>
      <RegistrationField id="registration-sns" label="SNS 계정" hint="예: @yesulin">
        <FieldInput id="registration-sns" value={draft.snsHandle} maxLength={100} onChange={(event) => onChange({ snsHandle: event.target.value })} />
      </RegistrationField>
      <BirthDateField value={draft.birthDate} today={koreaToday()} onChange={(birthDate) => onChange({ birthDate })} />
      <PhotoField eventId={eventId} onBusyChange={onPhotoBusyChange} onChange={onPhotoChange} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">활동 분야<RequiredMark /></legend>
        <p className="text-xs text-muted">중복 선택 가능합니다.</p>
        <div className="flex flex-wrap gap-2">
          {EVENT_ACTIVITY_FIELDS.map((field) => {
            const checked = draft.activityFields.includes(field);
            return (
              <label key={field} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-3 text-sm font-semibold ${checked ? "border-brand bg-brand-soft text-brand" : "border-border bg-card"}`}>
                <input type="checkbox" checked={checked} onChange={() => onChange({ activityFields: toggleActivityField(draft.activityFields, field, EVENT_ACTIVITY_FIELDS) })} className="size-4 accent-brand" />
                {EVENT_ACTIVITY_LABELS[field]}
              </label>
            );
          })}
        </div>
        {draft.activityFields.includes("OTHER") ? (
          <FieldInput aria-label="기타 분야" placeholder="예: 성우, 무용" value={draft.otherActivity} maxLength={50} onChange={(event) => onChange({ otherActivity: event.target.value })} />
        ) : null}
      </fieldset>

      <CareersField noCareer={draft.noCareer} careers={draft.careers} onChange={onChange} />
    </section>
  );
}

/** 경력을 + 버튼으로 한 줄씩 더한다. 시기는 연도와 월을 골라 휴대폰에서도 비어 보이지 않게 한다. 신입이면 경력 없음을 체크한다. */
function CareersField({ noCareer, careers, onChange }: {
  readonly noCareer: boolean;
  readonly careers: readonly CareerDraft[];
  readonly onChange: (patch: Partial<CardDraft>) => void;
}) {
  const update = (key: number, patch: Partial<CareerDraft>) =>
    onChange({ careers: careers.map((career) => career.key === key ? { ...career, ...patch } : career) });
  const nextKey = Math.max(0, ...careers.map((career) => career.key)) + 1;
  const years = careerYears(koreaToday());

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">경력<RequiredMark /></legend>
      <p className="text-xs text-muted">시기·작품·역할을 한 줄씩 적습니다. 신입은 &quot;경력 없음&quot;을 체크합니다.</p>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={noCareer} onChange={(event) => onChange({ noCareer: event.target.checked })} className="size-4 accent-brand" />
        경력 없음 (신입)
      </label>
      {noCareer ? null : (
        <>
          <ol className="flex flex-col gap-2">
            {careers.map((career, index) => (
              <li key={career.key} className="flex flex-col gap-2 rounded-control border border-border-soft bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-strong">경력 {index + 1}</span>
                  <TextButton aria-label={`경력 ${index + 1} 지우기`} disabled={careers.length === 1} onClick={() => onChange({ careers: careers.filter((item) => item.key !== career.key) })}>
                    지우기
                  </TextButton>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <FieldSelect aria-label={`경력 ${index + 1} 연도`} value={career.year} onChange={(event) => update(career.key, { year: event.target.value })}>
                    <option value="">연도</option>
                    {years.map((year) => <option key={year} value={year}>{year}년</option>)}
                  </FieldSelect>
                  <FieldSelect aria-label={`경력 ${index + 1} 월`} value={career.month} onChange={(event) => update(career.key, { month: event.target.value })}>
                    <option value="">월</option>
                    {MONTHS.map((month) => <option key={month} value={month}>{Number(month)}월</option>)}
                  </FieldSelect>
                </div>
                <FieldInput aria-label={`경력 ${index + 1} 작품명`} placeholder="작품명 (예: 연극 <달빛 정거장>)" value={career.workTitle} maxLength={100} onChange={(event) => update(career.key, { workTitle: event.target.value })} />
                <FieldInput aria-label={`경력 ${index + 1} 역할`} placeholder="역할 (예: 민수 역, 선택)" value={career.role} maxLength={50} onChange={(event) => update(career.key, { role: event.target.value })} />
              </li>
            ))}
          </ol>
          {careers.length < MAX_REGISTRATION_CAREERS ? (
            <AddButton onClick={() => onChange({ careers: [...careers, emptyCareer(nextKey)] })}>+ 경력 추가</AddButton>
          ) : (
            <p className="text-xs text-muted">경력은 {MAX_REGISTRATION_CAREERS}줄까지 적을 수 있습니다.</p>
          )}
        </>
      )}
    </fieldset>
  );
}

/** 휴대폰 사진(HEIC 포함)을 긴 변 1600px JPEG로 줄여 비공개 경로에 바로 올린다. */
function PhotoField({ eventId, onBusyChange, onChange }: {
  readonly eventId: number;
  readonly onBusyChange: (busy: boolean) => void;
  readonly onChange: (uploadKey: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "shrinking" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    onBusyChange(true);
    try {
      setStatus("shrinking");
      const photo = await shrinkPhoto(file);
      setStatus("uploading");
      const uploadKey = await uploadEventRegistrationPhoto(eventId, photo);
      setPreview(URL.createObjectURL(photo));
      onChange(uploadKey);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "사진을 올리지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setStatus("idle");
      onBusyChange(false);
    }
  };

  const busy = status !== "idle";
  return (
    <div role="group" aria-labelledby="registration-photo-title" className="flex min-w-0 flex-col gap-1.5">
      <span id="registration-photo-title" className="text-sm font-semibold">프로필 사진<RequiredMark /></span>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 줄인 사진을 그대로 미리 보여 준다.
        <img src={preview} alt="올린 프로필 사진 미리 보기" className="h-48 w-36 rounded-control border border-border-soft bg-surface object-cover" />
      ) : null}
      <div>
        <input ref={input} type="file" accept="image/*,.heic,.heif" className="sr-only" disabled={busy} onChange={(event) => void choose(event)} aria-label="프로필 사진 고르기" />
        <SecondaryButton disabled={busy} onClick={() => input.current?.click()} aria-describedby="registration-photo-hint">
          {status === "shrinking" ? "사진 줄이는 중…" : status === "uploading" ? "올리는 중…" : preview ? "사진 바꾸기" : "사진 올리기"}
        </SecondaryButton>
      </div>
      <p id="registration-photo-hint" className="text-xs text-muted">
        명함에 들어갈 프로필 사진 1장입니다.
      </p>
      {error ? <p role="alert" className="text-xs font-semibold text-fail">{error}</p> : null}
    </div>
  );
}
