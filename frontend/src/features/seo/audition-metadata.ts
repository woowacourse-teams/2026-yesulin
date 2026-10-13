import type { Metadata } from "next";
import { auditionPostRoutes, type AuditionPostQuery } from "@/features/audition-posts/types";

export const HOME_TITLE = "예술in | 뮤지컬·연극 오디션 공고";
export const HOME_DESCRIPTION = "모집 중인 뮤지컬·연극 오디션 공고를 확인하세요. 모집 배역, 마감일, 지원 방법을 예술in에서 한곳에 안내합니다.";

/** 페이지가 openGraph·twitter를 정의하면 레이아웃 값을 통째로 대체하므로 공유 이미지를 함께 넣는다. */
export const SHARE_IMAGE = {
  url: "/images/og-image.png",
  width: 1920,
  height: 1080,
  alt: "오디션 공고부터 공연 예매까지, 예술in",
} as const;

export function auditionListMetadata(query: AuditionPostQuery): Metadata {
  const subject = query.category ? `${query.category} 오디션 공고` : HOME_TITLE;
  const suffix = [query.includeClosed ? "마감 포함" : "", query.page > 0 ? `${query.page + 1}페이지` : ""]
    .filter(Boolean).join(" · ");
  const title = suffix ? `${subject} · ${suffix}` : subject;
  const description = query.category
    ? `${query.category} 배우 모집 공고를 확인하세요. 모집 배역, 마감일, 지원 방법과 원문 정보를 예술in에서 안내합니다.`
    : HOME_DESCRIPTION;
  const canonical = auditionPostRoutes.list(query);
  const socialTitle = query.category ? `${title} | 예술in` : title;
  return {
    title: query.category ? title : { absolute: title },
    description,
    alternates: { canonical },
    openGraph: {
      type: "website", locale: "ko_KR", url: canonical, siteName: "예술in", title: socialTitle, description, images: [SHARE_IMAGE],
    },
    twitter: { card: "summary_large_image", title: socialTitle, description, images: [SHARE_IMAGE.url] },
  };
}
