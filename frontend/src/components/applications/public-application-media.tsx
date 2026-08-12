"use client";

import { useRef } from "react";
import type { ChangeEvent, RefObject } from "react";
import Image from "next/image";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { MAX_PHOTO_COUNT, imageFileError, youtubeVideoId } from "@/features/applications/application-form-state";
import type { ApplicationPhoto } from "@/features/applications/application-form-state";
import { fieldControlClass, TextButton } from "@/components/ui/controls";
import { usePublicApplication } from "./public-application-context";

export function PublicApplicationMedia() {
  const { state, actions, meta } = usePublicApplication();
  const inputRef = useRef<HTMLInputElement>(null);
  const fields = meta.steps[state.stepIndex]!.fields;
  const photoField = fields.find((field) => field.inputType === "FILE");
  const videoField = fields.find((field) => field.inputType === "URL");
  const videoId = youtubeVideoId(state.videoUrl);
  const attachedPhotoCount = state.photos.filter((photo) => photo.status !== "ERROR").length;
  const primaryPhotoId = state.photos.find((photo) => photo.status !== "ERROR")?.id;

  const addPhotos = (event: ChangeEvent<HTMLInputElement>) => {
    const candidates = Array.from(event.target.files ?? []).slice(0, MAX_PHOTO_COUNT - attachedPhotoCount);
    event.target.value = "";
    if (!candidates.length) return;
    const nextPhotos: ApplicationPhoto[] = [];
    const additions: ApplicationPhoto[] = [];
    candidates.forEach((file) => {
      const error = imageFileError(file);
      if (error) nextPhotos.push({ id: crypto.randomUUID(), name: file.name, url: "", status: "ERROR", error });
      else {
        const photo = { id: crypto.randomUUID(), name: file.name, url: URL.createObjectURL(file), blob: file, status: "UPLOADING" as const };
        nextPhotos.push(photo);
        additions.push(photo);
      }
    });
    actions.updatePhotos([...state.photos, ...nextPhotos]);
    additions.forEach((photo) => window.setTimeout(() => actions.markPhotoReady(photo.id), 450));
  };

  const removePhoto = (id: string) => {
    const photo = state.photos.find((item) => item.id === id);
    if (photo?.url) URL.revokeObjectURL(photo.url);
    actions.updatePhotos(state.photos.filter((item) => item.id !== id));
  };

  const makePrimary = (id: string) => {
    const photo = state.photos.find((item) => item.id === id);
    if (photo) actions.updatePhotos([photo, ...state.photos.filter((item) => item.id !== id)]);
  };

  const retryPhoto = (id: string) => {
    actions.updatePhotos(state.photos.filter((photo) => photo.id !== id));
    window.requestAnimationFrame(() => inputRef.current?.click());
  };

  return <div className="space-y-10">
    {photoField ? <PhotoField field={photoField} inputRef={inputRef} photos={state.photos} primaryPhotoId={primaryPhotoId} attachedPhotoCount={attachedPhotoCount} error={state.mediaError || (state.stepError.startsWith(photoField.label) ? state.stepError : "")} onAdd={addPhotos} onRemove={removePhoto} onPrimary={makePrimary} onRetry={retryPhoto} /> : null}
    {videoField ? <VideoField field={videoField} value={state.videoUrl} valid={Boolean(videoId)} error={state.stepError.startsWith(videoField.label) ? state.stepError : ""} onChange={actions.updateVideo} onClear={() => actions.updateVideo("")} /> : null}
  </div>;
}

