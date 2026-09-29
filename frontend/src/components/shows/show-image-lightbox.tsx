"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MODAL_LAYERS, ModalShell } from "@/components/auditions/modal-shell";

const TITLE_ID = "show-image-lightbox-title";

export function ShowImageLightbox({ title, imageUrls, index, onSelect, onClose }: {
  readonly title: string;
  readonly imageUrls: readonly string[];
  readonly index: number;
  readonly onSelect: (index: number) => void;
  readonly onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const imageFrameRef = useRef<HTMLDivElement>(null);

  const selectImage = useCallback((nextIndex: number) => {
    setZoomed(false);
    onSelect(nextIndex);
  }, [onSelect]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        selectImage(index - 1);
      }
      if (event.key === "ArrowRight" && index < imageUrls.length - 1) {
        event.preventDefault();
        selectImage(index + 1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [imageUrls.length, index, selectImage]);

  useEffect(() => {
    const frame = imageFrameRef.current;
    if (!frame) return;
    const updateScroll = requestAnimationFrame(() => {
      frame.scrollLeft = zoomed ? (frame.scrollWidth - frame.clientWidth) / 2 : 0;
      frame.scrollTop = zoomed ? (frame.scrollHeight - frame.clientHeight) / 2 : 0;
    });
    return () => cancelAnimationFrame(updateScroll);
  }, [zoomed, index]);

  const imageUrl = imageUrls[index];
  if (!imageUrl) return null;

  return (
    <ModalShell
      open
      onClose={onClose}
      labelledBy={TITLE_ID}
      layer={MODAL_LAYERS.video}
      scrimClassName="bg-foreground/85"
      className="flex h-[calc(100dvh-24px)] max-h-[960px] w-[calc(100vw-24px)] max-w-[1200px] flex-col overflow-hidden rounded-modal bg-sidebar shadow-[var(--shadow-modal)]"
    >
      <header className="flex min-h-16 items-center gap-3 border-b border-white/10 px-4 text-white sm:px-5">
        <h2 id={TITLE_ID} className="min-w-0 flex-1 truncate text-base font-semibold text-white">{title} · 상세 이미지</h2>
        <span className="num shrink-0 text-sm text-white/65">{index + 1} / {imageUrls.length}</span>
        <button type="button" onClick={onClose} className="min-h-11 rounded-control px-3 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">닫기</button>
      </header>

      <div ref={imageFrameRef} className="min-h-0 flex-1 overscroll-contain overflow-auto bg-black">
        <div className={zoomed ? "relative h-[200%] w-[200%]" : "relative h-full w-full"}>
          <Image
            key={imageUrl}
            src={imageUrl}
            alt={`${title} 상세 이미지 ${index + 1} 확대`}
            fill
            unoptimized
            sizes="100vw"
            draggable={false}
            className="select-none object-contain"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-2 sm:px-5">
        {imageUrls.length > 1 ? (
          <button type="button" disabled={index === 0} onClick={() => selectImage(index - 1)} className="min-h-11 rounded-control px-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-35">이전</button>
        ) : <span />}
        <button type="button" aria-pressed={zoomed} onClick={() => setZoomed((current) => !current)} className="min-h-11 rounded-control border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10">
          {zoomed ? "맞춤 보기" : "2배 확대"}
        </button>
        {imageUrls.length > 1 ? (
          <button type="button" disabled={index === imageUrls.length - 1} onClick={() => selectImage(index + 1)} className="min-h-11 rounded-control px-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-35">다음</button>
        ) : <span />}
      </div>
    </ModalShell>
  );
}
