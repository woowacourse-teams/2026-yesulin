"use client";

import { useState } from "react";
import { companyInitial } from "@/features/companies/types";

const SIZES = {
  sm: "size-10 rounded-control text-base",
  md: "size-14 rounded-card text-xl",
  lg: "size-20 rounded-card text-3xl sm:size-24 sm:text-4xl",
} as const;

/**
 * 공연사 대표 사진. 사진이 없거나 불러오지 못하면 이름 첫 글자를 브랜드 색 바탕에 보인다. 이름은 바로 옆에 글로 보이므로
 * 그림은 보조 정보로 두고 대체 텍스트를 비운다.
 */
export function CompanyAvatar({ name, photoUrl, size = "md", className = "" }: {
  readonly name: string;
  readonly photoUrl: string | null;
  readonly size?: keyof typeof SIZES;
  readonly className?: string;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = photoUrl !== null && failedUrl !== photoUrl;
  const base = `${SIZES[size]} shrink-0 overflow-hidden border border-border-soft ${className}`;

  if (showPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 저장소·미리 보기 주소를 그대로 보여 준다.
      <img
        src={photoUrl}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailedUrl(photoUrl)}
        className={`${base} bg-surface object-cover`}
      />
    );
  }
  return (
    <span aria-hidden="true" className={`${base} inline-flex items-center justify-center bg-brand-soft font-bold text-brand`}>
      {companyInitial(name)}
    </span>
  );
}
