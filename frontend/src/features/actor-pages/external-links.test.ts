import { expect, it } from "vitest";
import { actorExternalLinks } from "./external-links";

it.each([
  ["https://www.instagram.com/actor/", "instagram"],
  ["https://m.youtube.com/@actor", "youtube"],
  ["https://youtu.be/video", "youtube"],
  ["https://threads.net/@actor", "threads"],
  ["https://www.threads.com/@actor", "threads"],
  ["https://www.tiktok.com/@actor", "tiktok"],
  ["https://twitter.com/actor", "x"],
  ["https://x.com/actor", "x"],
  ["https://m.facebook.com/actor", "facebook"],
  ["https://vimeo.com/actor", "vimeo"],
])("등록한 서비스 호스트 %s를 %s로 구분한다", (url, platform) => {
  expect(actorExternalLinks([{ url }])[0]?.platform).toBe(platform);
});

it("비슷한 도메인과 임의 하위 도메인은 SNS 로고로 표시하지 않는다", () => {
  const urls = ["https://instagram.com.example.org/actor", "https://fake.instagram.com/actor", "https://notinstagram.com/", "https://constructor/"];
  expect(actorExternalLinks(urls.map((url) => ({ url }))).map((item) => item.platform)).toEqual([null, null, null, null]);
});

it("홈페이지 이름을 보존하고 HTTP(S) 이외·손상 주소·인증정보·중복을 제외한다", () => {
  const urls = ["https://portfolio.example/actor", "https://portfolio.example/actor", "javascript:alert(1)", "data:text/html,hi", "mailto:a@example.org", "주소아님", "https://instagram.com@evil.example/", "http://www.example.org"];
  const links = actorExternalLinks(urls.map((url) => ({ url })));
  expect(links.map(({ label, href }) => ({ label, href }))).toEqual([
    { label: "portfolio.example", href: "https://portfolio.example/actor" },
    { label: "example.org", href: "http://www.example.org/" },
  ]);
});
