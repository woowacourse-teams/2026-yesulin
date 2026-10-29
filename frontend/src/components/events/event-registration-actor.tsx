"use client";

import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { AddButton, FieldInput, FieldSelect, SecondaryButton, TextButton } from "@/components/ui/controls";
import { SiteIcon } from "@/components/ui/site-icon";
import { MAX_SOURCE_BYTES, shrinkPhoto } from "@/features/companies/photo-image";
import { uploadEventRegistrationPhoto } from "@/features/events/api";
import { careerYears, emptyCareer, toggleActivityField, type CareerDraft, type RegistrationDraft } from "@/features/events/registration-draft";
import { EVENT_ACTIVITY_FIELDS, EVENT_ACTIVITY_LABELS, EVENT_SNS_LABELS, EVENT_SNS_PLATFORMS, MAX_EVENT_SNS_HANDLE_LENGTH, MAX_REGISTRATION_CAREERS, MAX_REGISTRATION_INTRO, type EventSnsPlatform } from "@/features/events/types";
import { BirthDateField } from "./event-registration-birth-date";
import type { CardPreviewSide } from "./event-business-card-preview";
import { RegistrationField, RequiredMark, koreaToday } from "./event-registration-field";

type CardDraft = Pick<RegistrationDraft, "name" | "email" | "snsHandle" | "snsPlatform" | "birthDate" | "activityFields" | "otherActivity" | "noCareer" | "careers" | "intro">;

const MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0"));

