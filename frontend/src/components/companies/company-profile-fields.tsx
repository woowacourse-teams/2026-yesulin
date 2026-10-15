"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { PerformanceVenueField } from "@/components/auditions/performance-venue-field";
import { AddButton, FieldInput, FieldTextarea, SecondaryButton, TextButton } from "@/components/ui/controls";
import { shrinkPhoto } from "@/features/companies/photo-image";
import type { CompanyDraft, PrivateField } from "@/features/companies/profile-draft";
import { CompanyAvatar } from "./company-avatar";

/** 줄인 사진을 올리고 화면에 보일 주소와 (수정 요청이면) 업로드 키를 돌려준다. */
export type UploadCompanyPhoto = (photo: Blob) => Promise<{ readonly url: string; readonly uploadKey: string | null }>;

const MAX_LINKS = 3;

/**
 * 공연사 정보 입력 칸. 운영자 편집(`admin`)과 공개 화면의 수정 요청(`request`)이 같이 쓴다.
 * 선택 항목은 값을 적거나 "비공개"를 체크한다. 체크하면 입력 칸을 접고 공개 화면에 "비공개"로 보인다.
 * 정보 출처 메모는 운영자 화면이 따로 그린다.
 */
export function CompanyProfileFields({ draft, onChange, undecided, mode, uploadPhoto }: {
  readonly draft: CompanyDraft;
  readonly onChange: (draft: CompanyDraft) => void;
  readonly uploadPhoto: UploadCompanyPhoto;
  /** 저장하려 했는데 값도 비공개 체크도 없는 항목. 강조해 보인다. */
  readonly undecided: ReadonlySet<PrivateField>;
  readonly mode: "admin" | "request";
}) {
  const set = <K extends keyof CompanyDraft>(key: K, value: CompanyDraft[K]) => onChange({ ...draft, [key]: value });
  const optional = (field: PrivateField) => ({
    hidden: draft.hidden[field],
    undecided: undecided.has(field),
    onHiddenChange: (hidden: boolean) => onChange({ ...draft, hidden: { ...draft.hidden, [field]: hidden } }),
  });

  return (
    <div className="flex flex-col gap-4">
      <PhotoField
        name={draft.name}
        photoUrl={draft.photoUrl}
        upload={uploadPhoto}
        onChange={(photoUrl, photoUploadKey) => onChange({ ...draft, photoUrl, photoUploadKey })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor="company-name" className="text-sm font-semibold">
            공연사 이름<span className="ml-1 text-fail" aria-hidden="true">*</span>
          </label>
          <FieldInput id="company-name" value={draft.name} maxLength={100} autoComplete="organization" required onChange={(event) => set("name", event.target.value)} />
        </div>
        <OptionalField id="company-representative" label="대표자 이름" hint="개인정보예요. 공개 동의가 없으면 공개 화면에 보이지 않아요." {...optional("REPRESENTATIVE_NAME")}>
          <FieldInput id="company-representative" value={draft.representativeName} maxLength={50} autoComplete="off" onChange={(event) => set("representativeName", event.target.value)} />
          <Consent id="company-representative-public" checked={draft.representativeNamePublic} onChange={(checked) => set("representativeNamePublic", checked)}>
            {mode === "admin" ? "공연사가 대표자 이름 공개에 동의했어요" : "대표자 이름을 공개해도 돼요 (공연사 관계자만 체크해 주세요)"}
          </Consent>
        </OptionalField>
        <OptionalField id="company-founded" label="설립일" {...optional("FOUNDED_ON")}>
          <FieldInput id="company-founded" type="date" value={draft.foundedOn} min="1900-01-01" onChange={(event) => set("foundedOn", event.target.value)} />
        </OptionalField>
        <OptionalField id="company-phone" label="대표 연락처" hint="공식 대표번호만 적어 주세요. 개인 휴대폰 번호는 쓰지 않아요." {...optional("PHONE")}>
          <FieldInput id="company-phone" type="tel" inputMode="tel" value={draft.phone} maxLength={30} placeholder="02-123-4567" onChange={(event) => set("phone", event.target.value)} />
        </OptionalField>
        <OptionalField id="company-region" label="지역" hint="주소가 없을 때 공고 카드에 대신 보여요." {...optional("REGION")}>
          <FieldInput id="company-region" value={draft.region} maxLength={50} placeholder="서울" onChange={(event) => set("region", event.target.value)} />
        </OptionalField>
      </div>
      <OptionalField id="company-links" label="링크" labelNote={`최대 ${MAX_LINKS}개`} hint="http:// 또는 https://로 시작하는 주소만 넣을 수 있어요." group {...optional("LINKS")}>
        <LinksInput links={draft.links} onChange={(links) => set("links", links)} />
      </OptionalField>
      <OptionalField id="company-address" label="공연사 주소" group {...optional("ADDRESS")}>
        <PerformanceVenueField
          venue=""
          address={draft.address}
          onVenueChange={() => undefined}
          onAddressChange={(address) => set("address", address)}
          optional
          hideVenueName
          addressLabel="도로명주소"
          mapLabel="공연사 위치 지도"
        />
        <Consent id="company-address-public" checked={draft.addressPublic} onChange={(checked) => set("addressPublic", checked)}>
          공식 사업장 주소예요. 상세 주소와 지도를 공개해요
          <span className="mt-0.5 block text-xs font-normal text-muted">끄면 공개 화면에 시·군·구까지만 보여요. 집 주소일 수 있으면 꺼 두세요.</span>
        </Consent>
      </OptionalField>
      <OptionalField id="company-description" label="소개" {...optional("DESCRIPTION")}>
        <FieldTextarea id="company-description" rows={4} value={draft.description} maxLength={2000} onChange={(event) => set("description", event.target.value)} />
      </OptionalField>
      <OptionalField id="company-history" label="연혁" hint="한 줄에 하나씩 적어 주세요(예: 2015 창단, 2019 대학로 첫 정기공연)." {...optional("HISTORY")}>
        <FieldTextarea id="company-history" rows={4} value={draft.history} maxLength={2000} onChange={(event) => set("history", event.target.value)} />
      </OptionalField>
    </div>
  );
}

/**
 * 대표 사진. 휴대폰 사진을 그대로 골라도 브라우저가 긴 변 1600px JPEG로 줄이고 방향을 바로잡아 올리며, 촬영 위치 같은 정보는
 * 남기지 않는다. 사진이 없으면 이름 첫 글자 이미지가 보인다.
 */
function PhotoField({ name, photoUrl, upload, onChange }: {
  readonly name: string;
  readonly photoUrl: string | null;
  readonly upload: UploadCompanyPhoto;
  readonly onChange: (photoUrl: string | null, photoUploadKey: string | null) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "shrinking" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const busy = status !== "idle";

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    try {
      setStatus("shrinking");
      const photo = await shrinkPhoto(file);
      setStatus("uploading");
      const uploaded = await upload(photo);
      onChange(uploaded.url, uploaded.uploadKey);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "사진을 올리지 못했어요. 다시 시도해 주세요.");
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div role="group" aria-labelledby="company-photo-title" className="flex min-w-0 flex-col gap-1.5">
      <span id="company-photo-title" className="text-sm font-semibold">
        대표 사진<span className="ml-1 text-xs font-normal text-muted">선택</span>
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <CompanyAvatar name={name || "?"} photoUrl={photoUrl} size="lg" />
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            id="company-photo"
            type="file"
            accept="image/*,.heic,.heif"
            className="sr-only"
            disabled={busy}
            onChange={(event) => void choose(event)}
          />
          <SecondaryButton disabled={busy} onClick={() => input.current?.click()} aria-describedby="company-photo-hint">
            {status === "shrinking" ? "사진 줄이는 중…" : status === "uploading" ? "올리는 중…" : photoUrl ? "사진 바꾸기" : "사진 올리기"}
          </SecondaryButton>
          {photoUrl ? <TextButton disabled={busy} onClick={() => onChange(null, null)}>사진 지우기</TextButton> : null}
        </div>
      </div>
      <p id="company-photo-hint" className="text-xs text-muted">
        로고나 단체 사진 한 장을 골라 주세요. 휴대폰 사진(HEIC 포함)도 그대로 고르면 자동으로 줄이고, 촬영 위치 같은 정보는 지워요.
        사진이 없으면 이름 첫 글자가 보여요.
      </p>
      {error ? <p role="alert" className="text-xs font-semibold text-fail">{error}</p> : null}
    </div>
  );
}

/** 선택 항목. 제목 옆 "비공개"를 체크하면 입력 칸을 접는다. */
function OptionalField({ id, label, labelNote, hint, hidden, undecided, onHiddenChange, group = false, children }: {
  readonly id: string;
  readonly label: string;
  readonly labelNote?: string;
  readonly hint?: string;
  readonly hidden: boolean;
  readonly undecided: boolean;
  readonly onHiddenChange: (hidden: boolean) => void;
  /** 입력 칸이 여러 개라 제목을 `label` 대신 묶음 이름으로 둔다. */
  readonly group?: boolean;
  readonly children: React.ReactNode;
}) {
  const titleId = `${id}-title`;
  const errorId = `${id}-undecided`;
  const title = <>{label}{labelNote ? <span className="ml-1 text-xs font-normal text-muted">{labelNote}</span> : null}</>;
  return (
    <div
      role={group ? "group" : undefined}
      aria-labelledby={group ? titleId : undefined}
      aria-describedby={undecided ? errorId : undefined}
      className={`flex min-w-0 flex-col gap-1.5 ${undecided ? "rounded-control outline outline-2 outline-offset-4 outline-fail/60" : ""}`}
    >
      <div className="flex min-h-6 items-center justify-between gap-3">
        {group || hidden
          ? <span id={titleId} className="text-sm font-semibold">{title}</span>
          : <label id={titleId} htmlFor={id} className="text-sm font-semibold">{title}</label>}
        <label htmlFor={`${id}-hidden`} className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted-strong">
          <input
            id={`${id}-hidden`}
            type="checkbox"
            checked={hidden}
            onChange={(event) => onHiddenChange(event.target.checked)}
            className="size-4 accent-brand"
          />
          비공개<span className="sr-only"> ({label})</span>
        </label>
      </div>
      {hidden ? (
        <p className="rounded-control border border-dashed border-border bg-surface px-3 py-2.5 text-sm text-muted">
          공개 화면에 &quot;비공개&quot;로 보여요. 체크를 풀면 입력할 수 있어요.
        </p>
      ) : (
        <>
          {children}
          {hint ? <p className="text-xs text-muted">{hint}</p> : null}
        </>
      )}
      {undecided ? <p id={errorId} className="text-xs font-semibold text-fail">값을 적거나 비공개를 체크해 주세요.</p> : null}
    </div>
  );
}

function LinksInput({ links, onChange }: { readonly links: readonly string[]; readonly onChange: (links: readonly string[]) => void }) {
  return (
    <>
      {links.map((link, index) => (
        <div key={index} className="flex min-w-0 gap-2">
          <FieldInput
            aria-label={`링크 ${index + 1}`}
            type="url"
            inputMode="url"
            value={link}
            maxLength={500}
            placeholder="https:// (홈페이지, 인스타그램 등)"
            onChange={(event) => onChange(links.map((value, i) => i === index ? event.target.value : value))}
            className="w-0 min-w-0 flex-1"
          />
          {links.length > 1 ? (
            <TextButton aria-label={`링크 ${index + 1} 지우기`} onClick={() => onChange(links.filter((_, i) => i !== index))}>지우기</TextButton>
          ) : null}
        </div>
      ))}
      {links.length < MAX_LINKS ? (
        <AddButton className="self-start" onClick={() => onChange([...links, ""])}>+ 링크 추가</AddButton>
      ) : null}
    </>
  );
}

export function Consent({ id, checked, onChange, children }: {
  readonly id: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-2.5 text-sm font-medium">
      <input id={id} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-brand" />
      <span className="min-w-0">{children}</span>
    </label>
  );
}