function PhotoField({ field, inputRef, photos, primaryPhotoId, attachedPhotoCount, error, onAdd, onRemove, onPrimary, onRetry }: { field: ApplicationFieldInput; inputRef: RefObject<HTMLInputElement | null>; photos: readonly ApplicationPhoto[]; primaryPhotoId?: string; attachedPhotoCount: number; error: string; onAdd: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: (id: string) => void; onPrimary: (id: string) => void; onRetry: (id: string) => void }) {
  const inputId = `application-${field.id}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const describedBy = [helpId, error ? errorId : ""].filter(Boolean).join(" ");
  return <section id={`application-field-${field.id}`}><FieldLabel field={field} htmlFor={inputId} detail={`${attachedPhotoCount} / ${MAX_PHOTO_COUNT}`} /><p id={helpId} className="mb-4 text-sm leading-6 text-muted">JPG, PNG, WEBP · 파일당 10MB 이하 · 첫 번째 사진이 대표 사진으로 표시됩니다.</p><input ref={inputRef} id={inputId} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={attachedPhotoCount >= MAX_PHOTO_COUNT} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} className="sr-only" onChange={onAdd} /><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{photos.map((photo) => <PhotoCard key={photo.id} photo={photo} primary={photo.id === primaryPhotoId} onRemove={() => onRemove(photo.id)} onPrimary={() => onPrimary(photo.id)} onRetry={() => onRetry(photo.id)} />)}{attachedPhotoCount < MAX_PHOTO_COUNT ? <button type="button" onClick={() => inputRef.current?.click()} className="flex aspect-[3/4] min-h-11 flex-col items-center justify-center rounded-control border border-dashed border-muted-soft bg-surface px-3 text-center text-sm font-semibold text-muted-strong transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand" aria-label={`${field.label} 파일 선택`}><span aria-hidden="true" className="text-2xl leading-none">+</span><span className="mt-2">사진 선택</span></button> : null}</div>{error ? <p id={errorId} role="alert" className="mt-3 text-sm font-medium leading-6 text-fail">{error}</p> : null}</section>;
}

function PhotoCard({ photo, primary, onRemove, onPrimary, onRetry }: { photo: ApplicationPhoto; primary: boolean; onRemove: () => void; onPrimary: () => void; onRetry: () => void }) {
  if (photo.status === "ERROR") return <article className="flex aspect-[3/4] flex-col rounded-control border border-fail/30 bg-fail-bg p-3"><span aria-hidden="true" className="text-xl text-fail">!</span><strong className="mt-2 text-sm text-fail">첨부 실패</strong><span className="mt-1 line-clamp-2 text-xs leading-5 text-fail">{photo.name}</span><span className="mt-2 line-clamp-2 text-xs leading-5 text-fail">{photo.error}</span><div className="mt-auto flex gap-1"><button type="button" onClick={onRetry} aria-label={`${photo.name} 다시 선택`} className="min-h-11 flex-1 rounded-md bg-card px-2 text-xs font-semibold text-fail hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fail">다시 선택</button><button type="button" onClick={onRemove} aria-label={`${photo.name} 실패한 파일 삭제`} className="min-h-11 rounded-md px-2 text-xs font-semibold text-fail hover:bg-fail/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fail">삭제</button></div></article>;
  const status = photo.status === "UPLOADING" ? "파일 확인 중" : primary ? "대표 사진 · 첨부 완료" : "첨부 완료";
  return <article className={`relative aspect-[3/4] overflow-hidden rounded-control border bg-surface ${primary ? "border-brand ring-2 ring-brand-soft" : "border-border"}`}><Image src={photo.url} alt={photo.name} fill unoptimized sizes="(min-width: 768px) 180px, 45vw" className="object-cover" /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-8 text-xs text-white"><span className="block truncate">{photo.name}</span><span role="status">{status}</span></div><button type="button" onClick={onRemove} aria-label={`${photo.name} 삭제`} className="absolute right-1 top-1 min-h-11 rounded-md bg-black/65 px-2 text-xs font-semibold text-white hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">삭제</button>{!primary && photo.status === "READY" ? <button type="button" onClick={onPrimary} aria-label={`${photo.name} 대표 사진으로 지정`} className="absolute left-1 top-1 min-h-11 rounded-md bg-white/90 px-2 text-xs font-semibold text-foreground hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">대표로</button> : null}</article>;
}

function VideoField({ field, value, valid, error, onChange, onClear }: { field: ApplicationFieldInput; value: string; valid: boolean; error: string; onChange: (value: string) => void; onClear: () => void }) {
  const invalid = value.length > 0 && !valid;
  const inputId = `application-${field.id}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const errorMessage = invalid ? "YouTube 링크 형식을 확인해 주세요." : error;
  const describedBy = [helpId, errorMessage ? errorId : ""].filter(Boolean).join(" ");
  return <section id={`application-field-${field.id}`}><FieldLabel field={field} htmlFor={inputId} /><p id={helpId} className="mb-3 text-sm leading-6 text-muted">유튜브에 일부공개로 올린 영상의 링크를 입력해 주세요. 영상 파일은 받지 않아요.</p><input id={inputId} type="url" value={value} placeholder={field.config.placeholder ?? "https://youtu.be/..."} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(errorMessage) || undefined} aria-describedby={describedBy} className={`${fieldControlClass} ${errorMessage ? "border-fail focus:border-fail focus:ring-fail-bg" : ""}`} />{errorMessage ? <p id={errorId} role="alert" className="mt-2 text-sm font-medium leading-6 text-fail">{errorMessage}</p> : null}{valid ? <div role="status" className="mt-3 flex items-center gap-3 rounded-control border border-brand-line bg-brand-soft p-3"><span aria-hidden="true" className="grid h-10 w-14 place-items-center rounded-md bg-sidebar text-xs font-bold text-white">VIDEO</span><span className="min-w-0 flex-1"><strong className="block text-sm text-brand">영상이 연결되었어요</strong><span className="block truncate text-xs text-muted-strong">{value}</span></span><TextButton onClick={onClear} aria-label="연결한 YouTube 영상 삭제" className="px-3 hover:bg-card hover:text-fail">삭제</TextButton></div> : null}</section>;
}

function FieldLabel({ field, htmlFor, detail }: { field: ApplicationFieldInput; htmlFor: string; detail?: string }) { return <label htmlFor={htmlFor} className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground">{field.label}{field.required ? <span className="text-fail" aria-label="필수">*</span> : <span className="text-muted">(선택)</span>}{detail ? <span className="ml-auto text-xs font-medium text-muted">{detail}</span> : null}</label>; }
