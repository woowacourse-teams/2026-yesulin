"use client";

import { GENDER_LABELS, mismatchText } from "@/features/auditions/labels";
import type { Applicant } from "@/features/auditions/types";
import { ApplicantPhotoImage } from "./applicant-photo";
import { useBoard } from "./board-context";
import { StatusBadge } from "./status-badge";

export function ApplicantCards({ rows }: { rows: readonly Applicant[] }) {
  const { selected, toggleSelected, openApplicant } = useBoard();

  return (
    <div className="grid grid-cols-1 gap-4 sm:justify-start sm:[grid-template-columns:repeat(auto-fill,minmax(220px,280px))]">
      {rows.map((applicant, index) => {
        const picked = selected.has(applicant.id);

        return (
          <article
            key={applicant.id}
            className={`group relative min-w-0 overflow-hidden rounded-card border bg-card transition-[background-color,border-color,box-shadow,transform] duration-150 active:scale-[0.995] ${
              picked
                ? "border-brand shadow-[var(--shadow-selection)]"
                : "border-border hover:border-brand-line hover:shadow-[var(--shadow-1)]"
            }`}
          >
            <button type="button" onClick={() => openApplicant(applicant.id)} className="block w-full text-left">
              <span className="relative block aspect-[4/5] w-full overflow-hidden bg-border-soft">
                <ApplicantPhotoImage
                  photo={applicant.photos[0]}
                  alt={`${applicant.name} 프로필 사진`}
                  sizes="(min-width: 1024px) 280px, (min-width: 640px) 240px, 90vw"
                  priority={index === 0}
                  className="object-cover object-[center_20%] transition-transform duration-200 group-hover:scale-[1.015]"
                />
                <span className="absolute right-3 top-3 z-2 rounded-full bg-foreground/65 px-2 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  사진 {applicant.photos.length}장
                </span>
                <span className="absolute bottom-3 left-3 z-2">
                  {applicant.review.status === "PENDING" ? (
                    <span className="rounded-full bg-white/92 px-2.5 py-1 text-xs font-semibold text-foreground shadow-[var(--shadow-1)]">검토 대기</span>
                  ) : (
                    <StatusBadge status={applicant.review.status} memo={applicant.review.memo} size="sm" onPhoto />
                  )}
                </span>
              </span>

              <span className="block p-4">
                <span className="flex min-w-0 items-start justify-between gap-3">
                  <span className="min-w-0">
                    <strong className="block truncate text-lg font-bold tracking-[-0.015em] group-hover:text-brand">{applicant.name}</strong>
                    <span className="num mt-0.5 block text-sm leading-5 text-muted">
                      {GENDER_LABELS[applicant.gender]} · 만 {applicant.age}세 · {measurementText(applicant.height, "cm", "키 미수집")} · {measurementText(applicant.weight, "kg", "몸무게 미수집")}
                    </span>
                  </span>
                  {applicant.mismatchReasons.length > 0 ? (
                    <span className="shrink-0 rounded-full border border-fail/30 bg-fail-bg px-2 py-1 text-xs font-semibold text-fail" title={`조건 불일치: ${mismatchText(applicant.mismatchReasons)}`}>조건 불일치</span>
                  ) : null}
                </span>

                <span className="mt-3 block truncate text-sm text-muted-strong">{applicant.school}</span>
                <span className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="rounded-lg bg-surface px-2 py-1">{applicant.videos.length > 0 ? `영상 ${applicant.videos.length}개` : "영상 없음"}</span>
                  <span className="num">{submittedDate(applicant.submittedAt)} 접수</span>
                </span>

                <span className="mt-4 flex items-center justify-between border-t border-border-soft pt-3 text-sm font-semibold text-muted-strong group-hover:text-brand">
                  지원서 검토
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="m7.5 4.5 5 5-5 5" /></svg>
                </span>
              </span>
            </button>

            <label className="absolute left-2 top-2 z-3 inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-control bg-white/92 p-2 shadow-[var(--shadow-1)] transition-colors hover:bg-white lg:min-h-10 lg:min-w-10">
              <span className="sr-only">{applicant.name} 선택</span>
              <input type="checkbox" checked={picked} onChange={() => toggleSelected(applicant.id)} className="m-0 block h-[18px] w-[18px] cursor-pointer accent-brand" />
            </label>
          </article>
        );
      })}
    </div>
  );
}

function submittedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric" }).format(date);
}

function measurementText(value: number | null, unit: string, empty: string) {
  return value === null ? empty : `${value}${unit}`;
}
