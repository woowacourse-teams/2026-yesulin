"use client";

import type { ChangeEvent } from "react";
import Image from "next/image";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import {
  MAX_PHOTO_COUNT,
  imageFileError,
  youtubeVideoId,
} from "@/features/applications/application-form-state";
import type { ApplicationPhoto } from "@/features/applications/application-form-state";
import { usePublicApplication } from "./public-application-context";

export function PublicApplicationMedia() {
  const { state, actions, meta } = usePublicApplication();
  const fields = meta.steps[state.stepIndex]!.fields;
  const photoField = fields.find((field) => field.inputType === "FILE");
  const videoField = fields.find((field) => field.inputType === "URL");
  const videoId = youtubeVideoId(state.videoUrl);

  const addPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const candidates = Array.from(event.target.files ?? []).slice(0, MAX_PHOTO_COUNT - state.photos.length);
    event.target.value = "";
    if (candidates.length === 0) return;
    const invalid = candidates.map(imageFileError).find(Boolean);
    if (invalid) {
      actions.reportMediaError(invalid);
      return;
    }
    actions.reportMediaError("");
    const additions = candidates.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      url: URL.createObjectURL(file),
      status: "UPLOADING" as const,
    }));
    actions.updatePhotos([...state.photos, ...additions]);
    additions.forEach((photo) => window.setTimeout(() => actions.markPhotoReady(photo.id), 450));
  };

  const removePhoto = (id: string) => {
    const photo = state.photos.find((item) => item.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    actions.updatePhotos(state.photos.filter((item) => item.id !== id));
  };

  const makePrimary = (id: string) => {
    const photo = state.photos.find((item) => item.id === id);
    if (photo) actions.updatePhotos([photo, ...state.photos.filter((item) => item.id !== id)]);
  };

  return <div className="space-y-9">
    {photoField ? <PhotoField field={photoField} photos={state.photos} error={state.mediaError || (state.stepError.includes("사진") ? state.stepError : "")} onAdd={addPhotos} onRemove={removePhoto} onPrimary={makePrimary} /> : null}
    {videoField ? <VideoField field={videoField} value={state.videoUrl} valid={Boolean(videoId)} error={state.stepError.includes("유튜브") ? state.stepError : ""} onChange={actions.updateVideo} onClear={() => actions.updateVideo("")} /> : null}
  </div>;
}

function PhotoField({ field, photos, error, onAdd, onRemove, onPrimary }: { field: ApplicationFieldInput; photos: readonly ApplicationPhoto[]; error: string; onAdd: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: (id: string) => void; onPrimary: (id: string) => void }) {
  const inputId = `application-${field.id}`;
  const errorId = `${inputId}-error`;
  return <section><FieldLabel field={field} htmlFor={inputId} detail={`${photos.length} / ${MAX_PHOTO_COUNT}`} /><input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={photos.length >= MAX_PHOTO_COUNT} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? errorId : undefined} className="sr-only" onChange={onAdd} /><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{photos.map((photo, index) => <PhotoCard key={photo.id} photo={photo} primary={index === 0} onRemove={() => onRemove(photo.id)} onPrimary={() => onPrimary(photo.id)} />)}{photos.length < MAX_PHOTO_COUNT ? <label htmlFor={inputId} className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center rounded-control border border-dashed border-muted-soft bg-surface px-3 text-center text-sm font-semibold text-muted-strong transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"><span className="text-2xl leading-none">+</span><span className="mt-2">사진 추가</span></label> : null}</div><p className="mt-3 text-sm leading-6 text-muted">JPG, PNG, WEBP · 파일당 10MB 이하 · 첫 번째 사진이 대표 사진으로 표시됩니다.</p>{error ? <p id={errorId} role="alert" className="mt-3 text-sm font-medium text-fail">{error}</p> : null}</section>;
}

function PhotoCard({ photo, primary, onRemove, onPrimary }: { photo: ApplicationPhoto; primary: boolean; onRemove: () => void; onPrimary: () => void }) {
  return <div className={`relative aspect-[3/4] overflow-hidden rounded-control border bg-surface ${primary ? "border-brand ring-2 ring-brand-soft" : "border-border"}`}><Image src={photo.url} alt={photo.name} fill unoptimized sizes="(min-width: 640px) 180px, 45vw" className="object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-8 text-xs text-white"><span className="block truncate">{photo.name}</span><span>{photo.status === "UPLOADING" ? "업로드 중…" : primary ? "대표 사진" : "업로드 완료"}</span></div><button type="button" onClick={onRemove} aria-label={`${photo.name} 삭제`} className="absolute right-1 top-1 min-h-8 rounded-md bg-black/65 px-2 text-xs font-semibold text-white hover:bg-black">삭제</button>{!primary && photo.status === "READY" ? <button type="button" onClick={onPrimary} className="absolute left-1 top-1 min-h-8 rounded-md bg-white/90 px-2 text-xs font-semibold text-foreground hover:bg-white">대표로</button> : null}</div>;
}

function VideoField({ field, value, valid, error, onChange, onClear }: { field: ApplicationFieldInput; value: string; valid: boolean; error: string; onChange: (value: string) => void; onClear: () => void }) {
  const invalid = value.length > 0 && !valid;
  const inputId = `application-${field.id}`;
  const errorId = `${inputId}-error`;
  const errorMessage = invalid ? "YouTube 링크 형식을 확인해 주세요." : error;
  return <section><FieldLabel field={field} htmlFor={inputId} /><input id={inputId} type="url" value={value} placeholder={field.config.placeholder ?? "https://youtu.be/..."} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(errorMessage) || undefined} aria-describedby={errorMessage ? errorId : undefined} className={`min-h-12 w-full rounded-control border bg-card px-3 py-2.5 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted-soft focus:ring-2 ${errorMessage ? "border-fail focus:ring-fail-bg" : "border-border focus:border-brand focus:ring-brand-soft"}`} />{errorMessage ? <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-fail">{errorMessage}</p> : <p className="mt-2 text-sm leading-6 text-muted">유튜브에 일부공개로 올린 영상의 링크를 입력해 주세요. 영상 파일은 받지 않아요.</p>}{valid ? <div className="mt-3 flex items-center gap-3 rounded-control border border-border bg-surface p-3"><span className="grid h-10 w-14 place-items-center rounded-md bg-sidebar text-xs font-bold text-white">VIDEO</span><span className="min-w-0 flex-1"><strong className="block text-sm">영상이 연결되었어요</strong><span className="block truncate text-xs text-muted">{value}</span></span><button type="button" onClick={onClear} className="min-h-9 rounded-control px-3 text-sm font-semibold text-muted-strong hover:bg-card hover:text-fail">삭제</button></div> : null}</section>;
}

function FieldLabel({ field, htmlFor, detail }: { field: ApplicationFieldInput; htmlFor: string; detail?: string }) { return <label htmlFor={htmlFor} className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground">{field.label}{field.required ? <span className="text-fail" aria-label="필수">*</span> : <span className="text-muted">(선택)</span>}{detail ? <span className="ml-auto text-xs font-medium text-muted">{detail}</span> : null}</label>; }
