"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, SetStateAction } from "react";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { getApplicantProfile } from "@/features/applicants/api";
import type { ApplicantProfilePhoto } from "@/features/applicants/types";
import { imageFileError } from "@/features/applications/application-form-state";
import type { ApplicationPhoto } from "@/features/applications/application-form-state";
import { photoSlotLabels } from "@/features/applications/materials";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { TrackedLoginLink } from "@/components/analytics/tracked-login-link";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { SecondaryButton, TextButton } from "@/components/ui/controls";
import { trackAnalyticsEvent } from "@/features/analytics/events";

export function PublicApplicationPhotoField({ field, limit, photos, authenticated, authChecking, loginHref, error, onChange }: {
  readonly field: ApplicationFieldInput;
  readonly limit: number;
  readonly photos: readonly ApplicationPhoto[];
  readonly authenticated: boolean;
  readonly authChecking: boolean;
  readonly loginHref: string;
  readonly error: string;
  readonly onChange: (photos: SetStateAction<readonly ApplicationPhoto[]>) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadSlotRef = useRef<number | null>(null);
  const preparingPhotoBySlotRef = useRef(new Map<number, string>());
  const photoPreparationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const labels = photoSlotLabels(field, limit);
  const slotOf = (photo: ApplicationPhoto, index: number) => photo.slotIndex ?? index;
  const photoBySlot = new Map(photos.map((photo, index) => [slotOf(photo, index), photo]));
  const attachedCount = photos.filter((photo) => photo.status !== "ERROR").length;
  const inputId = `application-${field.id}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  useEffect(() => () => { preparingPhotoBySlotRef.current.clear(); }, []);

  const replaceSlot = (slotIndex: number, photo: ApplicationPhoto) => {
    onChange((current) => {
      const remaining = current.filter((candidate, index) => slotOf(candidate, index) !== slotIndex && candidate.id !== photo.id);
      return [...remaining, { ...photo, slotIndex }];
    });
  };
  const openUpload = (slotIndex: number) => {
    uploadSlotRef.current = slotIndex;
    inputRef.current?.click();
  };
  const addPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const slotIndex = uploadSlotRef.current;
    event.target.value = "";
    setPickerSlot(null);
    if (!file || slotIndex === null) return;
    const fileError = imageFileError(file);
    const id = crypto.randomUUID();
    preparingPhotoBySlotRef.current.delete(slotIndex);
    revokeLocalPhotoUrl(photoBySlot.get(slotIndex));
    if (fileError) {
      replaceSlot(slotIndex, { id, name: file.name, url: "", status: "ERROR", error: fileError, slotIndex });
      return;
    }
    preparingPhotoBySlotRef.current.set(slotIndex, id);
    const photo: ApplicationPhoto = { id, name: file.name, url: URL.createObjectURL(file), status: "UPLOADING", slotIndex };
    replaceSlot(slotIndex, photo);
    const preparation = photoPreparationQueueRef.current.then(() => {
      if (preparingPhotoBySlotRef.current.get(slotIndex) !== id) throw new Error("사진 준비가 취소되었습니다.");
      return prepareIndependentPhotoBlob(file);
    });
    photoPreparationQueueRef.current = preparation.then(() => undefined, () => undefined);
    void preparation.then((blob) => {
      if (preparingPhotoBySlotRef.current.get(slotIndex) !== id) return;
      preparingPhotoBySlotRef.current.delete(slotIndex);
      const url = URL.createObjectURL(blob);
      URL.revokeObjectURL(photo.url);
      onChange((current) => current.map((candidate) => candidate.id === id
        ? { ...candidate, url, blob, status: "READY", error: undefined }
        : candidate));
    }).catch((cause: unknown) => {
      if (preparingPhotoBySlotRef.current.get(slotIndex) !== id) return;
      preparingPhotoBySlotRef.current.delete(slotIndex);
      console.error("[지원 사진 준비 실패]", cause);
      URL.revokeObjectURL(photo.url);
      onChange((current) => current.map((candidate) => candidate.id === id
        ? { ...candidate, url: "", status: "ERROR", error: "사진을 읽지 못했어요. 해당 사진을 다시 선택해 주세요." }
        : candidate));
    });
  };
  const removePhoto = (photo: ApplicationPhoto, slotIndex: number) => {
    preparingPhotoBySlotRef.current.delete(slotIndex);
    revokeLocalPhotoUrl(photo);
    onChange((current) => current.filter((candidate, index) => slotOf(candidate, index) !== slotIndex));
  };
  const selectLibraryPhoto = (photo: ApplicantProfilePhoto) => {
    if (pickerSlot === null) return;
    preparingPhotoBySlotRef.current.delete(pickerSlot);
    revokeLocalPhotoUrl(photoBySlot.get(pickerSlot));
    replaceSlot(pickerSlot, { id: photo.id, name: photo.name, url: photo.url, status: "READY", slotIndex: pickerSlot, libraryFileId: photo.fileId });
    setPickerSlot(null);
  };

  return <section id={`application-field-${field.id}`}>
    <label htmlFor={inputId} className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground">{field.label}{field.required ? <span className="text-fail" aria-label="필수">*</span> : <span className="text-muted">(선택)</span>}<span className="num ml-auto text-xs font-medium text-muted">{attachedCount} / {limit}</span></label>
    <p id={helpId} className="mb-4 text-sm leading-6 text-muted">항목마다 사용할 사진을 골라 주세요.</p>
    <input ref={inputRef} id={inputId} type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={Boolean(error) || undefined} aria-describedby={[helpId, error ? errorId : ""].filter(Boolean).join(" ")} className="sr-only" onChange={addPhoto} />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{labels.map((label, slotIndex) => {
      const photo = photoBySlot.get(slotIndex);
      return <PhotoSlot key={`${label}-${slotIndex}`} label={label} photo={photo} onPick={() => setPickerSlot(slotIndex)} onRemove={photo ? () => removePhoto(photo, slotIndex) : undefined} />;
    })}</div>
    <p className="mt-3 text-xs leading-5 text-muted">JPG, PNG, WEBP · 파일당 20MB 이하</p>
    {error ? <p id={errorId} role="alert" className="mt-3 text-sm font-medium leading-6 text-fail">{error}</p> : null}
    <PhotoPickerDialog key={pickerSlot ?? "closed"} open={pickerSlot !== null} slotLabel={pickerSlot === null ? "" : labels[pickerSlot] ?? field.label} authenticated={authenticated} authChecking={authChecking} usedPhotoIds={new Set(photos.map((photo) => photo.id))} loginHref={loginHref} onSelect={selectLibraryPhoto} onUpload={() => { if (pickerSlot !== null) openUpload(pickerSlot); }} onClose={() => setPickerSlot(null)} />
  </section>;
}

async function prepareIndependentPhotoBlob(file: File) {
  const bytes = await file.arrayBuffer();
  const blob = new Blob([bytes], { type: file.type });
  if (blob.size !== file.size) throw new Error("사진 복사 크기가 원본과 일치하지 않습니다.");
  return blob;
}

function revokeLocalPhotoUrl(photo?: ApplicationPhoto) {
  if (photo?.url.startsWith("blob:")) URL.revokeObjectURL(photo.url);
}

function PhotoSlot({ label, photo, onPick, onRemove }: { readonly label: string; readonly photo?: ApplicationPhoto; readonly onPick: () => void; readonly onRemove?: () => void }) {
  if (!photo) return <article className="flex min-h-64 flex-col rounded-card border border-dashed border-muted-soft bg-surface p-4"><strong className="text-sm">{label}</strong><span className="mt-1 text-xs text-muted">사진을 선택해 주세요</span><span aria-hidden="true" className="my-auto text-center text-3xl text-muted-soft">+</span><SecondaryButton onClick={onPick} className="w-full px-3">사진 선택</SecondaryButton></article>;
  if (photo.status === "ERROR") return <article className="flex min-h-64 flex-col rounded-card border border-fail/30 bg-fail-bg p-4"><strong className="text-sm text-fail">{label}</strong><span className="mt-3 text-sm font-semibold text-fail">첨부 실패</span><span className="mt-1 line-clamp-2 text-xs text-fail">{photo.name}</span><span className="mt-2 text-xs leading-5 text-fail">{photo.error}</span><div className="mt-auto grid grid-cols-2 gap-2"><SecondaryButton onClick={onPick} className="px-2 text-xs">다시 선택</SecondaryButton><TextButton onClick={onRemove} className="px-2 text-xs text-fail hover:bg-fail/10 hover:text-fail">삭제</TextButton></div></article>;
  return <article className="overflow-hidden rounded-card border border-border bg-surface"><div className="relative aspect-[3/4]"><Image src={photo.url} alt={`${label} · ${photo.name}`} fill unoptimized loading="eager" sizes="(min-width: 768px) 180px, 45vw" className="object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-12 text-white"><strong className="block truncate text-sm">{label}</strong><span role="status" className="block truncate text-xs text-white/80">{photo.status === "UPLOADING" ? "파일 확인 중" : "선택 완료"}</span></div></div><div className="grid grid-cols-2 gap-1 p-2"><TextButton onClick={onPick} className="px-2 text-xs text-brand">사진 변경</TextButton><TextButton onClick={onRemove} className="px-2 text-xs text-fail hover:bg-fail-bg hover:text-fail">삭제</TextButton></div></article>;
}

/**
 * 보관함과 새 사진을 버튼 두 개로 갈라 두면 슬롯마다 무엇이 다른지 다시 읽어야 한다.
 * 선택 창 하나를 열고 그 안에서 탭으로 나눈다.
 */
function PhotoPickerDialog({ open, slotLabel, authenticated, authChecking, usedPhotoIds, loginHref, onSelect, onUpload, onClose }: { readonly open: boolean; readonly slotLabel: string; readonly authenticated: boolean; readonly authChecking: boolean; readonly usedPhotoIds: ReadonlySet<string>; readonly loginHref: string; readonly onSelect: (photo: ApplicantProfilePhoto) => void; readonly onUpload: () => void; readonly onClose: () => void }) {
  const titleId = useId();
  // 창은 슬롯이 바뀔 때마다 다시 마운트되므로 열릴 때의 상태로 첫 탭을 정한다.
  const [tab, setTab] = useState<"library" | "upload">(authenticated ? "library" : "upload");
  return <ModalShell open={open} onClose={onClose} labelledBy={titleId} placement="responsiveSheet" className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:w-[min(720px,calc(100vw-40px))] md:rounded-modal">
    <DialogHeader id={titleId} title={`${slotLabel} 선택`} subtitle="보관함에서 고르거나 기기에서 새 사진을 올릴 수 있어요." />
    <div role="tablist" aria-label="사진 선택 방법" className="flex gap-2 border-b border-border px-5 md:px-6">
      <PickerTab active={tab === "library"} onClick={() => setTab("library")}>보관함</PickerTab>
      <PickerTab active={tab === "upload"} onClick={() => setTab("upload")}>새 사진</PickerTab>
    </div>
    <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">
      {tab === "upload"
        ? <PhotoUploadPanel onUpload={onUpload} />
        : authChecking
          ? <p role="status" className="py-12 text-center text-sm text-muted">로그인 상태를 확인하고 있어요.</p>
          : !authenticated
            ? <PhotoLibraryLoginPanel loginHref={loginHref} onUpload={() => setTab("upload")} />
            : open ? <PhotoLibraryPanel usedPhotoIds={usedPhotoIds} onSelect={onSelect} /> : null}
    </div>
    <DialogFooter><SecondaryButton onClick={onClose} className="px-5">닫기</SecondaryButton></DialogFooter>
  </ModalShell>;
}

function PickerTab({ active, onClick, children }: { readonly active: boolean; readonly onClick: () => void; readonly children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`min-h-12 border-b-2 px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand ${active ? "border-brand text-brand" : "border-transparent text-muted hover:text-foreground"}`}>{children}</button>;
}

function PhotoUploadPanel({ onUpload }: { readonly onUpload: () => void }) {
  return <div className="rounded-card border border-dashed border-muted-soft bg-surface px-5 py-12 text-center">
    <span aria-hidden="true" className="block text-3xl text-muted-soft">+</span>
    <strong className="mt-3 block">기기에서 새 사진 올리기</strong>
    <p className="mt-2 text-sm leading-6 text-muted">JPG, PNG, WEBP · 파일당 20MB 이하</p>
    <SecondaryButton onClick={onUpload} className="mt-5 px-5">파일 선택</SecondaryButton>
  </div>;
}

function PhotoLibraryLoginPanel({ loginHref, onUpload }: { readonly loginHref: string; readonly onUpload: () => void }) {
  useEffect(() => {
    trackAnalyticsEvent("login_prompt_view", { login_reason: "photo_library" });
  }, []);
  return <div className="space-y-4 text-sm leading-6 text-muted-strong">
    <p className="rounded-control border border-brand-line bg-brand-soft px-4 py-3"><strong className="block text-foreground">보관함은 로그인 후 사용할 수 있어요</strong>로그인해도 작성 내용은 그대로 유지되고, 같은 사진 단계로 돌아옵니다.</p>
    <TrackedLoginLink href={loginHref} analytics={{ entry_point: "photo_library_prompt", login_reason: "photo_library", actor_type: "applicant", return_target: "application_media" }} onTrackedClick={() => trackAnalyticsEvent("login_prompt_action", { login_reason: "photo_library", action: "login" })} className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-brand bg-brand px-4 text-sm font-semibold text-white shadow-[var(--shadow-1)] hover:bg-brand-strong">로그인하고 보관함 사용</TrackedLoginLink>
    <div className="rounded-control bg-surface px-4 py-3">
      <strong className="block text-foreground">로그인 없이 계속할 수도 있어요</strong>
      <TextButton onClick={onUpload} className="mt-1 px-2 text-brand">새 사진 탭에서 파일 올리기</TextButton>
    </div>
    <p className="text-xs leading-5 text-muted">지원서에서는 사진 보관함을 추가·수정·삭제하지 않습니다. 보관함 관리는 로그인 후 프로필에서 할 수 있어요.</p>
  </div>;
}

function PhotoLibraryPanel({ usedPhotoIds, onSelect }: { readonly usedPhotoIds: ReadonlySet<string>; readonly onSelect: (photo: ApplicantProfilePhoto) => void }) {
  const query = useAuditionQuery("application-photo-library", getApplicantProfile, "사진 보관함을 불러오지 못했습니다.");
  const photos = query.data?.photoLibrary ?? [];
  if (query.loading) return <p role="status" className="py-12 text-center text-sm text-muted">사진 보관함을 불러오고 있어요.</p>;
  if (query.error) return <div className="rounded-card border border-fail/25 bg-fail-bg p-5 text-center"><p role="alert" className="text-sm font-medium text-fail">{query.error}</p><SecondaryButton onClick={query.reload} className="mt-4 px-4">다시 시도</SecondaryButton></div>;
  if (!photos.length) return <div className="rounded-card border border-dashed border-border bg-surface px-5 py-12 text-center"><strong>보관함에 사진이 없어요</strong><p className="mt-2 text-sm leading-6 text-muted">새 사진 탭에서 파일을 올려 주세요.</p></div>;
  return <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map((photo) => {
    const used = usedPhotoIds.has(photo.id);
    return <li key={photo.id}><button type="button" disabled={used} onClick={() => onSelect(photo)} className="group w-full overflow-hidden rounded-card border border-border bg-surface text-left transition-colors hover:border-brand-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"><span className="relative block aspect-[3/4]"><Image src={photo.url} alt={photo.name} fill unoptimized loading="eager" sizes="(min-width: 640px) 190px, 44vw" className="object-cover" />{photo.representative ? <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-1 text-xs font-semibold text-white">대표 사진</span> : null}{used ? <span className="absolute inset-x-2 bottom-2 rounded-full bg-foreground/75 px-2 py-1 text-center text-xs font-semibold text-white">이미 사용 중</span> : null}</span><span className="block truncate px-3 py-2 text-sm font-semibold group-hover:text-brand">{photo.name}</span></button></li>;
  })}</ul>;
}
