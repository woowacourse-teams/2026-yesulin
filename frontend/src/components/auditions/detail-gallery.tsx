"use client";

import { useState } from "react";
import { selectGalleryIndex } from "@/features/auditions/gallery-navigation";
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
  const current = selectGalleryIndex(index, applicant.photos.length);
  const photo = current === null ? undefined : applicant.photos[current];
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
        <div className="mx-auto mb-3 flex max-w-[448px] items-center justify-between gap-3">
          <h2 className="text-base font-bold text-foreground">제출 사진</h2>
          <span className="num text-xs font-semibold text-muted">
            {current === null ? "0" : current + 1} / {applicant.photos.length}장
          </span>
        </div>
      ) : null}
      <div className={`mx-auto max-w-[448px] ${many ? "lg:grid lg:grid-cols-[72px_minmax(0,1fr)] lg:gap-3" : ""}`}>
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-control border border-border bg-border-soft lg:order-2">
          {photo ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-label={`${applicant.name} ${photo.label} 크게 보기`}
              className="absolute inset-0 z-1 block w-full cursor-zoom-in"
            >
              <ApplicantPhotoImage
                photo={photo}
                alt={`${applicant.name} ${photo.label}`}
                sizes="(min-width: 1024px) 376px, 92vw"
                className="object-cover object-[center_18%]"
                priority
              />
              <span className="absolute right-2 top-2 rounded-full bg-foreground/65 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                크게 보기
              </span>
            </button>
          ) : (
            <div className="grid h-full place-items-center px-6 text-center text-sm text-muted">
              제출된 사진이 없습니다.
            </div>
          )}
          {photo ? (
            <span className="pointer-events-none absolute bottom-2 left-2 z-2 rounded-full bg-foreground/70 px-2 py-1 text-xs font-semibold text-white">
              {photo.label}{reviewLayout || current === null ? "" : ` · ${current + 1}/${applicant.photos.length}`}
            </span>
          ) : null}
          {many && current !== null ? (
            <>
              <GalleryArrow label="이전 사진" direction="left" disabled={current === 0} onClick={selectPrevious} />
              <GalleryArrow label="다음 사진" direction="right" disabled={current === applicant.photos.length - 1} onClick={selectNext} />
            </>
          ) : null}
        </div>

        {many ? (
          <div className="scrollbar-hidden mt-2 flex gap-2 overflow-x-auto pb-1 lg:order-1 lg:mt-0 lg:max-h-[504px] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto lg:pb-0 lg:pr-1">
          {applicant.photos.map((candidate, slot) => (
            <button
              key={candidate.url}
              type="button"
              aria-pressed={slot === current}
              title={candidate.label}
              onClick={() => setIndex(slot)}
              className={`relative aspect-[3/4] w-[62px] shrink-0 overflow-hidden rounded-lg border-2 bg-border-soft transition-[border-color,box-shadow,transform] duration-150 active:scale-[0.97] lg:w-[68px] ${
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
          <p className="mt-2 text-xs text-muted">{photo ? "제출한 사진이 1장입니다." : "사진이 제출되지 않았습니다."}</p>
        )}
      </div>

      {expanded && current !== null ? (
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
