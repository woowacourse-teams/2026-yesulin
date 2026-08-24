"use client";

import { useEffect } from "react";
import type { Applicant } from "@/features/auditions/types";
import { ApplicantPhotoImage } from "./applicant-photo";
import { MODAL_LAYERS, ModalShell } from "./modal-shell";

const TITLE_ID = "photo-lightbox-title";

export function PhotoLightbox({
  applicant,
  index,
  onSelect,
  onClose,
}: {
  applicant: Applicant;
  index: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const photo = applicant.photos[index];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && index > 0) onSelect(index - 1);
      if (event.key === "ArrowRight" && index < applicant.photos.length - 1) onSelect(index + 1);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [applicant.photos.length, index, onSelect]);

  return (
    <ModalShell
      open
      onClose={onClose}
      labelledBy={TITLE_ID}
      layer={MODAL_LAYERS.video}
      scrimClassName="bg-foreground/85"
      className="flex h-[min(920px,94vh)] w-[min(1080px,94vw)] flex-col overflow-hidden rounded-modal bg-sidebar shadow-[var(--shadow-modal)]"
    >
      <header className="flex min-h-16 items-center gap-3 border-b border-white/10 px-4 text-white md:px-5">
        <h2 id={TITLE_ID} className="min-w-0 flex-1 truncate text-base font-semibold">
          {applicant.name} · {photo?.label ?? "프로필 사진"}
        </h2>
        <span className="num text-sm text-white/65">{index + 1} / {applicant.photos.length}</span>
        <button type="button" onClick={onClose} className="min-h-11 rounded-control px-3 text-sm text-white/75 hover:bg-white/10 hover:text-white">닫기</button>
      </header>

      <div className="relative min-h-0 flex-1 bg-black">
        <div className="relative h-full w-full">
          <ApplicantPhotoImage photo={photo} alt={`${applicant.name} ${photo?.label ?? "사진"} 확대`} sizes="94vw" className="object-contain" priority />
        </div>
        <LightboxArrow label="이전 사진" direction="left" disabled={index === 0} onClick={() => onSelect(index - 1)} />
        <LightboxArrow label="다음 사진" direction="right" disabled={index === applicant.photos.length - 1} onClick={() => onSelect(index + 1)} />
      </div>

      {applicant.photos.length > 1 ? (
        <div className="scrollbar-hidden flex justify-center gap-2 overflow-x-auto border-t border-white/10 px-4 py-3">
          {applicant.photos.map((candidate, slot) => (
            <button key={`${candidate.url}-${slot}`} type="button" aria-pressed={slot === index} onClick={() => onSelect(slot)} className={`relative aspect-[3/4] w-14 shrink-0 overflow-hidden rounded-lg border-2 ${slot === index ? "border-brand" : "border-transparent opacity-65 hover:opacity-100"}`}>
              <ApplicantPhotoImage photo={candidate} alt={candidate.label} sizes="56px" />
            </button>
          ))}
        </div>
      ) : null}
    </ModalShell>
  );
}

function LightboxArrow({ label, direction, disabled, onClick }: { label: string; direction: "left" | "right"; disabled: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={`absolute top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-3xl text-white backdrop-blur-sm hover:bg-white/25 disabled:pointer-events-none disabled:opacity-20 ${direction === "left" ? "left-3" : "right-3"}`}>
      {direction === "left" ? "‹" : "›"}
    </button>
  );
}
