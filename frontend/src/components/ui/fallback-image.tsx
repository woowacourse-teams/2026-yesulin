"use client";

import Image, { type ImageProps } from "next/image";
import { useState, type ReactNode } from "react";
import { SiteIcon } from "./site-icon";

/** 실패한 주소만 기억하므로 이미지 주소가 바뀌면 새 이미지를 다시 시도한다. */
export function FallbackImage({ fallback, ...props }: ImageProps & { readonly fallback?: ReactNode }) {
  const [failedSource, setFailedSource] = useState<ImageProps["src"] | null>(null);
  if (!props.src || failedSource === props.src) {
    return fallback ?? <span role="img" aria-label={`${props.alt || "이미지"} · 이미지를 불러올 수 없어요`} className={`${props.fill ? "absolute inset-0" : "flex min-h-48 w-full"} flex flex-col items-center justify-center gap-2 bg-border-soft p-3 text-center text-xs text-muted-strong`}>
      <SiteIcon name="image" size={28} /><span>이미지 준비 중</span>
    </span>;
  }
  return <Image {...props} alt={props.alt} onError={(event) => { setFailedSource(props.src); props.onError?.(event); }} />;
}
