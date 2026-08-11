"use client";

import Image from "next/image";
import { useState } from "react";
import type { ApplicantPhoto } from "@/features/auditions/types";

/**
 * 지원자 사진. 외부 아바타 URL이 실패하면 인라인 SVG로 갈아끼운다.
 * 목 사진이라 최적화 이득이 없어 unoptimized로 두고 data URL도 그대로 통과시킨다.
 */
export function ApplicantPhotoImage({
  photo,
  alt,
  sizes,
  className = "object-cover object-[center_20%]",
  priority = false,
}: {
  photo: ApplicantPhoto | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!photo) return null;

  return (
    <Image
      src={failed ? photo.fallbackUrl : photo.url}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

/** 선택 화면의 겹친 얼굴 미리보기. 실패해도 회색 원으로 남으면 충분하다. */
export function FacePile({ urls }: { urls: readonly string[] }) {
  if (urls.length === 0) return null;

  return (
    <div className="mt-0.5 flex" aria-hidden="true">
      {urls.map((url, index) => (
        <span
          key={url || index}
          className="relative -ml-2 h-[26px] w-[26px] overflow-hidden rounded-full border-2 border-white bg-border-soft first:ml-0"
        >
          <Image
            src={url}
            alt=""
            fill
            unoptimized
            sizes="26px"
            className="object-cover object-[center_22%]"
          />
        </span>
      ))}
    </div>
  );
}
