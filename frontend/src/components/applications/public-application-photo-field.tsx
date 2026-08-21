"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { getApplicantProfile } from "@/features/applicants/api";
import type { ApplicantProfilePhoto } from "@/features/applicants/types";
import { imageFileError } from "@/features/applications/application-form-state";
import type { ApplicationPhoto } from "@/features/applications/application-form-state";
import { photoSlotLabels } from "@/features/applications/materials";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { DialogFooter, DialogHeader, ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryLink, SecondaryButton, TextButton } from "@/components/ui/controls";

export function PublicApplicationPhotoField({ field, limit, photos, authenticated, loginHref, error, onChange, onReady }: {
  readonly field: ApplicationFieldInput;
  readonly limit: number;
  readonly photos: readonly ApplicationPhoto[];
  readonly authenticated: boolean;
  readonly loginHref: string;
  readonly error: string;
  readonly onChange: (photos: readonly ApplicationPhoto[]) => void;
  readonly onReady: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadSlotRef = useRef<number | null>(null);
  const [librarySlot, setLibrarySlot] = useState<number | null>(null);
  const labels = photoSlotLabels(field, limit);
  const slotOf = (photo: ApplicationPhoto, index: number) => photo.slotIndex ?? index;
  const photoBySlot = new Map(photos.map((photo, index) => [slotOf(photo, index), photo]));
  const attachedCount = photos.filter((photo) => photo.status !== "ERROR").length;
  const inputId = `application-${field.id}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;

  const replaceSlot = (slotIndex: number, photo: ApplicationPhoto) => {
    const remaining = photos.filter((candidate, index) => slotOf(candidate, index) !== slotIndex && candidate.id !== photo.id);
    onChange([...remaining, { ...photo, slotIndex }]);
  };
  const openUpload = (slotIndex: number) => {
    uploadSlotRef.current = slotIndex;
    inputRef.current?.click();
  };
  const addPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const slotIndex = uploadSlotRef.current;
    event.target.value = "";
    if (!file || slotIndex === null) return;
    const fileError = imageFileError(file);
    const id = crypto.randomUUID();
    if (fileError) {
      replaceSlot(slotIndex, { id, name: file.name, url: "", status: "ERROR", error: fileError, slotIndex });
      return;
    }
    const photo: ApplicationPhoto = { id, name: file.name, url: URL.createObjectURL(file), blob: file, status: "UPLOADING", slotIndex };
    replaceSlot(slotIndex, photo);
    window.setTimeout(() => onReady(photo.id), 450);
  };
  const removePhoto = (photo: ApplicationPhoto, slotIndex: number) => {
    if (photo.blob && photo.url) URL.revokeObjectURL(photo.url);
    onChange(photos.filter((candidate, index) => slotOf(candidate, index) !== slotIndex));
  };
  const selectLibraryPhoto = (photo: ApplicantProfilePhoto) => {
    if (librarySlot === null) return;
    replaceSlot(librarySlot, { id: photo.id, name: photo.name, url: photo.url, status: "READY", slotIndex: librarySlot });
    setLibrarySlot(null);
  };

  return <section id={`application-field-${field.id}`}>
    <label htmlFor={inputId} className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground">{field.label}{field.required ? <span className="text-fail" aria-label="필수">*</span> : <span className="text-muted">(선택)</span>}<span className="num ml-auto text-xs font-medium text-muted">{attachedCount} / {limit}</span></label>
    <p id={helpId} className="mb-4 text-sm leading-6 text-muted">각 제출 항목에 사용할 사진을 직접 골라 주세요. 로그인하면 보관함 사진을 재사용할 수 있고, 새 사진도 추가할 수 있어요.</p>
    <input ref={inputRef} id={inputId} type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={Boolean(error) || undefined} aria-describedby={[helpId, error ? errorId : ""].filter(Boolean).join(" ")} className="sr-only" onChange={addPhoto} />
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">{labels.map((label, slotIndex) => {
      const photo = photoBySlot.get(slotIndex);
      return <PhotoSlot key={`${label}-${slotIndex}`} label={label} photo={photo} authenticated={authenticated} onLibrary={() => setLibrarySlot(slotIndex)} onUpload={() => openUpload(slotIndex)} onRemove={photo ? () => removePhoto(photo, slotIndex) : undefined} />;
    })}</div>
    <p className="mt-3 text-xs leading-5 text-muted">JPG, PNG, WEBP · 파일당 10MB 이하 · 선택 내용은 이 지원서 Draft에만 저장됩니다.</p>
    {error ? <p id={errorId} role="alert" className="mt-3 text-sm font-medium leading-6 text-fail">{error}</p> : null}
    {authenticated ? <PhotoLibraryDialog open={librarySlot !== null} slotLabel={librarySlot === null ? "" : labels[librarySlot] ?? field.label} usedPhotoIds={new Set(photos.map((photo) => photo.id))} onSelect={selectLibraryPhoto} onClose={() => setLibrarySlot(null)} /> : <PhotoLibraryLoginDialog open={librarySlot !== null} slotLabel={librarySlot === null ? "" : labels[librarySlot] ?? field.label} loginHref={loginHref} onClose={() => setLibrarySlot(null)} />}
  </section>;
}

function PhotoSlot({ label, photo, authenticated, onLibrary, onUpload, onRemove }: { readonly label: string; readonly photo?: ApplicationPhoto; readonly authenticated: boolean; readonly onLibrary: () => void; readonly onUpload: () => void; readonly onRemove?: () => void }) {
  if (!photo) return <article className="flex min-h-64 flex-col rounded-card border border-dashed border-muted-soft bg-surface p-4"><strong className="text-sm">{label}</strong><span className="mt-1 text-xs text-muted">사진을 선택해 주세요</span><span aria-hidden="true" className="my-auto text-center text-3xl text-muted-soft">+</span><div className="grid gap-2"><SecondaryButton onClick={onLibrary} className="w-full px-3">보관함에서 선택</SecondaryButton>{!authenticated ? <span className="text-center text-xs leading-5 text-muted">로그인 후 사용할 수 있어요</span> : null}<TextButton onClick={onUpload} className="w-full border border-border bg-card px-3 hover:border-brand-line hover:bg-brand-soft hover:text-brand">새 사진 선택</TextButton></div></article>;
  if (photo.status === "ERROR") return <article className="flex min-h-64 flex-col rounded-card border border-fail/30 bg-fail-bg p-4"><strong className="text-sm text-fail">{label}</strong><span className="mt-3 text-sm font-semibold text-fail">첨부 실패</span><span className="mt-1 line-clamp-2 text-xs text-fail">{photo.name}</span><span className="mt-2 text-xs leading-5 text-fail">{photo.error}</span><div className="mt-auto grid grid-cols-2 gap-2"><SecondaryButton onClick={onUpload} className="px-2 text-xs">다시 선택</SecondaryButton><TextButton onClick={onRemove} className="px-2 text-xs text-fail hover:bg-fail/10 hover:text-fail">삭제</TextButton></div></article>;
  return <article className="overflow-hidden rounded-card border border-border bg-surface"><div className="relative aspect-[3/4]"><Image src={photo.url} alt={`${label} · ${photo.name}`} fill unoptimized loading="eager" sizes="(min-width: 768px) 180px, 45vw" className="object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-12 text-white"><strong className="block truncate text-sm">{label}</strong><span role="status" className="block truncate text-xs text-white/80">{photo.status === "UPLOADING" ? "파일 확인 중" : "선택 완료"}</span></div></div><div className="grid grid-cols-2 gap-1 p-2"><TextButton onClick={onLibrary} className="px-2 text-xs text-brand">보관함 변경</TextButton><TextButton onClick={onUpload} className="px-2 text-xs">새 사진</TextButton><TextButton onClick={onRemove} className="col-span-2 px-2 text-xs text-fail hover:bg-fail-bg hover:text-fail">삭제</TextButton></div>{!authenticated ? <p className="border-t border-border-soft px-3 py-2 text-center text-xs text-muted">보관함은 로그인 후 사용할 수 있어요</p> : null}</article>;
}

function PhotoLibraryLoginDialog({ open, slotLabel, loginHref, onClose }: { readonly open: boolean; readonly slotLabel: string; readonly loginHref: string; readonly onClose: () => void }) {
  const titleId = useId();
  return <ModalShell open={open} onClose={onClose} labelledBy={titleId} placement="responsiveSheet" className="w-full overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:w-[min(520px,calc(100vw-32px))] md:rounded-modal">
    <DialogHeader id={titleId} title={`${slotLabel} 보관함 선택은 로그인이 필요해요`} subtitle="로그인하면 프로필에 보관한 사진을 이 지원서에서 골라 쓸 수 있어요." />
    <div className="space-y-3 px-5 py-6 text-sm leading-6 text-muted-strong md:px-6">
      <p className="rounded-control border border-brand-line bg-brand-soft px-4 py-3"><strong className="block text-foreground">작성 내용은 그대로 유지됩니다</strong>로그인 후 같은 지원서의 사진 단계로 돌아와 계속 작성할 수 있어요.</p>
      <p className="rounded-control bg-surface px-4 py-3"><strong className="block text-foreground">로그인 없이도 새 사진을 선택할 수 있어요</strong>이 창을 닫고 해당 슬롯의 새 사진 선택을 사용해 주세요.</p>
      <p className="text-xs leading-5 text-muted">지원서에서는 사진 보관함을 추가·수정·삭제하지 않습니다. 보관함 관리는 로그인 후 프로필에서 할 수 있어요.</p>
    </div>
    <DialogFooter><SecondaryButton onClick={onClose}>계속 작성</SecondaryButton><PrimaryLink href={loginHref}>로그인하고 보관함 사용</PrimaryLink></DialogFooter>
  </ModalShell>;
}

function PhotoLibraryDialog({ open, slotLabel, usedPhotoIds, onSelect, onClose }: { readonly open: boolean; readonly slotLabel: string; readonly usedPhotoIds: ReadonlySet<string>; readonly onSelect: (photo: ApplicantProfilePhoto) => void; readonly onClose: () => void }) {
  const titleId = useId();
  const query = useAuditionQuery("application-photo-library", getApplicantProfile, "사진 보관함을 불러오지 못했습니다.");
  const photos = query.data?.photoLibrary ?? [];
  return <ModalShell open={open} onClose={onClose} labelledBy={titleId} placement="responsiveSheet" className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-modal bg-card shadow-[var(--shadow-modal)] md:w-[min(720px,calc(100vw-40px))] md:rounded-modal">
    <DialogHeader id={titleId} title={`${slotLabel} 선택`} subtitle="이 지원서에 사용할 보관함 사진 한 장을 골라 주세요. 보관함 관리는 프로필에서 할 수 있어요." />
    <div className="min-h-0 flex-1 overflow-y-auto p-5 md:p-6">{query.loading ? <p role="status" className="py-12 text-center text-sm text-muted">사진 보관함을 불러오고 있어요.</p> : query.error ? <div className="rounded-card border border-fail/25 bg-fail-bg p-5 text-center"><p role="alert" className="text-sm font-medium text-fail">{query.error}</p><SecondaryButton onClick={query.reload} className="mt-4 px-4">다시 시도</SecondaryButton></div> : photos.length ? <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map((photo) => {
      const used = usedPhotoIds.has(photo.id);
      return <li key={photo.id}><button type="button" disabled={used} onClick={() => onSelect(photo)} className="group w-full overflow-hidden rounded-card border border-border bg-surface text-left transition-colors hover:border-brand-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50"><span className="relative block aspect-[3/4]"><Image src={photo.url} alt={photo.name} fill unoptimized loading="eager" sizes="(min-width: 640px) 190px, 44vw" className="object-cover" />{photo.representative ? <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-1 text-xs font-semibold text-white">대표 사진</span> : null}{used ? <span className="absolute inset-x-2 bottom-2 rounded-full bg-foreground/75 px-2 py-1 text-center text-xs font-semibold text-white">이미 사용 중</span> : null}</span><span className="block truncate px-3 py-2 text-sm font-semibold group-hover:text-brand">{photo.name}</span></button></li>;
    })}</ul> : <div className="rounded-card border border-dashed border-border bg-surface px-5 py-12 text-center"><strong>보관함에 사진이 없어요</strong><p className="mt-2 text-sm leading-6 text-muted">창을 닫고 새 사진을 선택해 주세요.</p></div>}</div>
    <DialogFooter><SecondaryButton onClick={onClose} className="px-5">닫기</SecondaryButton></DialogFooter>
  </ModalShell>;
}
