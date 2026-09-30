"use client";

import Image from "next/image";
import { useState } from "react";
import type { ApplicantPhoto } from "@/features/auditions/types";

type ApplicantPhotoImageProps = {
  photo: ApplicantPhoto | undefined;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
};

/** 비공개 사진은 브라우저가 세션 Cookie를 포함해 원본 콘텐츠 API를 직접 조회한다. */
export function ApplicantPhotoImage(props: ApplicantPhotoImageProps) {
  if (!props.photo) return <PhotoUnavailable alt={props.alt} failed={false} />;
  // 사진을 바꾸면 이전 사진의 실패 상태도 초기화한다.
  return <PhotoImage key={props.photo.url} {...props} photo={props.photo} />;
}

function PhotoImage({
  photo,
  alt,
  sizes,
  className = "object-cover object-[center_20%]",
  priority = false,
}: ApplicantPhotoImageProps & { photo: ApplicantPhoto }) {
  const [failed, setFailed] = useState(false);

  if (failed || !photo.url.trim()) return <PhotoUnavailable alt={alt} failed />;

  return (
    <Image
      src={photo.url}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      priority={priority}
      className={className}
      // 브라우저 기본 끌어놓기가 시작되면 드래그 조작을 가로채 화면이 멈춘 것처럼 보인다.
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}

function PhotoUnavailable({ alt, failed }: { alt: string; failed: boolean }) {
  const message = failed ? "사진을 불러오지 못했습니다" : "제출된 사진이 없습니다";
  return (
    <span
      role="img"
      aria-label={alt ? `${alt}: ${message}` : message}
      title={message}
      className="@container absolute inset-0 flex flex-col items-center justify-center gap-2 bg-border-soft text-muted"
    >
      {failed ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 max-h-[40%] max-w-[60%] fill-none stroke-current stroke-[1.5]">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M12 7v6m0 3v1" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8 max-h-[40%] max-w-[60%] fill-none stroke-current stroke-[1.5]">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 22v-2a8 8 0 0 1 16 0v2" />
        </svg>
      )}
      <span className="hidden px-3 text-center text-xs @[120px]:block">{message}</span>
    </span>
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
