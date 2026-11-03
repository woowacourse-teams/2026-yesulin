"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { notifyApplicantProfileChanged } from "@/features/applicants/events";
import type { ApplicantProfilePhoto, ApplicantProfileResponse } from "@/features/applicants/types";
import { MAX_ACTOR_PHOTO_COUNT } from "@/features/files/photo-policy";
import { pageRepresentativePhoto } from "@/features/actor-pages/settings";
import {
  addApplicantProfilePhotos,
  deleteApplicantProfilePhoto,
  makeApplicantProfilePhotoRepresentative,
  moveApplicantProfilePhoto,
  changeApplicantProfilePhotoVisibility,
  prepareApplicantPhotoPublicCopies,
} from "@/features/applicants/profile-photo-api";
import { useToast } from "@/components/auditions/toast";
import { AddButton, PrimaryButton } from "@/components/ui/controls";

export const MAX_LIBRARY_PHOTOS = MAX_ACTOR_PHOTO_COUNT;
const MAX_PROFILE_PHOTO_SIZE = 20 * 1024 * 1024;
const PHOTO_ACTION_CLASS = "inline-flex min-h-11 min-w-0 items-center justify-center whitespace-nowrap rounded-md px-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:text-muted-soft";

export function ProfilePhotoLibrary({ profile, onSaved, onContinue, pagePublic = false }: { readonly profile: ApplicantProfileResponse; readonly onSaved: (profile: ApplicantProfileResponse) => void; readonly onContinue?: () => void; readonly pagePublic?: boolean }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const photos = profile.photoLibrary;
  const pageRepresentative = pageRepresentativePhoto(pagePublic ? photos.filter((photo) => photo.publicCopyUrl) : photos);
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const persist = async (action: (current: ApplicantProfileResponse) => Promise<ApplicantProfileResponse>, message: string) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const saved = await action({ ...profile, photoLibrary: photos });
      onSaved(saved);
      notifyApplicantProfileChanged();
      toast(message, { type: "success" });
      return true;
    } catch (cause) {
      console.error("[사진 보관함 저장 실패]", cause);
      setError(cause instanceof Error ? cause.message : "사진 보관함을 저장하지 못했습니다.");
      return false;
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const togglePublic = (photo: ApplicantProfilePhoto) => persist(async (current) => {
    let next = await changeApplicantProfilePhotoVisibility(current, photo.id, photo.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC");
    // 공개 중인 페이지는 사본 준비 실패 후에도 서버에 저장된 공개 범위를 먼저 반영한다.
    onSaved(next);
    if (pagePublic && photo.visibility !== "PUBLIC") {
      const prepared = await prepareApplicantPhotoPublicCopies(next);
      next = prepared.profile;
      onSaved(next);
      if (prepared.failedPhotoIds.length) throw new Error("공개 범위는 저장했지만 사진을 페이지에 올리지 못했어요. 해당 사진의 다시 시도를 눌러 주세요.");
    }
    return next;
  }, "사진 공개 범위를 저장했어요.");
  const retryPublicCopies = () => persist(async (current) => {
    const prepared = await prepareApplicantPhotoPublicCopies(current);
    onSaved(prepared.profile);
    if (prepared.failedPhotoIds.length) throw new Error("사진을 페이지에 올리지 못했어요. 잠시 후 다시 시도해 주세요.");
    return prepared.profile;
  }, "사진을 페이지에 올렸어요.");
  const makePageRepresentative = (index: number) => persist(
    (current) => moveApplicantProfilePhoto(current, index, photos.findIndex((photo) => photo.visibility === "PUBLIC")),
    "페이지 대표사진을 변경했어요.",
  );

  const addPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    const invalid = selected.map(profilePhotoError).find(Boolean);
    if (invalid) { setError(invalid); return; }
    const files = selected.slice(0, MAX_LIBRARY_PHOTOS - photos.length);
    if (!files.length) { setError("사진은 최대 3장까지 보관할 수 있어요."); return; }
    await persist(
      (current) => addApplicantProfilePhotos(current, files),
      `${files.length}장의 사진을 보관함에 추가했어요.`,
    );
  };

  const remove = async (photo: ApplicantProfilePhoto) => {
    if (await persist(
      (current) => deleteApplicantProfilePhoto(current, photo),
      "사진을 보관함에서 삭제했어요.",
    ) && photo.url.startsWith("blob:")) URL.revokeObjectURL(photo.url);
  };

  const makeRepresentative = (id: string) => persist(
    (current) => makeApplicantProfilePhotoRepresentative(current, id),
    "대표 프로필 사진을 변경했어요.",
  );
  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset;
    if (target < 0 || target >= photos.length) return;
    void persist(
      (current) => moveApplicantProfilePhoto(current, index, target),
      "사진 순서를 변경했어요.",
    );
  };

  return <div className="mt-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-bold">사진 추가와 공개 설정</h3><p className="mt-1 text-sm leading-6 text-muted">사진을 추가한 뒤 페이지에 보여 줄 사진만 골라 주세요. 추가한 사진은 처음에는 비공개예요.</p></div><span className="num rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">{photos.length} / {MAX_LIBRARY_PHOTOS}</span></div>
    <p className="mt-3 text-xs leading-5 text-muted-strong">첫 사진은 지원서 대표, 첫 공개 사진은 페이지 대표예요. 앞뒤 버튼으로 순서를 바꿀 수 있어요.{pagePublic ? " 마지막 공개 사진을 숨기거나 삭제하면 페이지도 비공개로 바뀌어요." : ""}</p>
    {photos.length ? (
      <div className="profile-photo-grid mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {photos.map((photo, index) => (
          <article key={photo.id} className={`profile-photo-card min-w-0 overflow-hidden rounded-card border bg-surface ${photo.representative ? "border-brand ring-2 ring-brand-soft" : "border-border"}`}>
            <div className="profile-photo-image relative aspect-[3/4]">
              <Image src={photo.url} alt={photo.name} fill unoptimized loading="eager" sizes="(min-width: 768px) 200px, 30vw" className="object-cover" />
              <div className="absolute left-1 top-1 grid gap-1">{photo.id === pageRepresentative?.id ? <span className="rounded bg-brand px-1 py-1 text-[10px] font-semibold text-white">페이지 대표</span> : null}{photo.representative ? <span className="rounded bg-foreground/80 px-1 py-1 text-[10px] font-semibold text-white">지원서 대표</span> : null}</div>
            </div>
            <div className="p-3">
              <p className="truncate text-xs font-medium">{photo.name}</p>
              <button type="button" role="switch" aria-checked={photo.visibility === "PUBLIC"} aria-label={`${photo.name} 페이지 공개`} disabled={saving} onClick={() => void togglePublic(photo)} className="mt-1 flex min-h-11 w-full items-center justify-between gap-2 text-xs font-semibold">
                <span>{photo.visibility === "PUBLIC" ? "페이지에 공개" : "페이지에 비공개"}</span>
                <span aria-hidden="true" className={`relative h-6 w-11 shrink-0 rounded-full ${photo.visibility === "PUBLIC" ? "bg-brand" : "bg-border"}`}><span className={`absolute top-0.5 size-5 rounded-full bg-white ${photo.visibility === "PUBLIC" ? "left-[22px]" : "left-0.5"}`} /></span>
              </button>
              {photo.visibility === "PUBLIC" && photo.id !== pageRepresentative?.id ? <button type="button" aria-label={`${photo.name} 페이지 대표로 지정`} disabled={saving || (pagePublic && !photo.publicCopyUrl)} onClick={() => void makePageRepresentative(index)} className={`${PHOTO_ACTION_CLASS} w-full border border-border text-brand`}>페이지 대표로</button> : null}
              {pagePublic && photo.visibility === "PUBLIC" && !photo.publicCopyUrl ? <p className="text-xs leading-5 text-fail">페이지에 아직 올라가지 않았어요. <button type="button" disabled={saving} onClick={() => void retryPublicCopies()} className="min-h-11 font-semibold underline">다시 시도</button></p> : null}
              <div className="mt-2 grid grid-cols-2 gap-1">
                {photo.representative ? (
                  <span className="grid min-h-11 place-items-center whitespace-nowrap text-xs font-semibold text-brand">현재 대표</span>
                ) : (
                  <button type="button" disabled={saving} onClick={() => void makeRepresentative(photo.id)} className={`${PHOTO_ACTION_CLASS} text-brand hover:bg-card`}>
                    지원서 대표로
                  </button>
                )}
                <button type="button" disabled={saving} onClick={() => void remove(photo)} className={`${PHOTO_ACTION_CLASS} text-fail hover:bg-fail-bg`}>
                  삭제
                </button>
                <button type="button" disabled={saving || index === 0} onClick={() => move(index, -1)} className={`${PHOTO_ACTION_CLASS} text-muted-strong hover:bg-card`} aria-label={`${photo.name} 앞으로 이동`}>
                  앞으로
                </button>
                <button type="button" disabled={saving || index === photos.length - 1} onClick={() => move(index, 1)} className={`${PHOTO_ACTION_CLASS} text-muted-strong hover:bg-card`} aria-label={`${photo.name} 뒤로 이동`}>
                  뒤로
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    ) : <div className="mt-5 rounded-card border border-dashed border-border bg-surface px-5 py-10 text-center"><strong>보관한 사진이 없어요</strong><p className="mt-2 text-sm text-muted">첫 번째로 추가한 사진이 대표 사진으로 설정됩니다.</p></div>}
    <input ref={inputRef} type="file" aria-label="프로필 사진 파일 선택" tabIndex={-1} accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={addPhotos} />
    {photos.length < MAX_LIBRARY_PHOTOS ? <AddButton disabled={saving} onClick={() => inputRef.current?.click()} className="mt-4 min-h-12 w-full">{saving ? "저장 중…" : "+ 사진 추가"}</AddButton> : null}
    <p className="mt-2 text-xs text-muted">JPG, PNG, WEBP · 파일당 20MB 이하 · 변경 사항은 즉시 저장됩니다.</p>
    {error ? <p role="alert" className="mt-4 rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">{error}</p> : null}
    {onContinue ? <div className="mt-6 border-t border-border-soft pt-5"><PrimaryButton onClick={onContinue} disabled={saving || !photos.some((photo) => photo.visibility === "PUBLIC")} className="w-full sm:w-auto">다음: 페이지 공개</PrimaryButton>{!photos.some((photo) => photo.visibility === "PUBLIC") ? <p className="mt-2 text-sm text-muted">페이지에 보여 줄 사진을 한 장 이상 공개로 바꿔 주세요.</p> : null}</div> : null}
  </div>;
}

function profilePhotoError(file: File) {
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
    return "JPG, PNG, WEBP 형식의 사진만 추가할 수 있어요.";
  }
  return file.size > MAX_PROFILE_PHOTO_SIZE ? "사진은 파일당 20MB 이하여야 해요." : "";
}
