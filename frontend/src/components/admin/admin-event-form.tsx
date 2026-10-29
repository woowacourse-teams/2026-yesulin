"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { FieldInput, FieldTextarea } from "@/components/ui/controls";
import { AdminApiError, uploadEventImage } from "@/features/admin/api";
import type { AdminEventWrite } from "@/features/admin/types";
import { BANNER_RATIOS, bannerRatioWarning, EVENT_BODY_MAX_LENGTH, eventDraftProblem, writeOfEvent, type EventDraft, type EventImageSlot } from "@/features/events/draft";
import { MAX_EVENT_DETAIL_IMAGES } from "@/features/events/types";
import { AdminActionButton } from "./admin-shell";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function AdminEventForm({ initial, submitLabel, onSave, onCancel, onUnauthorized }: {
  readonly initial: EventDraft;
  readonly submitLabel: string;
  readonly onSave: (write: AdminEventWrite) => Promise<void>;
  readonly onCancel: () => void;
  readonly onUnauthorized: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const busy = saving || uploading > 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = eventDraftProblem(draft);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(writeOfEvent(draft));
    } catch (cause) {
      if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
        onUnauthorized();
        return;
      }
      setError(cause instanceof Error ? cause.message : "이벤트를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const imageProps = (slot: EventImageSlot, key: "coverImageUrl" | "bannerDesktopImageUrl" | "bannerMobileImageUrl") => ({
    slot,
    disabled: busy,
    url: draft[key],
    onChange: (url: string | null) => set(key, url),
    onBusyChange: (busyNow: boolean) => setUploading((count) => count + (busyNow ? 1 : -1)),
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4 rounded-card border border-brand-line bg-card p-4 sm:p-5">
      <Field id="event-title" label="제목" required>
        <FieldInput id="event-title" value={draft.title} maxLength={100} onChange={(event) => set("title", event.target.value)} />
      </Field>
      <Field id="event-summary" label="요약" hint="목록 카드에 한두 줄로 보여요.">
        <FieldInput id="event-summary" value={draft.summary} maxLength={200} onChange={(event) => set("summary", event.target.value)} />
      </Field>
      <Field id="event-body" label="개요" required hint="대표 이미지 옆에 보여요. 이벤트 소개와 안내를 자유롭게 적어 주세요. 줄바꿈을 그대로 유지해요.">
        <FieldTextarea id="event-body" rows={8} value={draft.body} maxLength={EVENT_BODY_MAX_LENGTH} onChange={(event) => set("body", event.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="event-starts-on" label="시작일" hint="비우면 시작일 없이 진행 중으로 보여요.">
          <FieldInput id="event-starts-on" type="date" value={draft.startsOn} onChange={(event) => set("startsOn", event.target.value)} />
        </Field>
        <Field id="event-ends-on" label="종료일" hint="지나면 마감으로 보여요.">
          <FieldInput id="event-ends-on" type="date" value={draft.endsOn} onChange={(event) => set("endsOn", event.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Field id="event-apply-url" label="신청 링크" hint="상세 화면의 신청 버튼이 이 주소를 새 창으로 열어요. 마감되면 버튼을 숨겨요.">
          <FieldInput id="event-apply-url" type="url" inputMode="url" placeholder="https://forms.gle/..." value={draft.applyUrl} maxLength={500} onChange={(event) => set("applyUrl", event.target.value)} />
        </Field>
        <Field id="event-apply-label" label="버튼 문구" hint="비우면 '신청하기'">
          <FieldInput id="event-apply-label" value={draft.applyLabel} maxLength={30} onChange={(event) => set("applyLabel", event.target.value)} />
        </Field>
      </div>
      <fieldset className="flex flex-col gap-4 rounded-control border border-border-soft p-4">
        <legend className="px-1 text-sm font-semibold">참가 신청서</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={draft.registrationEnabled} onChange={(event) => set("registrationEnabled", event.target.checked)} className="size-4 accent-brand" />
          예술in 참가 신청서로 신청 받기
        </label>
        <p className="-mt-3 text-xs text-muted">
          켜면 신청 버튼이 위 신청 링크 대신 로그인 없이 쓰는 신청서를 열어요. 모두 이름·휴대폰을 받고, 공연사 관계자는 소속과 지금 하는 일을, 프로필 명함을 희망한 배우는 이메일·SNS·생년월일·사진·분야·경력을 받아요.
          종료일이 지나거나 총정원이 차면 신청을 닫아요. 모집 마감 버튼은 기존 안내와 신청자를 유지해요.
        </p>
        {draft.registrationEnabled ? (
          <Field id="event-registration-capacity" label="합산 모집 정원" hint="배우(일반 참가자 포함)와 관계자를 합산해 신청 완료 순으로 받습니다. 비우면 제한이 없습니다. 입금 상태는 정원에 영향을 주지 않습니다.">
            <FieldInput id="event-registration-capacity" type="number" min={1} max={2147483647} step={1} inputMode="numeric" placeholder="정원 제한 없음" value={draft.registrationCapacity} onChange={(event) => set("registrationCapacity", event.target.value)} />
          </Field>
        ) : null}
        {draft.registrationEnabled ? (
          <Field id="event-registration-notice" label="신청 안내" hint="신청서 위와 신청 완료 화면에 그대로 보여요. 보증금·계좌·반환 안내를 적어 주세요.">
            <FieldTextarea id="event-registration-notice" rows={5} value={draft.registrationNotice} maxLength={2000} onChange={(event) => set("registrationNotice", event.target.value)} />
          </Field>
        ) : null}
        {draft.registrationEnabled ? (
          <div className="flex flex-col gap-3 border-t border-border-soft pt-4">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={draft.registrationConfirmationEnabled} onChange={(event) => set("registrationConfirmationEnabled", event.target.checked)} className="size-4 accent-brand" />
              신청 전 안내 팝업 사용
            </label>
            <p className="text-xs text-muted">입력을 마치고 신청하기를 누르면 안내가 떠요. 안내를 확인한 뒤 최종 신청해요. 끄면 바로 접수돼요.</p>
            {draft.registrationConfirmationEnabled ? <>
              <Field id="event-registration-confirmation" label="팝업 안내 내용" required hint="신청서 위의 안내와 별도로 설정해요. 줄바꿈을 그대로 보여요.">
                <FieldTextarea id="event-registration-confirmation" rows={5} value={draft.registrationConfirmationMessage} maxLength={2000} onChange={(event) => set("registrationConfirmationMessage", event.target.value)} />
              </Field>
              <p className="text-sm font-semibold">입금 계좌 (선택)</p>
              <p className="text-xs text-muted">입력하면 신청 팝업에 계좌와 계좌번호 복사 버튼을 보여요. 사용할 때는 세 항목을 모두 입력해 주세요.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field id="event-bank-name" label="은행명"><FieldInput id="event-bank-name" maxLength={50} value={draft.registrationBankName} onChange={event => set("registrationBankName", event.target.value)} /></Field>
                <Field id="event-account-number" label="계좌번호"><FieldInput id="event-account-number" inputMode="numeric" maxLength={50} value={draft.registrationAccountNumber} onChange={event => set("registrationAccountNumber", event.target.value)} /></Field>
                <Field id="event-account-holder" label="예금주"><FieldInput id="event-account-holder" maxLength={50} value={draft.registrationAccountHolder} onChange={event => set("registrationAccountHolder", event.target.value)} /></Field>
              </div>
            </> : null}
          </div>
        ) : null}
        {draft.registrationEnabled ? (
          <Field id="event-business-card-closes-at" label="명함 제작 신청 마감 (한국 시각)" hint="이 시각이 지나면 배우 신청서에서 '프로필 명함 제작 희망'을 닫아요. 참가 신청은 종료일까지 계속 받아요. 비우면 신청 기간 내내 받아요.">
            <FieldInput id="event-business-card-closes-at" type="datetime-local" value={draft.businessCardClosesAt} onChange={(event) => set("businessCardClosesAt", event.target.value)} />
          </Field>
        ) : null}
      </fieldset>
      <ImageField label="대표 이미지" hint="목록 카드와 상세 위쪽에 보여요. 선택 사항이에요." {...imageProps("cover", "coverImageUrl")} />

      <fieldset className="flex flex-col gap-4 rounded-control border border-border-soft p-4">
        <legend className="px-1 text-sm font-semibold">하단 상세 내용</legend>
        <Field id="event-detail-body" label="상세 설명" hint="개요 아래 별도 영역에 보여요. 상세 이미지만 등록해도 돼요.">
          <FieldTextarea id="event-detail-body" rows={8} maxLength={EVENT_BODY_MAX_LENGTH} value={draft.detailBody} onChange={(event) => set("detailBody", event.target.value)} />
        </Field>
        {draft.detailImageUrls.map((url, index) => (
          <div key={url} className="space-y-2 rounded-control border border-border-soft p-3">
            <ImageField
              id={`event-detail-image-${index}`}
              slot="detail"
              label={`상세 이미지 ${index + 1}`}
              hint="상세 설명 아래에 원본 비율로 보여요."
              url={url}
              disabled={busy}
              onBusyChange={(busyNow) => setUploading((count) => count + (busyNow ? 1 : -1))}
              onChange={(next) => setDraft((current) => ({ ...current, detailImageUrls: current.detailImageUrls.flatMap((item, slot) => slot === index ? next ? [next] : [] : [item]) }))}
            />
            <div className="flex gap-2">
              <AdminActionButton disabled={busy || index === 0} onClick={() => setDraft((current) => ({ ...current, detailImageUrls: moveDetailImage(current.detailImageUrls, index, -1) }))} aria-label={`상세 이미지 ${index + 1} 위로`}>위로</AdminActionButton>
              <AdminActionButton disabled={busy || index === draft.detailImageUrls.length - 1} onClick={() => setDraft((current) => ({ ...current, detailImageUrls: moveDetailImage(current.detailImageUrls, index, 1) }))} aria-label={`상세 이미지 ${index + 1} 아래로`}>아래로</AdminActionButton>
            </div>
          </div>
        ))}
        {draft.detailImageUrls.length < MAX_EVENT_DETAIL_IMAGES ? <ImageField
          id="event-detail-image-add"
          slot="detail"
          label="상세 이미지 추가"
          hint={`최대 ${MAX_EVENT_DETAIL_IMAGES}장까지 등록할 수 있고, 위에서부터 차례로 보여요.`}
          url={null}
          disabled={busy}
          onBusyChange={(busyNow) => setUploading((count) => count + (busyNow ? 1 : -1))}
          onChange={(url) => { if (url) setDraft((current) => ({ ...current, detailImageUrls: [...current.detailImageUrls, url] })); }}
        /> : null}
      </fieldset>

      <fieldset className="flex flex-col gap-4 rounded-control border border-border-soft p-4">
        <legend className="px-1 text-sm font-semibold">메인 배너</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={draft.bannerEnabled} onChange={(event) => set("bannerEnabled", event.target.checked)} className="size-4 accent-brand" />
          메인 상단 배너에 노출
        </label>
        <p className="-mt-3 text-xs text-muted">공개 중인 글만 보여요. 이벤트 배너는 고정 배너보다 먼저, 순서가 작은 것부터 5개까지 보여요. 배너를 누르면 이 이벤트 상세로 가요.</p>
        <div className="grid gap-4 lg:grid-cols-2">
          <ImageField label={`PC 배너 (${BANNER_RATIOS.bannerDesktop.label})`} hint="예: 2160×675. 글자는 가운데 쪽에 두세요." {...imageProps("bannerDesktop", "bannerDesktopImageUrl")} />
          <ImageField label={`모바일 배너 (${BANNER_RATIOS.bannerMobile.label})`} hint="예: 1440×1080. 640px 이하 화면에서 보여요." {...imageProps("bannerMobile", "bannerMobileImageUrl")} />
        </div>
        <Field id="event-banner-alt" label="대체 문구" hint="배너 이미지에 적힌 문구를 그대로 옮겨 주세요. 화면 낭독기가 읽어요.">
          <FieldInput id="event-banner-alt" value={draft.bannerAlt} maxLength={200} onChange={(event) => set("bannerAlt", event.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="event-banner-ends-on" label="노출 종료일" hint="이 날까지 보여요. 비우면 내릴 때까지 보여요.">
            <FieldInput id="event-banner-ends-on" type="date" value={draft.bannerEndsOn} onChange={(event) => set("bannerEndsOn", event.target.value)} />
          </Field>
          <Field id="event-banner-order" label="순서" hint="0~99. 이벤트 배너끼리 작은 숫자가 먼저 보여요.">
            <FieldInput id="event-banner-order" type="number" min={0} max={99} inputMode="numeric" value={draft.bannerOrder} onChange={(event) => set("bannerOrder", event.target.value)} />
          </Field>
        </div>
      </fieldset>

      {error ? <p role="alert" className="text-sm text-fail">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-2">
        <AdminActionButton onClick={onCancel} disabled={saving}>취소</AdminActionButton>
        <AdminActionButton type="submit" tone="primary" disabled={busy}>
          {saving ? "저장하는 중…" : uploading > 0 ? "이미지 올리는 중…" : submitLabel}
        </AdminActionButton>
      </div>
    </form>
  );
}

function moveDetailImage(urls: readonly string[], index: number, direction: -1 | 1): readonly string[] {
  const target = index + direction;
  if (target < 0 || target >= urls.length) return urls;
  const next = [...urls];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function Field({ id, label, required = false, hint, children }: {
  readonly id: string;
  readonly label: string;
  readonly required?: boolean;
  readonly hint?: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
        <span className="ml-1 text-xs font-normal text-muted">{required ? "필수" : "선택"}</span>
      </label>
      {children}
      {hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** 이미지를 원본 그대로 올린다. 배너는 칸 비율과 크게 다르면 잘리는 쪽을 안내하지만 막지는 않는다. */
function ImageField({ id, slot, label, hint, url, disabled = false, onChange, onBusyChange }: {
  readonly id?: string;
  readonly disabled?: boolean;
  readonly slot: EventImageSlot;
  readonly label: string;
  readonly hint: string;
  readonly url: string | null;
  readonly onChange: (url: string | null) => void;
  readonly onBusyChange: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const titleId = id ?? `event-image-${slot}`;

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    setWarning(null);
    if (!IMAGE_TYPES.includes(file.type)) {
      setError("JPG·PNG·WebP 이미지만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("이미지는 5MB까지 올릴 수 있어요.");
      return;
    }
    setUploading(true);
    onBusyChange(true);
    try {
      if (slot === "bannerDesktop" || slot === "bannerMobile") {
        const size = await imageSize(file);
        setWarning(size ? bannerRatioWarning(slot, size.width, size.height) : null);
      }
      onChange(await uploadEventImage(file));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "이미지를 올리지 못했어요. 다시 시도해 주세요.");
    } finally {
      setUploading(false);
      onBusyChange(false);
    }
  };

  const aspect = slot === "bannerDesktop" ? "aspect-[3.2/1] object-cover" : slot === "bannerMobile" ? "aspect-[4/3] object-cover" : "max-h-60 object-contain";
  return (
    <div role="group" aria-labelledby={titleId} className="flex min-w-0 flex-col gap-1.5">
      <span id={titleId} className="text-sm font-semibold">{label}</span>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- 저장소·미리 보기 주소를 그대로 보여 준다.
        <img src={url} alt="" className={`w-full rounded-control border border-border-soft bg-surface ${aspect}`} />
      ) : null}
      <div className="flex flex-wrap gap-2">
        <input ref={input} type="file" accept={IMAGE_TYPES.join(",")} className="sr-only" disabled={uploading || disabled} onChange={(event) => void choose(event)} aria-label={`${label} 파일 고르기`} />
        <AdminActionButton disabled={uploading || disabled} onClick={() => input.current?.click()}>
          {uploading ? "올리는 중…" : url ? "이미지 바꾸기" : "이미지 올리기"}
        </AdminActionButton>
        {url ? <AdminActionButton tone="quiet" disabled={uploading || disabled} onClick={() => { onChange(null); setWarning(null); }}>지우기</AdminActionButton> : null}
      </div>
      <p className="text-xs text-muted">{hint} JPG·PNG·WebP, 5MB까지 원본 그대로 올려요.</p>
      {warning ? <p className="text-xs font-semibold text-warn">{warning}</p> : null}
      {error ? <p role="alert" className="text-xs font-semibold text-fail">{error}</p> : null}
    </div>
  );
}

async function imageSize(file: File): Promise<{ readonly width: number; readonly height: number } | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null;
  }
}
