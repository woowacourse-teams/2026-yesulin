"use client";

import { GENDER_LABELS, mismatchText } from "@/features/auditions/labels";
import type { Applicant } from "@/features/auditions/types";
import { ApplicantPhotoImage } from "./applicant-photo";
import { useBoard } from "./board-context";
import { StatusBadge } from "./status-badge";

export function ApplicantCards({ rows }: { rows: readonly Applicant[] }) {
  const { selected, toggleSelected, openApplicant } = useBoard();

  return (
    <div className="grid justify-start gap-3 [grid-template-columns:repeat(auto-fill,minmax(132px,1fr))] sm:[grid-template-columns:repeat(auto-fill,minmax(150px,1fr))] lg:[grid-template-columns:repeat(auto-fill,minmax(196px,228px))] xl:[grid-template-columns:repeat(auto-fill,minmax(210px,244px))] 2xl:[grid-template-columns:repeat(auto-fill,minmax(220px,260px))]">
      {rows.map((applicant, index) => {
        const picked = selected.has(applicant.id);

        return (
          <div
            key={applicant.id}
            className={`relative min-w-0 overflow-hidden rounded-card border transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.995] ${
              picked
                ? "border-brand bg-brand-soft shadow-[var(--shadow-selection)]"
                : "border-border bg-card hover:border-brand-line hover:bg-brand-soft/30"
            }`}
          >
            <button
              type="button"
              onClick={() => openApplicant(applicant.id)}
              className="block w-full text-left"
            >
              <span className="relative block aspect-[3/4] w-full bg-border-soft">
                <ApplicantPhotoImage
                  photo={applicant.photos[0]}
                  alt={`${applicant.name} 프로필 사진`}
                  sizes="(min-width: 640px) 152px, 126px"
                  priority={index === 0}
                />
                {applicant.photos.length > 1 ? (
                  <span className="absolute right-2 top-2 z-2 rounded-full bg-foreground/65 px-1.5 py-0.5 text-xs font-semibold text-white">
                    사진 {applicant.photos.length}
                  </span>
                ) : null}
                {applicant.review.status !== "PENDING" ? (
                  <span className="absolute bottom-2 left-2 z-2">
                    <StatusBadge
                      status={applicant.review.status}
                      memo={applicant.review.memo}
                      size="sm"
                      onPhoto
                    />
                  </span>
                ) : null}
              </span>
              <span className="block px-2 pb-2 pt-2">
                <span className="block text-base font-semibold tracking-[-0.01em] lg:text-dense">
                  {applicant.name}
                </span>
                <span className="num mt-px block text-base text-muted lg:text-xs">
                  {GENDER_LABELS[applicant.gender]} · 만 {applicant.age} · {applicant.height}cm
                </span>
                {applicant.mismatchReasons.length > 0 ? (
                  <span className="mt-1 block text-sm font-semibold text-fail lg:text-xs">
                    조건 불일치 ({mismatchText(applicant.mismatchReasons)})
                  </span>
                ) : null}
              </span>
            </button>

            <label className="absolute left-1 top-1 z-2 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-lg bg-white/90 p-2 leading-none transition-colors hover:bg-white lg:min-h-0 lg:min-w-0">
              <span className="sr-only">{applicant.name} 선택</span>
              <input
                type="checkbox"
                checked={picked}
                onChange={() => toggleSelected(applicant.id)}
                className="m-0 block h-[18px] w-[18px] cursor-pointer accent-brand"
              />
            </label>
          </div>
        );
      })}
    </div>
  );
}
