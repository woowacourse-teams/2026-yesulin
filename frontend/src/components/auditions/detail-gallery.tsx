"use client";

import { useState } from "react";
import type { Applicant } from "@/features/auditions/types";
import { ApplicantPhotoImage } from "./applicant-photo";
import { PhotoLightbox } from "./photo-lightbox";

export function DetailGallery({
  applicant,
  className = "",
  layout = "dialog",
}: {
  applicant: Applicant;
  className?: string;
  layout?: "dialog" | "review";
}) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const current = Math.min(index, applicant.photos.length - 1);
  const photo = applicant.photos[current];
  const many = applicant.photos.length > 1;
  const reviewLayout = layout === "review";
  const borderClass = layout === "review"
    ? ""
    : "border-b border-border lg:border-b-0 lg:border-r";

  const selectPrevious = () => setIndex((slot) => Math.max(0, slot - 1));
  const selectNext = () => setIndex((slot) => Math.min(applicant.photos.length - 1, slot + 1));

  return (
    <section aria-label={reviewLayout ? "제출 사진" : undefined} className={`${borderClass} bg-surface px-4 py-4 md:px-5 md:py-5 ${className}`}>
      {reviewLayout ? (
        <div className="mx-auto mb-3 flex max-w-[240px] items-center justify-between gap-3">
          <h2 className="text-base font-bold text-foreground">제출 사진</h2>
          <span className="num text-xs font-semibold text-muted">{current + 1} / {applicant.photos.length}장</span>
        </div>
      ) : null}
      <div className="relative mx-auto aspect-[3/4] w-full max-w-[240px] overflow-hidden rounded-control border border-border bg-border-soft">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-label={`${applicant.name} ${photo?.label ?? "사진"} 크게 보기`}
          className="absolute inset-0 z-1 block w-full cursor-zoom-in"
        >
          <ApplicantPhotoImage
            photo={photo}
            alt={`${applicant.name} ${photo?.label ?? "사진"}`}
            sizes="240px"
            className="object-cover object-[center_18%]"
            priority
          />
          <span className="absolute right-2 top-2 rounded-full bg-foreground/65 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            크게 보기
          </span>
        </button>
        {photo ? (
          <span className="pointer-events-none absolute bottom-2 left-2 z-2 rounded-full bg-foreground/70 px-2 py-1 text-xs font-semibold text-white">
            {photo.label}{reviewLayout ? "" : ` · ${current + 1}/${applicant.photos.length}`}
          </span>
        ) : null}
        {many ? (
          <>
            <GalleryArrow label="이전 사진" direction="left" disabled={current === 0} onClick={selectPrevious} />
            <GalleryArrow label="다음 사진" direction="right" disabled={current === applicant.photos.length - 1} onClick={selectNext} />
          </>
        ) : null}
      </div>

      {many ? (
        <div className="scrollbar-hidden mx-auto mt-2 flex max-w-[240px] gap-2 overflow-x-auto pb-1">
          {applicant.photos.map((candidate, slot) => (
            <button
              key={candidate.url}
              type="button"
              aria-pressed={slot === current}
              title={candidate.label}
              onClick={() => setIndex(slot)}
              className={`relative aspect-[3/4] w-[62px] shrink-0 overflow-hidden rounded-lg border-2 bg-border-soft transition-[border-color,box-shadow,transform] duration-150 active:scale-[0.97] ${
                slot === current
                  ? "border-brand shadow-[var(--shadow-selection-soft)]"
                  : "border-transparent hover:border-muted-soft"
              }`}
            >
              <span className="sr-only">{candidate.label}</span>
              <ApplicantPhotoImage
                photo={candidate}
                alt=""
                sizes="90px"
                className="object-cover object-[center_18%]"
              />
            </button>
          ))}
        </div>
      ) : (
        <p className="mx-auto mt-2 max-w-[240px] text-xs text-muted">제출한 사진이 1장입니다.</p>
      )}

      {expanded ? (
        <PhotoLightbox
          applicant={applicant}
          index={current}
          onSelect={setIndex}
          onClose={() => setExpanded(false)}
        />
      ) : null}
    </section>
  );
}

function GalleryArrow({ label, direction, disabled, onClick }: { label: string; direction: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`absolute top-1/2 z-3 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/92 text-lg font-bold text-foreground shadow-[var(--shadow-2)] hover:bg-white disabled:pointer-events-none disabled:opacity-30 ${direction === "left" ? "left-2" : "right-2"}`}
    >
      {direction === "left" ? "‹" : "›"}
    </button>
  );
}
