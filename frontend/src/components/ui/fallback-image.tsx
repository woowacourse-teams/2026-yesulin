"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";
import { SiteIcon } from "./site-icon";

/**
 * 실패한 주소만 기억하므로 이미지 주소가 바뀌면 새 이미지를 다시 시도한다. 기본 대체 표시는 원래 이미지의 클래스와 가로세로
 * 비율을 받아 같은 자리를 차지하고, alt가 빈 장식 이미지는 화면 낭독기에서 숨긴다.
 */
export function FallbackImage({ fallback, ...props }: ImageProps & { readonly fallback?: ReactNode }) {
  const [failedSource, setFailedSource] = useState<ImageProps["src"] | null>(null);
  if (!props.src || failedSource === props.src) {
    if (fallback) return fallback;
    const ratio = !props.fill && typeof props.width === "number" && typeof props.height === "number"
      ? `${props.width} / ${props.height}`
      : undefined;
    const label = props.alt ? `${props.alt} · 이미지를 불러올 수 없어요` : undefined;
    return (
      <span
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        style={ratio ? { aspectRatio: ratio } : undefined}
        className={`${props.fill ? "absolute inset-0" : `relative block w-full ${ratio ? "" : "min-h-48"}`} ${props.className ?? ""}`}
      >
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-border-soft p-3 text-center text-xs text-muted-strong">
          <SiteIcon name="image" size={28} /><span>이미지 준비 중</span>
        </span>
      </span>
    );
  }
  return <Image {...props} alt={props.alt} onError={(event) => { setFailedSource(props.src); props.onError?.(event); }} />;
}
