"use client";

import { useEffect, useState } from "react";
import type { Applicant } from "@/features/screening/types";
import { MODAL_LAYERS, ModalShell } from "./modal-shell";

const TITLE_ID = "video-modal-title";
const YOUTUBE_ID = /(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/;
const HINT_DELAY_MS = 2600;

const youtubeIdOf = (url: string) => YOUTUBE_ID.exec(url)?.[1] ?? null;

/** 지원자가 바뀌면 새로 마운트되도록 호출부에서 조건부로 렌더링한다. */
export function VideoModal({ applicant, onClose }: { applicant: Applicant; onClose: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);

  /* 임베드가 막히는 영상도 있어 잠시 뒤 '새 창에서 열기'를 안내한다 */
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setHintVisible(true), HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [playing]);

  if (!applicant.videoUrl) return null;
  const videoId = youtubeIdOf(applicant.videoUrl);

  return (
    <ModalShell
      open
      onClose={onClose}
      labelledBy={TITLE_ID}
      layer={MODAL_LAYERS.video}
      scrimClassName="bg-[rgba(10,9,12,0.76)]"
      className="w-[min(880px,94vw)] overflow-hidden rounded-xl bg-foreground shadow-[0_24px_60px_rgba(0,0,0,0.4)]"
    >
      <div className="flex items-center gap-3 px-3.5 py-[11px] text-white">
        <h2 id={TITLE_ID} className="text-sm font-semibold tracking-[-0.01em]">
          {applicant.name}
          <span className="ml-[7px] text-[12.5px] font-normal opacity-60">
            {applicant.roleName} 지원 · 연기 영상
          </span>
        </h2>
        <a
          href={applicant.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto rounded-full border border-white/30 px-[11px] py-1 text-[12.5px] text-white opacity-75 hover:border-white/55 hover:opacity-100"
        >
          새 창에서 열기
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="영상 닫기"
          className="px-1.5 py-[3px] text-lg leading-none text-white/60 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="relative aspect-video bg-black">
        {!videoId ? (
          <p className="absolute inset-0 grid place-items-center content-center px-5 text-center text-[13px] text-white/70">
            재생할 수 없는 링크입니다.
            <br />새 창에서 열어 확인하세요.
          </p>
        ) : playing ? (
          <>
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`}
              title={`${applicant.name} 연기 영상`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="block h-full w-full border-0"
            />
            {hintVisible ? (
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-[9px] rounded-full bg-black/70 py-[7px] pl-3.5 pr-[9px] text-[12.5px] text-white/80">
                재생되지 않나요?
                <a
                  href={applicant.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/35 px-[11px] py-[3px] text-[12.5px] text-white"
                >
                  새 창에서 열기
                </a>
              </div>
            ) : null}
          </>
        ) : (
          <div className="absolute inset-0 grid place-items-center overflow-hidden bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element -- 유튜브 썸네일은 실패 시 조용히 감춘다 */}
            <img
              src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-60"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label="재생"
              className="relative grid h-[76px] w-[76px] place-items-center rounded-full bg-brand/95 pl-[5px] text-2xl text-white shadow-[0_6px_24px_rgba(0,0,0,0.4)] transition-transform hover:scale-105 hover:bg-brand"
            >
              ▶
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
