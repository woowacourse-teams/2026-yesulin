import type { Metadata } from "next";
import { formatDeadline } from "@/features/audition-posts/format";
import { auditionPostRoutes, type AuditionPost, type AuditionPostQuery } from "@/features/audition-posts/types";

export const HOME_TITLE = "예술in | 뮤지컬·연극 오디션과 무료 공연";
export const HOME_DESCRIPTION = "뮤지컬·연극 배우 모집 공고를 모아 모집 배역과 마감일, 지원 방법을 안내합니다. 무료 공연 일정과 예매도 예술in에서 확인하세요.";
export const AUDITION_LIST_TITLE = "예술in | 오디션 공고";
const AUDITION_LIST_DESCRIPTION = "뮤지컬·연극·퍼포먼스와 단원·기획사 모집 공고를 확인하세요. 모집 배역, 마감일, 지원 방법을 예술in에서 한곳에 안내합니다.";

export const SHARE_IMAGE = {
  url: "/images/og-image.png",
  width: 1920,
  height: 1080,
  alt: "오디션 공고부터 공연 예매까지, 예술in",
} as const;

type SocialImage = { readonly url: string; readonly alt?: string; readonly width?: number; readonly height?: number };

/**
 * 페이지가 openGraph·twitter 중 하나라도 정의하면 레이아웃 값을 통째로 대체한다. 빠진 항목에 홈 제목이 남거나
 * 공유 이미지가 사라지지 않도록 제목·설명·주소·이미지를 두 곳에 함께 채운다.
 */
export function socialMetadata({ title, description, url, type = "website", image = SHARE_IMAGE }: {
  readonly title: string;
  readonly description: string;
  readonly url: string;
  readonly type?: "website" | "article" | "profile";
  readonly image?: SocialImage;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { type, locale: "ko_KR", url, siteName: "예술in", title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

export function auditionListMetadata(query: AuditionPostQuery): Metadata {
  const subject = query.category ? `${query.category} 오디션 공고` : AUDITION_LIST_TITLE;
  const suffix = [query.includeClosed ? "마감 포함" : "", query.sort === "deadline" ? "마감 임박순" : "", query.page > 0 ? `${query.page + 1}페이지` : ""]
    .filter(Boolean).join(" · ");
  const title = suffix ? `${subject} · ${suffix}` : subject;
  const description = query.category
    ? `${query.category} 배우 모집 공고를 확인하세요. 모집 배역, 마감일, 지원 방법과 원문 정보를 예술in에서 안내합니다.`
    : AUDITION_LIST_DESCRIPTION;
  const canonical = auditionPostRoutes.list(query);
  return {
    title: query.category ? title : { absolute: title },
    description,
    alternates: { canonical, types: { "application/rss+xml": "/rss.xml" } },
    ...socialMetadata({ title: query.category ? `${title} | 예술in` : title, description, url: canonical }),
  };
}

const DECORATION = "!%@#*~=+^★☆♥♡◆◇■□●○◎※";
const EDGE_DECORATION = new RegExp(`^(?:[${DECORATION}]\\s*){2,}|(?:\\s*[${DECORATION}]){2,}$`, "gu");
const REPEATED_DECORATION = new RegExp(`([${DECORATION}])\\1+`, "gu");
/** `[지원마감 D-5]`처럼 올린 날 기준이라 며칠 뒤면 틀려지는 머리말. */
const STALE_DEADLINE_PREFIX = /^\s*\[\s*(?:지원\s*)?마감\s*D\s*-\s*\d+\s*\]\s*/iu;

/** 화면에는 원문 제목을 그대로 보여 주고, 검색 결과와 공유 제목에서만 반복 기호와 지난 마감 머리말을 걷어 낸다. */
export function auditionPostSearchTitle(title: string): string {
  const cleaned = title.replace(STALE_DEADLINE_PREFIX, "").trim()
    .replace(EDGE_DECORATION, "")
    .replace(REPEATED_DECORATION, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || title.trim();
}

const DESCRIPTION_BODY_LENGTH = 90;
const HTML_ENTITIES: Readonly<Record<string, string>> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };

function plainText(html: string): string {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (entity, decimal: string | undefined, hex: string | undefined, name: string | undefined) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
      return HTML_ENTITIES[name!.toLowerCase()] ?? entity;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, length: number): string {
  const characters = Array.from(text);
  return characters.length > length ? `${characters.slice(0, length - 1).join("").trimEnd()}…` : text;
}

/** 분야·작성자·페이·마감을 먼저 두고, 본문이 글로 쓰인 공고만 앞부분을 이어 붙인다. */
export function auditionPostDescription(post: Pick<AuditionPost, "category" | "authorName" | "pay" | "deadline" | "deadlineText" | "bodyHtml">): string {
  const facts = [
    post.category ? `${post.category} 오디션` : "",
    post.authorName,
    post.pay ? `페이 ${post.pay}` : "",
    `마감 ${formatDeadline(post)}`,
  ].filter(Boolean).join(" · ");
  const body = plainText(post.bodyHtml);
  return body ? `${facts}. ${truncate(body, DESCRIPTION_BODY_LENGTH)}` : facts;
}

/** 본문 첫 사진이 공고 포스터인 경우가 많아 공유 미리보기에 쓴다. 사진이 없으면 대표 이미지를 쓴다. */
function firstBodyImage(html: string): SocialImage {
  const url = /<img\b[^>]*\ssrc="(https:\/\/[^"]+)"/i.exec(html)?.[1];
  return url ? { url } : SHARE_IMAGE;
}

export function auditionPostMetadata(post: AuditionPost): Metadata {
  const canonical = auditionPostRoutes.detail(post.id);
  const title = auditionPostSearchTitle(post.title);
  const description = auditionPostDescription(post);
  return {
    title,
    description,
    alternates: { canonical },
    ...socialMetadata({ title, description, url: canonical, type: "article", image: firstBodyImage(post.bodyHtml) }),
  };
}
