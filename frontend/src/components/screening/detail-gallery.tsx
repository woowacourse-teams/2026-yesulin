"use client";

import { useState } from "react";
import type { Applicant } from "@/features/screening/types";
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
    <div className="overflow-y-auto border-b border-border bg-surface px-5 py-[18px] lg:border-b-0 lg:border-r">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[10px] border border-border bg-border-soft">
        <ApplicantPhotoImage
          photo={photo}
          alt={`${applicant.name} ${photo?.label ?? "사진"}`}
          sizes="(min-width: 1024px) 392px, 90vw"
          className="object-cover object-[center_18%]"
          priority
        />
        {photo ? (
          <span className="absolute bottom-[9px] left-[9px] rounded-full bg-foreground/70 px-[9px] py-[3px] text-[11px] font-semibold text-white">
            {photo.label} · {current + 1}/{applicant.photos.length}
          </span>
        ) : null}
      </div>

      {applicant.photos.length > 1 ? (
        <div className="mt-[9px] flex gap-[7px]">
          {applicant.photos.map((candidate, slot) => (
            <button
              key={candidate.url}
              type="button"
              aria-pressed={slot === current}
              title={candidate.label}
              onClick={() => setIndex(slot)}
              className={`relative aspect-[3/4] flex-1 overflow-hidden rounded-md border-2 bg-border-soft transition-colors ${
                slot === current ? "border-brand" : "border-transparent hover:border-muted-soft"
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
        <p className="mt-[9px] text-xs text-muted">제출한 사진이 1장입니다.</p>
      )}

      {applicant.videoUrl ? (
        <button
          type="button"
          onClick={onPlayVideo}
          className="mt-3.5 flex w-full items-center gap-[11px] rounded-lg border border-border bg-card px-[13px] py-3 text-left transition-colors hover:border-brand-line hover:bg-brand-soft"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand pl-0.5 text-[11px] text-white"
          >
            ▶
          </span>
          <span className="min-w-0">
            <b className="block text-[13.5px] font-semibold">연기 영상 보기</b>
            <span className="block break-all text-[11px] text-muted">{applicant.videoUrl}</span>
          </span>
        </button>
      ) : (
        <p className="mt-3.5 text-xs text-muted">제출된 영상이 없습니다.</p>
      )}
    </div>
  );
}
