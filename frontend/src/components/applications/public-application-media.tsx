"use client";

import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { MAX_PHOTO_COUNT, youtubeVideoId } from "@/features/applications/application-form-state";
import { buildApplicationAuthReturnTo } from "@/features/auth/return-to";
import { fieldControlClass, TextButton } from "@/components/ui/controls";
import { usePublicApplication } from "./public-application-context";
import { PublicApplicationPhotoField } from "./public-application-photo-field";

export function PublicApplicationMedia() {
  const { state, actions, meta } = usePublicApplication();
  const fields = meta.steps[state.stepIndex]!.fields;
  const photoField = fields.find((field) => field.inputType === "FILE");
  const requestedPhotos = photoField?.config.photoRequirements?.reduce((sum, item) => sum + item.count, 0);
  const photoLimit = Math.min(MAX_PHOTO_COUNT, Math.max(1, requestedPhotos ?? photoField?.config.maxCount ?? MAX_PHOTO_COUNT));
  const videoField = fields.find((field) => field.inputType === "URL");
  const videoRequirements = videoField?.config.videoRequirements ?? [];
  const loginHref = `/login?returnTo=${encodeURIComponent(buildApplicationAuthReturnTo(meta.postingId, meta.roleIds, "media"))}`;

  return <div className="space-y-10">
    {photoField ? <PublicApplicationPhotoField field={photoField} limit={photoLimit} photos={state.photos} authenticated={meta.authenticated} loginHref={loginHref} error={state.mediaError || (state.stepError.startsWith(photoField.label) ? state.stepError : "")} onChange={actions.updatePhotos} onReady={actions.markPhotoReady} /> : null}
    {videoField && videoRequirements.length > 0 ? <section aria-labelledby={`application-${videoField.id}-title`} className="space-y-6"><div><h2 id={`application-${videoField.id}-title`} className="text-sm font-semibold text-foreground">{videoField.label}{videoField.required ? <span className="ml-1 text-fail" aria-label="필수">*</span> : <span className="ml-1 text-muted">(선택)</span>}</h2><p className="mt-1 text-sm leading-6 text-muted">요청한 영상별로 유튜브 링크를 입력해 주세요. 영상 파일은 받지 않아요.</p></div>{videoRequirements.map((requirement, index) => {
      const fieldId = `${videoField.id}.${requirement.id}`;
      const value = state.values[fieldId] ?? "";
      return <VideoRequirementField key={requirement.id} fieldId={fieldId} label={requirement.description} index={index} required={videoField.required} value={value} error={state.stepError.startsWith(requirement.description) ? state.stepError : ""} onChange={(next) => actions.updateField(fieldId, next)} />;
    })}</section> : null}
    {videoField && videoRequirements.length === 0 ? <VideoField field={videoField} value={state.videoUrl} valid={Boolean(youtubeVideoId(state.videoUrl))} error={state.stepError.startsWith(videoField.label) ? state.stepError : ""} onChange={actions.updateVideo} onClear={() => actions.updateVideo("")} /> : null}
  </div>;
}

function VideoRequirementField({ fieldId, label, index, required, value, error, onChange }: { fieldId: string; label: string; index: number; required: boolean; value: string; error: string; onChange: (value: string) => void }) {
  const videoId = youtubeVideoId(value);
  const valid = Boolean(videoId);
  const invalid = value.length > 0 && !valid;
  const inputId = `application-${fieldId}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const errorMessage = invalid ? "YouTube 링크 형식을 확인해 주세요." : error;
  return <section id={`application-field-${fieldId}`} className="rounded-card border border-border bg-surface p-4"><label htmlFor={inputId} className="text-sm font-semibold text-foreground">{index + 1}. {label}{required ? <span className="ml-1 text-fail" aria-label="필수">*</span> : <span className="ml-1 text-muted">(선택)</span>}</label><p id={helpId} className="mt-1 text-sm leading-6 text-muted">유튜브에 공개 또는 일부공개로 올린 링크를 입력해 주세요.</p><input id={inputId} type="url" value={value} placeholder="https://youtu.be/..." onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(errorMessage) || undefined} aria-describedby={[helpId, errorMessage ? errorId : ""].filter(Boolean).join(" ")} className={`mt-3 ${fieldControlClass} ${errorMessage ? "border-fail focus:border-fail focus:ring-fail-bg" : ""}`} />{errorMessage ? <p id={errorId} role="alert" className="mt-2 text-sm font-medium leading-6 text-fail">{errorMessage}</p> : null}{videoId ? <YoutubePreview videoId={videoId} label={label} value={value} onClear={() => onChange("")} /> : null}</section>;
}

function VideoField({ field, value, valid, error, onChange, onClear }: { field: ApplicationFieldInput; value: string; valid: boolean; error: string; onChange: (value: string) => void; onClear: () => void }) {
  const invalid = value.length > 0 && !valid;
  const inputId = `application-${field.id}`;
  const helpId = `${inputId}-help`;
  const errorId = `${inputId}-error`;
  const errorMessage = invalid ? "YouTube 링크 형식을 확인해 주세요." : error;
  const describedBy = [helpId, errorMessage ? errorId : ""].filter(Boolean).join(" ");
  const videoId = youtubeVideoId(value);
  return <section id={`application-field-${field.id}`}><FieldLabel field={field} htmlFor={inputId} /><p id={helpId} className="mb-3 text-sm leading-6 text-muted">유튜브에 일부공개로 올린 영상의 링크를 입력해 주세요. 영상 파일은 받지 않아요.</p><input id={inputId} type="url" value={value} placeholder={field.config.placeholder ?? "https://youtu.be/..."} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(errorMessage) || undefined} aria-describedby={describedBy} className={`${fieldControlClass} ${errorMessage ? "border-fail focus:border-fail focus:ring-fail-bg" : ""}`} />{errorMessage ? <p id={errorId} role="alert" className="mt-2 text-sm font-medium leading-6 text-fail">{errorMessage}</p> : null}{valid && videoId ? <YoutubePreview videoId={videoId} label={field.label} value={value} onClear={onClear} /> : null}</section>;
}

function YoutubePreview({ videoId, label, value, onClear }: { readonly videoId: string; readonly label: string; readonly value: string; readonly onClear: () => void }) {
  return <div className="mt-3 overflow-hidden rounded-control border border-brand-line bg-card"><p role="status" className="sr-only">{label} 영상 미리보기가 연결되었습니다.</p><div className="aspect-video bg-sidebar"><iframe src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`} title={`${label} 미리보기`} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full w-full border-0" /></div><div className="flex items-center gap-2 px-3 py-2"><span className="min-w-0 flex-1"><strong className="block text-sm text-brand">영상 미리보기</strong><span className="block truncate text-xs text-muted-strong">{value}</span></span><a href={`https://youtu.be/${videoId}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-md px-2 text-xs font-semibold text-brand hover:bg-brand-soft">새 창</a><TextButton onClick={onClear} aria-label={`${label} 영상 삭제`} className="px-2 text-xs hover:bg-fail-bg hover:text-fail">삭제</TextButton></div></div>;
}

function FieldLabel({ field, htmlFor, detail }: { field: ApplicationFieldInput; htmlFor: string; detail?: string }) { return <label htmlFor={htmlFor} className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground">{field.label}{field.required ? <span className="text-fail" aria-label="필수">*</span> : <span className="text-muted">(선택)</span>}{detail ? <span className="ml-auto text-xs font-medium text-muted">{detail}</span> : null}</label>; }
