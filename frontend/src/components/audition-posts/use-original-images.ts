"use client";

import { useMemo, useState } from "react";
import { bodyImageUrls } from "@/features/audition-posts/body-images";

/** 공고 본문 사진을 전체 화면 뷰어로 여는 상태. 링크로 감싼 사진은 원래 링크 동작을 지킨다. */
export function useOriginalImages(bodyHtml: string) {
  const images = useMemo(() => bodyImageUrls(bodyHtml), [bodyHtml]);
  const [index, setIndex] = useState<number | null>(null);

  const openClicked = (target: EventTarget) => {
    const clicked = images.indexOf(clickedBodyImageSource(target));
    if (clicked < 0) return;
    setIndex(clicked);
  };

  return { images, index, open: setIndex, openClicked, close: () => setIndex(null) };
}

function clickedBodyImageSource(target: EventTarget): string {
  if (!(target instanceof HTMLImageElement)) return "";
  if (!target.closest(".post-body") || target.closest("a")) return "";
  return target.getAttribute("src") ?? "";
}
