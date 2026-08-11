"use client";

import { useState } from "react";
import type { Applicant } from "@/features/auditions/types";
import { ApplicantPhotoImage } from "./applicant-photo";

export function DetailGallery({
  applicant,
  onPlayVideo,
}: {
  applicant: Applicant;
  onPlayVideo: () => void;
}) {
  const [index, setIndex] = useState(0);
  const current = Math.min(index, applicant.photos.length - 1);
  const photo = applicant.photos[current];

  return (
    <div className="overflow-y-auto border-b border-border bg-surface px-5 py-5 lg:border-b-0 lg:border-r">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-control border border-border bg-border-soft">
        <ApplicantPhotoImage
          photo={photo}
          alt={`${applicant.name} ${photo?.label ?? "사진"}`}
          sizes="(min-width: 1024px) 392px, 90vw"
          className="object-cover object-[center_18%]"
          priority
        />
        {photo ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-foreground/70 px-2 py-1 text-xs font-semibold text-white">
            {photo.label} · {current + 1}/{applicant.photos.length}
          </span>
        ) : null}
      </div>

      {applicant.photos.length > 1 ? (
        <div className="mt-2 flex gap-2">
          {applicant.photos.map((candidate, slot) => (
            <button
              key={candidate.url}
              type="button"
              aria-pressed={slot === current}
              title={candidate.label}
              onClick={() => setIndex(slot)}
              className={`relative aspect-[3/4] flex-1 overflow-hidden rounded-lg border-2 bg-border-soft transition-[border-color,box-shadow,transform] duration-150 active:scale-[0.97] ${
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
        <p className="mt-2 text-xs text-muted">제출한 사진이 1장입니다.</p>
      )}

      {applicant.videoUrl ? (
        <button
          type="button"
          onClick={onPlayVideo}
          className="mt-3.5 flex w-full items-center gap-3 rounded-control border border-border bg-card px-3 py-3 text-left transition-[background-color,border-color,transform] duration-150 hover:border-brand-line hover:bg-brand-soft active:scale-[0.99]"
        >
          <span className="min-w-0">
            <b className="block text-dense font-semibold">연기 영상 보기</b>
            <span className="block break-all text-xs text-muted">{applicant.videoUrl}</span>
          </span>
        </button>
      ) : (
        <p className="mt-3.5 text-xs text-muted">제출된 영상이 없습니다.</p>
      )}
    </div>
  );
}
