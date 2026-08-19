"use client";

import Image from "next/image";
import { useId, useState } from "react";
import type { ApplicantAnswer } from "@/features/applicants/types";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { youtubeVideoId } from "@/features/applications/application-form-state";
import { photoSlotLabels, videoSlotLabels } from "@/features/applications/materials";
import { MODAL_LAYERS, ModalShell } from "@/components/auditions/modal-shell";

export function ApplicationSubmissionMaterials({
  fields,
  answers,
}: {
  readonly fields: readonly ApplicationFieldInput[];
  readonly answers: readonly ApplicantAnswer[];
}) {
  const [expandedPhoto, setExpandedPhoto] = useState<number | null>(null);
  const lightboxTitleId = useId();
  const photoField = fields.find((field) => field.enabled && field.section === "MATERIALS" && field.inputType === "FILE");
  const videoField = fields.find((field) => field.enabled && field.section === "MATERIALS" && field.inputType === "URL");
  const photoAnswer = photoField ? answers.find((answer) => answer.key === photoField.id) : undefined;
  const videoAnswer = videoField ? answers.find((answer) => answer.key === videoField.id) : undefined;
  const photos = materialUrls(photoAnswer, true);
  const videos = materialUrls(videoAnswer, false);
  const photoLabels = photoSlotLabels(photoField, photos.length);
  const videoLabels = videoSlotLabels(videoField, videos.length);

  if (!photos.length && !videos.length) return null;

  const currentPhoto = expandedPhoto === null ? null : photos[expandedPhoto];
  const currentLabel = expandedPhoto === null ? "" : photoLabels[expandedPhoto] ?? "제출 사진";
  const previousPhoto = () => setExpandedPhoto((current) => current === null ? null : Math.max(0, current - 1));
  const nextPhoto = () => setExpandedPhoto((current) => current === null ? null : Math.min(photos.length - 1, current + 1));

  return <section className="mt-5 overflow-hidden rounded-card border border-border bg-card">
    <header className="border-b border-border-soft bg-surface px-5 py-4 md:px-6"><h2 className="font-bold">제출한 사진과 영상</h2><p className="mt-1 text-sm leading-6 text-muted">공고에서 요청한 항목 이름과 제출 순서를 그대로 표시합니다.</p></header>
    <div className="space-y-8 p-5 md:p-6">
      {photos.length ? <section aria-labelledby="submitted-photos-title"><div className="flex items-end gap-3"><h3 id="submitted-photos-title" className="text-sm font-bold">사진</h3><span className="num ml-auto text-xs text-muted">{photos.length}장</span></div><ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{photos.map((url, index) => <li key={`${url}-${index}`} className="min-w-0"><button type="button" onClick={() => setExpandedPhoto(index)} className="group block w-full text-left"><span className="relative block aspect-[3/4] overflow-hidden rounded-control border border-border bg-border-soft"><Image src={url} alt={photoLabels[index] ?? `제출 사진 ${index + 1}`} fill unoptimized sizes="(min-width: 768px) 190px, 44vw" className="object-cover transition-transform duration-200 group-hover:scale-[1.02]" /><span className="absolute inset-x-2 bottom-2 rounded-full bg-foreground/70 px-2 py-1 text-center text-xs font-semibold text-white backdrop-blur-sm">눌러서 크게 보기</span></span><strong className="mt-2 block truncate text-sm">{photoLabels[index]}</strong></button></li>)}</ul></section> : null}
      {videos.length ? <section aria-labelledby="submitted-videos-title"><div className="flex items-end gap-3"><h3 id="submitted-videos-title" className="text-sm font-bold">영상</h3><span className="num ml-auto text-xs text-muted">{videos.length}개</span></div><ul className="mt-3 grid gap-4 md:grid-cols-2">{videos.map((url, index) => <VideoCard key={`${url}-${index}`} url={url} label={videoLabels[index] ?? `제출 영상 ${index + 1}`} />)}</ul></section> : null}
    </div>
    {currentPhoto ? <ModalShell open onClose={() => setExpandedPhoto(null)} labelledBy={lightboxTitleId} layer={MODAL_LAYERS.video} className="flex h-[min(92dvh,860px)] w-[min(94vw,980px)] flex-col overflow-hidden rounded-modal bg-card shadow-[var(--shadow-modal)]"><header className="flex min-h-16 items-center gap-3 border-b border-border px-4 md:px-6"><div className="min-w-0 flex-1"><h2 id={lightboxTitleId} className="truncate font-bold">{currentLabel}</h2><p className="num mt-0.5 text-xs text-muted">{expandedPhoto! + 1} / {photos.length}</p></div><button type="button" onClick={() => setExpandedPhoto(null)} className="min-h-11 rounded-control px-3 text-sm font-semibold text-muted-strong hover:bg-surface">닫기</button></header><div className="relative min-h-0 flex-1 bg-foreground"><Image src={currentPhoto} alt={currentLabel} fill unoptimized sizes="94vw" className="object-contain" />{photos.length > 1 ? <><LightboxArrow label="이전 사진" side="left" disabled={expandedPhoto === 0} onClick={previousPhoto} /><LightboxArrow label="다음 사진" side="right" disabled={expandedPhoto === photos.length - 1} onClick={nextPhoto} /></> : null}</div></ModalShell> : null}
  </section>;
}

function materialUrls(answer: ApplicantAnswer | undefined, preferPreview: boolean): readonly string[] {
  const previews = answer?.previewUrls?.filter((url) => Boolean(url.trim())) ?? [];
  if (preferPreview && previews.length) return previews;
  const value = answer?.value;
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  const values = value.filter((candidate): candidate is string => typeof candidate === "string" && Boolean(candidate.trim())).map((candidate) => candidate.trim());
  return preferPreview ? values.filter((url) => /^(?:https?:|data:|blob:|\/)/.test(url)) : values;
}

function VideoCard({ url, label }: { readonly url: string; readonly label: string }) {
  const videoId = youtubeVideoId(url);
  return <li className="overflow-hidden rounded-control border border-border bg-surface"><div className="aspect-video bg-foreground">{videoId ? <iframe src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`} title={label} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" className="h-full w-full border-0" /> : <a href={url} target="_blank" rel="noopener noreferrer" className="grid h-full place-items-center px-4 text-center text-sm font-semibold text-white">영상 링크 열기</a>}</div><div className="flex items-center gap-3 px-4 py-3"><strong className="min-w-0 flex-1 truncate text-sm">{label}</strong><a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-brand hover:underline">새 창</a></div></li>;
}

function LightboxArrow({ label, side, disabled, onClick }: { readonly label: string; readonly side: "left" | "right"; readonly disabled: boolean; readonly onClick: () => void }) {
  return <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={`absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-2xl font-bold text-foreground shadow-[var(--shadow-2)] hover:bg-white disabled:pointer-events-none disabled:opacity-30 ${side === "left" ? "left-3" : "right-3"}`}>{side === "left" ? "‹" : "›"}</button>;
}
