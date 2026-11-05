import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ProducerMarketingLanding } from "./producer-marketing-landing";

vi.mock("./notebook-site-layout", () => ({ NotebookHeader: () => null, NotebookFooter: () => null }));

describe("공연사 서비스 랜딩", () => {
  const html = renderToStaticMarkup(<ProducerMarketingLanding />);

  it("아직 열리지 않은 메일 지원서 가져오기는 곧 열려요로 표시한다", () => {
    expect(html).toContain("곧 열려요");
    expect(html).not.toContain("메일로 온 지원서까지 자동으로 정리돼요");
  });

  it("가입·로그인·문의로 이어진다", () => {
    expect(html).toContain('href="/signup"');
    expect(html).toContain('href="/login"');
    expect(html).toContain("pf.kakao.com/_pbTBX/chat");
  });

  it("무료 공연과 영구 무료 약속을 말하지 않는다", () => {
    expect(html).not.toContain("무료 공연");
    expect(html).not.toContain("영원히");
    expect(html).toContain("베타 기간");
  });
});
