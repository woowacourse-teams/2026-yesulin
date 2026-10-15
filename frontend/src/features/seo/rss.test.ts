import { describe, expect, it } from "vitest";
import { createRss, escapeXml, type FeedItem } from "./rss";

const item: FeedItem = {
  title: "<알라딘> & 배우 모집",
  url: "https://yesulin.art/posts/58",
  category: "뮤지컬 오디션",
  bodyHtml: '<p>지원 &amp; 문의</p><img src="https://example.com/poster.png">',
  publishedAt: "2026-10-12T00:00:00Z",
};

describe("RSS XML", () => {
  it("제목·HTML 본문을 XML 텍스트로 보존하고 고정 GUID와 RFC 날짜를 제공한다", () => {
    const xml = createRss([item, item]);
    expect(xml).toContain("&lt;알라딘&gt; &amp; 배우 모집");
    expect(xml).toContain('&lt;p&gt;지원 &amp;amp; 문의&lt;/p&gt;&lt;img src=&quot;https://example.com/poster.png&quot;&gt;');
    expect(xml).toContain('<guid isPermaLink="true">https://yesulin.art/posts/58</guid>');
    expect(xml).toContain("<pubDate>Mon, 12 Oct 2026 00:00:00 GMT</pubDate>");
    expect(xml.match(/<item>/g)).toHaveLength(1);
  });

  it("게시일을 알 수 없을 때 날짜를 만들어 넣지 않고 잘못된 XML 문자를 제거한다", () => {
    expect(createRss([{ ...item, publishedAt: "invalid" }])).not.toContain("<pubDate>");
    expect(escapeXml("한글\u0000\u000b\ud800\ufffe\n🎭")).toBe("한글\n🎭");
  });

  it("멀티바이트 본문까지 용량을 계산하고 한 항목의 본문을 잘라내지 않는다", () => {
    const large = { ...item, url: "https://yesulin.art/posts/59", bodyHtml: "가".repeat(1000) };
    const oneItemBytes = new TextEncoder().encode(createRss([item])).byteLength;
    const xml = createRss([item, large], oneItemBytes + 50);
    expect(new TextEncoder().encode(xml).byteLength).toBeLessThanOrEqual(oneItemBytes + 50);
    expect(xml).toContain(escapeXml(item.bodyHtml));
    expect(xml).not.toContain(large.url);
    expect(xml.endsWith("</channel></rss>")).toBe(true);
  });
});
