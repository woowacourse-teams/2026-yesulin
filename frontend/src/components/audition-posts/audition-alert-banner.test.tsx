import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuditionAlertBanner } from "./audition-alert-banner";

describe("홈 홍보 배너", () => {
  it("오디션 알림 이미지를 화면 폭에 맞게 제공하고 PC 이미지를 미리 받지 않는다", () => {
    const html = renderToStaticMarkup(<AuditionAlertBanner />);
    const source = html.match(/<source media="\(max-width: 640px\)"[^>]*>/)?.[0] ?? "";
    expect(source).toContain("/_next/image?url=%2Fimages%2Fbanners%2Faudition-openchat-mobile.webp");
    expect(source).toContain('width="1440" height="1080"');
    expect(source).toContain('sizes="');
    expect(html).toMatch(/<img[^>]*width="2160" height="675"[^>]*>/);
    expect(html).toContain("/_next/image?url=%2Fimages%2Fbanners%2Faudition-openchat-desktop.webp");
    expect(html).toMatch(/<img[^>]*fetchPriority="high"[^>]*>/);
    expect(html).not.toContain('rel="preload"');
  });

  it("이벤트가 없으면 오디션 안내와 공연 제작팀 모집 배너를 탐색할 수 있다", () => {
    const html = renderToStaticMarkup(<AuditionAlertBanner initialEventBanners={[]} />);
    expect(html).toContain("오디션 알림 받기");
    expect(html).toContain('aria-label="이전 배너"');
    expect(html).toContain('aria-label="다음 배너"');
    expect(html).toContain('aria-label="배너 선택"');
    expect(html).toContain('aria-label="공연 제작팀 모집 배너 보기"');
    expect(html).toContain("예술in과 함께 성장할 공연 제작팀을 찾습니다. 카카오톡 문의");
    expect(html).toContain("/_next/image?url=%2Fimages%2Fbanners%2Fproducer-partnership-bubble-desktop.webp");
    expect(html).toContain("/_next/image?url=%2Fimages%2Fbanners%2Fproducer-partnership-bubble-mobile.webp");
  });

  it("이벤트 배너가 있으면 오디션 알림과 함께 탐색할 수 있다", () => {
    const html = renderToStaticMarkup(<AuditionAlertBanner initialEventBanners={[
      { eventId: 7, title: "서포터즈", alt: "서포터즈 모집", desktopImageUrl: "https://cdn.test/d.webp", mobileImageUrl: "https://cdn.test/m.webp" },
    ]} />);
    expect(html).toContain('aria-label="이전 배너"');
    expect(html).toContain('aria-label="다음 배너"');
    expect(html).toContain('aria-label="오디션 알림 배너 보기"');
    expect(html).toContain('aria-label="서포터즈 배너 보기"');
    expect(html).toContain('aria-label="공연 제작팀 모집 배너 보기"');
    expect(html).toContain('aria-roledescription="슬라이드"');
  });
});
