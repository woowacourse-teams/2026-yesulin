"use client";

import { useState } from "react";
import type { Applicant } from "@/features/auditions/types";
import { VideoModal } from "./video-modal";

const YOUTUBE_ID = /(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/;

export function ApplicantVideoSection({ applicant }: { applicant: Applicant }) {
  const [expanded, setExpanded] = useState(false);
  const videoId = applicant.videoUrl ? YOUTUBE_ID.exec(applicant.videoUrl)?.[1] ?? null : null;

  return (
    <section className="border-b border-border px-6 py-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-foreground">연기 영상</h2>
          <p className="mt-1 text-xs text-muted">지원자가 제출한 영상을 지원서 안에서 바로 검토할 수 있습니다.</p>
        </div>
        {applicant.videoUrl ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setExpanded(true)} className="min-h-9 rounded-control px-3 text-xs font-semibold text-brand hover:bg-brand-soft">
              크게 보기
            </button>
            <a href={applicant.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-control px-3 text-xs font-semibold text-muted-strong hover:bg-surface hover:text-foreground">
              새 창
            </a>
          </div>
        ) : null}
      </div>

      {!applicant.videoUrl ? (
        <div className="grid min-h-36 place-items-center rounded-control border border-dashed border-border bg-surface text-sm text-muted">제출된 영상이 없습니다.</div>
      ) : videoId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`}
          title={`${applicant.name} 연기 영상`}
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="aspect-video w-full rounded-control border border-border bg-foreground"
        />
      ) : (
        <a href={applicant.videoUrl} target="_blank" rel="noopener noreferrer" className="grid min-h-36 place-items-center rounded-control border border-border bg-surface text-sm font-semibold text-brand hover:border-brand-line">제출 영상 열기</a>
      )}

      {expanded ? <VideoModal applicant={applicant} onClose={() => setExpanded(false)} /> : null}
    </section>
  );
}
