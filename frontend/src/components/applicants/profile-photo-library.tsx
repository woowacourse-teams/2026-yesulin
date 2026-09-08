"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { notifyApplicantProfileChanged } from "@/features/applicants/events";
import type { ApplicantProfilePhoto, ApplicantProfileResponse } from "@/features/applicants/types";
import { MAX_ACTOR_PHOTO_COUNT } from "@/features/files/photo-policy";
import {
  addApplicantProfilePhotos,
  deleteApplicantProfilePhoto,
  makeApplicantProfilePhotoRepresentative,
  moveApplicantProfilePhoto,
} from "@/features/applicants/profile-photo-api";
import { useToast } from "@/components/auditions/toast";
import { AddButton } from "@/components/ui/controls";

export const MAX_LIBRARY_PHOTOS = MAX_ACTOR_PHOTO_COUNT;
const MAX_PROFILE_PHOTO_SIZE = 20 * 1024 * 1024;
const PHOTO_ACTION_CLASS = "inline-flex min-h-10 min-w-0 items-center justify-center whitespace-nowrap rounded-md px-1 text-xs font-semibold transition-colors disabled:pointer-events-none disabled:text-muted-soft";

export function ProfilePhotoLibrary({ profile, onSaved }: { readonly profile: ApplicantProfileResponse; readonly onSaved: (profile: ApplicantProfileResponse) => void }) {
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState(profile.photoLibrary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const persist = async (action: (current: ApplicantProfileResponse) => Promise<ApplicantProfileResponse>, message: string) => {
    setSaving(true);
    setError("");
    try {
      const saved = await action({ ...profile, photoLibrary: photos });
      setPhotos(saved.photoLibrary);
      onSaved(saved);
      notifyApplicantProfileChanged();
      toast(message, { type: "success" });
      return true;
    } catch (cause) {
      console.error("[사진 보관함 저장 실패]", cause);
      setError(cause instanceof Error ? cause.message : "사진 보관함을 저장하지 못했습니다.");
      return false;
    } finally {
      setSaving(false);
    }
  };

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
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-bold">사진 보관함</h3><p className="mt-1 text-sm leading-6 text-muted">최대 3장까지 보관할 수 있어요. 지원서에는 기획사/제작사가 요청한 장수만큼, 최대 3장까지 선택합니다.</p></div><span className="num rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">{photos.length} / {MAX_LIBRARY_PHOTOS}</span></div>
    {photos.length ? (
      <div className="mt-5 grid grid-cols-3 gap-3">
        {photos.map((photo, index) => (
          <article key={photo.id} className={`overflow-hidden rounded-card border bg-surface ${photo.representative ? "border-brand ring-2 ring-brand-soft" : "border-border"}`}>
            <div className="relative aspect-[3/4]">
              <Image src={photo.url} alt={photo.name} fill unoptimized loading="eager" sizes="(min-width: 768px) 200px, 30vw" className="object-cover" />
              {photo.representative ? <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-1 text-xs font-semibold text-white">대표 사진</span> : null}
            </div>
            <div className="p-3">
              <p className="truncate text-xs font-medium">{photo.name}</p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                {photo.representative ? (
                  <span className="grid min-h-10 place-items-center whitespace-nowrap text-xs font-semibold text-brand">현재 대표</span>
                ) : (
                  <button type="button" disabled={saving} onClick={() => void makeRepresentative(photo.id)} className={`${PHOTO_ACTION_CLASS} text-brand hover:bg-card`}>
                    대표 지정
                  </button>
                )}
                <button type="button" disabled={saving} onClick={() => void remove(photo)} className={`${PHOTO_ACTION_CLASS} text-fail hover:bg-fail-bg`}>
                  삭제
                </button>
                <button type="button" disabled={saving || index === 0} onClick={() => move(index, -1)} className={`${PHOTO_ACTION_CLASS} text-muted-strong hover:bg-card`} aria-label={`${photo.name} 앞으로 이동`}>
                  ← 앞으로
                </button>
                <button type="button" disabled={saving || index === photos.length - 1} onClick={() => move(index, 1)} className={`${PHOTO_ACTION_CLASS} text-muted-strong hover:bg-card`} aria-label={`${photo.name} 뒤로 이동`}>
                  뒤로 →
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    ) : <div className="mt-5 rounded-card border border-dashed border-border bg-surface px-5 py-10 text-center"><strong>보관한 사진이 없어요</strong><p className="mt-2 text-sm text-muted">첫 번째로 추가한 사진이 대표 사진으로 설정됩니다.</p></div>}
    <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={addPhotos} />
    {photos.length < MAX_LIBRARY_PHOTOS ? <AddButton disabled={saving} onClick={() => inputRef.current?.click()} className="mt-4 min-h-12 w-full">{saving ? "저장 중…" : "+ 사진 추가"}</AddButton> : null}
    <p className="mt-2 text-xs text-muted">JPG, PNG, WEBP · 파일당 20MB 이하 · 변경 사항은 즉시 저장됩니다.</p>
    {error ? <p role="alert" className="mt-4 rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">{error}</p> : null}
  </div>;
}

function profilePhotoError(file: File) {
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type)) {
    return "JPG, PNG, WEBP 형식의 사진만 추가할 수 있어요.";
  }
  return file.size > MAX_PROFILE_PHOTO_SIZE ? "사진은 파일당 20MB 이하여야 해요." : "";
}
