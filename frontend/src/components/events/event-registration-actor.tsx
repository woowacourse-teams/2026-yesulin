"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AddButton, FieldInput, SecondaryButton, TextButton } from "@/components/ui/controls";
import { shrinkPhoto } from "@/features/companies/photo-image";
import { uploadEventRegistrationPhoto } from "@/features/events/api";
import { emptyCareer, toggleActivityField, type CareerDraft, type RegistrationDraft } from "@/features/events/registration-draft";
import { EVENT_ACTIVITY_FIELDS, EVENT_ACTIVITY_LABELS, MAX_REGISTRATION_CAREERS } from "@/features/events/types";
import { RegistrationField, RequiredMark, koreaToday } from "./event-registration-field";

type ActorDraft = Pick<RegistrationDraft, "birthDate" | "activityFields" | "otherActivity" | "noCareer" | "careers">;

/** 배우만 적는 칸. 생년월일, 프로필 사진, 활동 분야, 경력(신입이면 경력 없음)을 받는다. */
export function ActorProfileFields({ eventId, draft, onChange, onPhotoChange, onPhotoBusyChange }: {
  readonly eventId: number;
  readonly draft: ActorDraft;
  readonly onChange: (patch: Partial<ActorDraft>) => void;
  readonly onPhotoChange: (uploadKey: string | null) => void;
  readonly onPhotoBusyChange: (busy: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-5 rounded-control border border-border-soft p-4">
      <p className="text-sm font-semibold">배우 프로필</p>
      <RegistrationField id="registration-birth-date" label="생년월일" required>
        <FieldInput id="registration-birth-date" type="date" min="1900-01-01" max={koreaToday()} value={draft.birthDate} onChange={(event) => onChange({ birthDate: event.target.value })} />
      </RegistrationField>
      <PhotoField eventId={eventId} onBusyChange={onPhotoBusyChange} onChange={onPhotoChange} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-semibold">활동 분야<RequiredMark /></legend>
        <p className="text-xs text-muted">활동하거나 준비하는 분야를 모두 골라 주세요.</p>
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
    </div>
  );
}

/** 경력을 + 버튼으로 한 줄씩 더한다. 신입이면 경력 없음을 체크하고 줄은 접는다. */
function CareersField({ noCareer, careers, onChange }: {
  readonly noCareer: boolean;
  readonly careers: readonly CareerDraft[];
  readonly onChange: (patch: Partial<ActorDraft>) => void;
}) {
  const update = (key: number, patch: Partial<CareerDraft>) =>
    onChange({ careers: careers.map((career) => career.key === key ? { ...career, ...patch } : career) });
  const nextKey = Math.max(0, ...careers.map((career) => career.key)) + 1;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-semibold">경력<RequiredMark /></legend>
      <p className="text-xs text-muted">시기, 작품, 맡은 역을 한 줄씩 적어 주세요. 신입이라면 &quot;경력 없음&quot;을 체크해 주세요.</p>
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={noCareer} onChange={(event) => onChange({ noCareer: event.target.checked })} className="size-4 accent-brand" />
        경력 없음 (신입이에요)
      </label>
      {noCareer ? null : (
        <>
          <ol className="flex flex-col gap-2">
            {careers.map((career, index) => (
              <li key={career.key} className="grid gap-2 rounded-control border border-border-soft p-3 sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,0.7fr)_auto] sm:items-center">
                <FieldInput type="month" aria-label={`${index + 1}번째 경력 시기`} value={career.performedMonth} onChange={(event) => update(career.key, { performedMonth: event.target.value })} />
                <FieldInput aria-label={`${index + 1}번째 경력 작품명`} placeholder="작품명 (예: 연극 <달빛 정거장>)" value={career.workTitle} maxLength={100} onChange={(event) => update(career.key, { workTitle: event.target.value })} />
                <FieldInput aria-label={`${index + 1}번째 경력 역할`} placeholder="역할 (예: 민수 역)" value={career.role} maxLength={50} onChange={(event) => update(career.key, { role: event.target.value })} />
                <TextButton aria-label={`${index + 1}번째 경력 지우기`} disabled={careers.length === 1} onClick={() => onChange({ careers: careers.filter((item) => item.key !== career.key) })}>
                  지우기
                </TextButton>
              </li>
            ))}
          </ol>
          {careers.length < MAX_REGISTRATION_CAREERS ? (
            <AddButton onClick={() => onChange({ careers: [...careers, emptyCareer(nextKey)] })}>+ 경력 추가</AddButton>
          ) : (
            <p className="text-xs text-muted">경력은 {MAX_REGISTRATION_CAREERS}줄까지 적을 수 있어요.</p>
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
      setError(cause instanceof Error ? cause.message : "사진을 올리지 못했어요. 다시 시도해 주세요.");
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
        가장 잘 나온 프로필 사진 한 장을 골라 주세요. 휴대폰 사진(HEIC 포함)도 자동으로 줄이고, 촬영 위치 같은 정보는 지워요.
      </p>
      {error ? <p role="alert" className="text-xs font-semibold text-fail">{error}</p> : null}
    </div>
  );
}