/** 명함 제작을 희망한 배우만 적는 칸. 여기 적은 정보는 프로필 명함에 그대로 들어간다(휴대폰 번호는 넣지 않는다). */
export function BusinessCardFields({ eventId, draft, preview, photoUrl, mobileView, onPreviewSideChange, onChange, onPhotoChange, onPhotoBusyChange }: {
  readonly eventId: number;
  readonly draft: CardDraft;
  readonly preview: ReactNode;
  readonly photoUrl: string | null;
  readonly mobileView: "input" | "preview";
  readonly onPreviewSideChange: (side: CardPreviewSide) => void;
  readonly onChange: (patch: Partial<CardDraft>) => void;
  readonly onPhotoChange: (uploadKey: string, photo: Blob) => void;
  readonly onPhotoBusyChange: (busy: boolean) => void;
}) {
  return (
    <section aria-labelledby="registration-card-title" className="flex flex-col gap-5">
      <div className={mobileView === "preview" ? "hidden lg:block" : ""}>
        <h2 id="registration-card-title" className="text-sm font-bold text-brand">프로필 명함에 들어갈 정보</h2>
        <p className="mt-1 text-xs text-muted-strong">아래 정보가 명함에 그대로 들어갑니다. 휴대폰 번호는 명함에 넣지 않습니다.</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,.85fr)]">
        <div id="event-card-panel-input" role="tabpanel" aria-labelledby="event-card-tab-input" className={`min-w-0 flex-col gap-6 lg:flex ${mobileView === "input" ? "flex" : "hidden"}`}>
          <div className="flex flex-col gap-5" onFocusCapture={() => onPreviewSideChange("front")}>
            <PhotoField eventId={eventId} preview={photoUrl} onBusyChange={onPhotoBusyChange} onChange={onPhotoChange} />
            <RegistrationField id="registration-card-name" label="명함에 들어갈 이름" required>
              <FieldInput id="registration-card-name" value={draft.name} maxLength={50} onChange={(event) => onChange({ name: event.target.value })} />
            </RegistrationField>
            <RegistrationField id="registration-email" label="이메일" required>
              <FieldInput id="registration-email" type="email" inputMode="email" autoComplete="email" value={draft.email} maxLength={254} onChange={(event) => onChange({ email: event.target.value })} />
            </RegistrationField>
            <fieldset className="flex min-w-0 flex-col gap-2">
              <legend className="mb-1 text-sm font-semibold">SNS <span className="ml-1 text-xs font-normal text-muted">선택</span></legend>
              <p id="registration-sns-hint" className="text-xs leading-5 text-muted-strong">링크 대신 계정명이나 채널명을 {MAX_EVENT_SNS_HANDLE_LENGTH}자 이내로 적어 주세요.</p>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                <FieldSelect aria-label="SNS 유형" value={draft.snsPlatform} onChange={(event) => {
                  const snsPlatform = event.target.value as EventSnsPlatform | "";
                  onChange({ snsPlatform, ...(snsPlatform ? {} : { snsHandle: "" }) });
                }}>
                  <option value="">선택 안 함</option>
                  {EVENT_SNS_PLATFORMS.map((platform) => <option key={platform} value={platform}>{EVENT_SNS_LABELS[platform]}</option>)}
                </FieldSelect>
                <FieldInput id="registration-sns" aria-label="SNS 계정명 또는 채널명" aria-describedby="registration-sns-hint registration-sns-count" placeholder="예: @yesulin_actor" autoCapitalize="none" autoCorrect="off" value={draft.snsHandle} maxLength={MAX_EVENT_SNS_HANDLE_LENGTH} onChange={(event) => onChange({ snsHandle: event.target.value.slice(0, MAX_EVENT_SNS_HANDLE_LENGTH) })} />
              </div>
              <p id="registration-sns-count" className="num text-right text-xs text-muted">{draft.snsHandle.length} / {MAX_EVENT_SNS_HANDLE_LENGTH}자</p>
            </fieldset>
            <BirthDateField value={draft.birthDate} today={koreaToday()} onChange={(birthDate) => onChange({ birthDate })} />
          </div>

          <fieldset className="flex flex-col gap-2" onFocusCapture={() => onPreviewSideChange("back")}>
            <legend className="mb-1 text-sm font-semibold">활동 분야<RequiredMark /></legend>
            <p className="text-xs text-muted">중복 선택 가능합니다.</p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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

          <div onFocusCapture={() => onPreviewSideChange("back")}>
            <CareersField noCareer={draft.noCareer} careers={draft.careers} onChange={onChange} />
            <div className="mt-5">
              <RegistrationField id="registration-intro" label="한 줄 소개" hint="명함 뒷면에 들어갑니다. 예: 노래로 이야기를 전하는 배우입니다.">
                <FieldInput id="registration-intro" value={draft.intro} maxLength={MAX_REGISTRATION_INTRO} onChange={(event) => onChange({ intro: event.target.value })} />
              </RegistrationField>
            </div>
          </div>
        </div>
        <aside id="event-card-panel-preview" role="tabpanel" aria-labelledby="event-card-tab-preview" className={`min-w-0 rounded-control bg-surface p-4 lg:sticky lg:top-0 lg:block ${mobileView === "preview" ? "block" : "hidden"}`}>
          <h3 className="mb-4 text-sm font-semibold">입력한 명함 미리보기</h3>
          {preview}
        </aside>
      </div>
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
function PhotoField({ eventId, preview, onBusyChange, onChange }: {
  readonly eventId: number;
  readonly preview: string | null;
  readonly onBusyChange: (busy: boolean) => void;
  readonly onChange: (uploadKey: string, photo: Blob) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const active = useRef(true);
  const [status, setStatus] = useState<"idle" | "shrinking" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    onBusyChange(true);
    try {
      setStatus("shrinking");
      const photo = await shrinkPhoto(file);
      if (!active.current) return;
      setStatus("uploading");
      const uploadKey = await uploadEventRegistrationPhoto(eventId, photo);
      if (!active.current) return;
      onChange(uploadKey, photo);
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : "사진을 올리지 못했습니다. 다시 시도해 주십시오.");
    } finally {
      if (active.current) { setStatus("idle"); onBusyChange(false); }
    }
  };

  const busy = status !== "idle";
  return (
    <div role="group" aria-labelledby="registration-photo-title" aria-busy={busy} className="flex min-w-0 flex-col gap-2">
      <span id="registration-photo-title" className="text-sm font-semibold">명함에 넣을 사진<RequiredMark /></span>
      <div className={`flex min-w-0 items-start gap-4 rounded-card border p-4 ${preview ? "border-pass/30 bg-pass-bg/30" : "border-brand/40 bg-brand-soft/40"}`}>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- 브라우저에서 줄인 사진을 그대로 미리 보여 준다.
          <img src={preview} alt="등록한 명함 사진" className="h-28 w-20 shrink-0 rounded-control border border-border-soft bg-card object-cover" />
        ) : <div aria-hidden="true" className="flex h-28 w-20 shrink-0 items-center justify-center rounded-control border border-dashed border-brand/40 bg-card text-brand"><SiteIcon name="image" className="size-8" /></div>}
        <div className="min-w-0 flex-1">
          <p role="status" className={`text-sm font-semibold leading-6 ${preview && !busy && !error ? "text-pass" : "text-foreground"}`}>
            {status === "shrinking" ? "사진을 준비하고 있어요…" : status === "uploading" ? "사진을 업로드하고 있어요…" : preview ? error ? "기존에 등록한 사진이 유지돼요" : "사진 등록 완료 · 1장" : "명함에 사용할 사진을 올려 주세요"}
          </p>
          <p id="registration-photo-hint" className="mt-1 text-xs leading-5 text-muted-strong">선택하면 자동으로 업로드돼요.<br />사진 1장 · 원본 최대 {MAX_SOURCE_BYTES / 1024 / 1024}MB</p>
          <input ref={input} type="file" accept="image/*,.heic,.heif" className="hidden" disabled={busy} onChange={(event) => void choose(event)} aria-label="명함 사진 파일" />
          <SecondaryButton disabled={busy} onClick={() => input.current?.click()} aria-describedby="registration-photo-hint" className="mt-3 w-full justify-center border-brand text-brand">
            {busy ? "사진 업로드 중…" : preview ? "다른 사진으로 변경" : "사진 선택해서 올리기"}
          </SecondaryButton>
        </div>
      </div>
      {error ? <p role="alert" className="text-sm font-semibold text-fail">{error}</p> : null}
    </div>
  );
}
