import { SITE_URL } from "@/config/site";
import { auditionPostRoutes, type AuditionPost } from "@/features/audition-posts/types";
import { SHOW_GENRE_LABELS, showRoutes, type PublicShow } from "@/features/shows/types";
import { HOME_DESCRIPTION } from "./audition-metadata";

export type FeedItem = {
  readonly title: string;
  readonly url: string;
  readonly bodyHtml: string;
  readonly category: string;
  readonly publishedAt?: string | null;
};

export function escapeXml(value: string): string {
  // XML 1.0에서 허용하지 않는 제어 문자와 잘못된 Unicode를 제거한다.
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uD800-\uDFFF\uFFFE\uFFFF]/gu, "")
    .replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}

export function auditionFeedItem(post: AuditionPost): FeedItem {
  const details = [post.category, post.authorName, `마감: ${post.deadlineText || "상시"}`, post.closed ? "모집 마감" : "모집 중"];
  if (post.pay) details.push(`페이: ${post.pay}`);
  const attachments = post.attachments.map((file) => `<li><a href="${escapeXml(file.url)}">${escapeXml(file.name)}</a></li>`).join("");
  const source = post.sourceUrl ? `<p>출처: <a href="${escapeXml(post.sourceUrl)}">${escapeXml(post.source)}</a></p>` : "";
  return {
    title: post.title,
    url: `${SITE_URL}${auditionPostRoutes.detail(post.id)}`,
    category: `${post.category} 오디션`,
    publishedAt: post.postedAt,
    bodyHtml: `<p>${escapeXml(details.join(" · "))}</p>${post.bodyHtml}${attachments ? `<ul>${attachments}</ul>` : ""}${source}`,
  };
}

export function showFeedItem(show: PublicShow): FeedItem {
  const paragraphs = [show.hostName, show.venue.name, show.venue.roadAddress, show.description].filter(Boolean);
  return {
    title: show.title,
    url: `${SITE_URL}${showRoutes.detail(show.id)}`,
    category: `${SHOW_GENRE_LABELS[show.genre]} 공연`,
    // 공연 일시는 게시일이 아니므로 pubDate로 사용하지 않는다.
    bodyHtml: paragraphs.map((text) => `<p>${escapeXml(text).replace(/\r?\n/g, "<br>")}</p>`).join("")
      + show.sessions.map((session) => `<p>공연 일시: ${escapeXml(session.startsAt)}</p>`).join("")
      + show.guides.map((guide) => `<h3>${escapeXml(guide.title)}</h3><p>${escapeXml(guide.content)}</p>`).join(""),
  };
}

/** 네이버의 10MB 제출 제한 안에서 각 항목의 본문 전체를 유지한다. */
export function createRss(items: readonly FeedItem[], maxBytes = 9_000_000): string {
  const head = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>예술in · 오디션 공고와 공연</title><link>${SITE_URL}/</link>
<description>${escapeXml(HOME_DESCRIPTION)}</description><language>ko-KR</language>
<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>`;
  const tail = "</channel></rss>";
  let bytes = new TextEncoder().encode(head + tail).byteLength;
  const entries: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.url)) continue;
    const date = item.publishedAt ? new Date(item.publishedAt) : null;
    const pubDate = date && !Number.isNaN(date.getTime()) ? `<pubDate>${date.toUTCString()}</pubDate>` : "";
    const entry = `<item><title>${escapeXml(item.title)}</title><link>${escapeXml(item.url)}</link>
<guid isPermaLink="true">${escapeXml(item.url)}</guid><category>${escapeXml(item.category)}</category>
<description>${escapeXml(item.bodyHtml)}</description>${pubDate}</item>`;
    const size = new TextEncoder().encode(entry).byteLength;
    if (bytes + size > maxBytes) continue;
    bytes += size;
    seen.add(item.url);
    entries.push(entry);
  }
  return head + entries.join("") + tail;
}
