"use client";

import { useState } from "react";
import type { Applicant, ApplicantVideo } from "@/features/auditions/types";
import { VideoModal } from "./video-modal";

const YOUTUBE_ID = /(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/;
const youtubeIdOf = (url: string) => YOUTUBE_ID.exec(url)?.[1] ?? null;

export function ApplicantVideoSection({ applicant }: { applicant: Applicant }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const selectedVideo = applicant.videos[selectedIndex] ?? applicant.videos[0] ?? null;

  return (
    <section className="border-b border-border px-4 py-5 sm:px-6 sm:py-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-foreground">제출 영상</h2>
            {selectedVideo ? <span className="num text-xs text-muted">{selectedIndex + 1} / {applicant.videos.length}</span> : null}
          </div>
          {selectedVideo ? <p className="mt-1 text-sm font-semibold text-foreground">{selectedVideo.label}</p> : null}
          <p className="mt-0.5 text-xs text-muted">공고에서 요청한 항목별로 제출된 영상을 검토합니다.</p>
        </div>
        {selectedVideo ? (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setExpanded(true)} className="min-h-9 rounded-control px-3 text-xs font-semibold text-brand hover:bg-brand-soft">
              크게 보기
            </button>
            <a href={selectedVideo.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center rounded-control px-3 text-xs font-semibold text-muted-strong hover:bg-surface hover:text-foreground">
              새 창
            </a>
          </div>
        ) : null}
      </div>

      {!selectedVideo ? (
        <div className="grid min-h-36 place-items-center rounded-control border border-dashed border-border bg-surface text-sm text-muted">제출된 영상이 없습니다.</div>
      ) : (
        <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_176px]">
          <MainVideo applicant={applicant} video={selectedVideo} />
          {applicant.videos.length > 1 ? (
            <div className="scrollbar-hidden-mobile flex min-w-0 gap-2 overflow-x-auto pb-1 md:h-0 md:min-h-full md:flex-col md:overflow-x-hidden md:overflow-y-auto md:pb-0 md:pr-1" aria-label="제출 영상 목록">
              {applicant.videos.map((video, index) => (
                <VideoListItem
                  key={`${video.url}:${index}`}
                  video={video}
                  index={index}
                  selected={index === selectedIndex}
                  onSelect={() => setSelectedIndex(index)}
                />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {expanded && selectedVideo ? <VideoModal applicant={applicant} video={selectedVideo} onClose={() => setExpanded(false)} /> : null}
    </section>
  );
}

function MainVideo({ applicant, video }: { applicant: Applicant; video: ApplicantVideo }) {
  const videoId = youtubeIdOf(video.url);

  return videoId ? (
    <iframe
      key={video.url}
      src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1`}
      title={`${applicant.name} ${video.label}`}
      allow="encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      className="aspect-video w-full rounded-control border border-border bg-foreground"
    />
  ) : (
    <a href={video.url} target="_blank" rel="noopener noreferrer" className="grid min-h-36 place-items-center rounded-control border border-border bg-surface text-sm font-semibold text-brand hover:border-brand-line">제출 영상 열기</a>
  );
}

function VideoListItem({ video, index, selected, onSelect }: {
  video: ApplicantVideo;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const videoId = youtubeIdOf(video.url);

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${video.label} 선택`}
      onClick={onSelect}
      className={`w-36 shrink-0 overflow-hidden rounded-control border text-left transition-colors md:w-full ${selected ? "border-brand bg-brand-soft shadow-[var(--shadow-selection)]" : "border-border bg-card hover:border-brand-line hover:bg-surface"}`}
    >
      <span className="relative block aspect-video overflow-hidden bg-sidebar">
        {videoId ? (
          // eslint-disable-next-line @next/next/no-img-element -- 외부 YouTube 썸네일은 실패해도 텍스트 선택 항목이 남는다.
          <img src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" />
        ) : <span className="grid h-full place-items-center text-xs text-sidebar-muted">미리보기 없음</span>}
        <span className="num absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">{index + 1}</span>
      </span>
      <span className="block truncate px-2 py-2 text-xs font-semibold text-foreground">{video.label}</span>
    </button>
  );
}
