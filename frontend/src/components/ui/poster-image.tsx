"use client";

import Image from "next/image";
import { useState, type ReactNode, type SyntheticEvent } from "react";

const TALL_POSTER_RATIO = 1.8;

function isTallPoster(image: HTMLImageElement): boolean {
  if (!image.naturalWidth) return false;
  return image.naturalHeight / image.naturalWidth > TALL_POSTER_RATIO;
}

/**
 * 3:4 포스터 틀에 원본 전체를 담고 같은 주소의 흐린 이미지로 여백을 채운다.
 * 아주 긴 세로 공고문은 제목이 있는 윗부분부터 보여 준다.
 */
export function PosterImage({ src, alt, sizes, fallback }: {
  readonly src: string;
  readonly alt: string;
  readonly sizes: string;
  readonly fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  const [tall, setTall] = useState(false);
  if (failed) return fallback;
  const markTall = (event: SyntheticEvent<HTMLImageElement>) => setTall(isTallPoster(event.currentTarget));
  return <>
    <Image src={src} alt="" aria-hidden="true" fill unoptimized sizes={sizes} className="notebook-poster-backdrop" />
    <Image src={src} alt={alt} fill unoptimized sizes={sizes} className="notebook-poster-image"
      data-tall={tall || undefined} onLoad={markTall} onError={() => setFailed(true)} />
  </>;
}
