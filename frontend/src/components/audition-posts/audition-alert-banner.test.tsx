import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuditionAlertBanner } from "./audition-alert-banner";

describe("홈 홍보 배너", () => {
  it("모바일 이미지도 최적화된 크기 목록으로 제공하고 PC 이미지를 미리 받지 않는다", () => {
    const html = renderToStaticMarkup(<AuditionAlertBanner />);
    const source = html.match(/<source media="\(max-width: 640px\)"[^>]*>/)?.[0] ?? "";
    expect(source).toContain("/_next/image?url=%2Fimages%2Fbanners%2Fopenchat-highlight-mobile.webp");
    expect(source).toContain('sizes="');
    expect(html).toMatch(/<img[^>]*fetchPriority="high"[^>]*>/);
    expect(html).not.toContain('rel="preload"');
  });
});
