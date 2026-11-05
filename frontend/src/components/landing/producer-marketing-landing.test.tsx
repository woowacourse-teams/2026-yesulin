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

  it("오픈채팅 공유를 자동 발송처럼 말하지 않는다", () => {
    expect(html).not.toContain("알림 보내기");
    expect(html).not.toContain("알림 발송");
    expect(html).toContain("운영팀이 배우 오픈채팅에 공유");
  });

  it("예시 지원자 세 명 모두 얼굴 사진을 쓴다", () => {
    expect(html).toContain("park-doyun-profile.jpg");
    expect(html).toContain("lee-seoyeon-profile.jpg");
  });

  it("포스터 자동 이동을 멈출 수 있다", () => {
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("포스터 움직임 멈추기");
  });

  it("문구를 가운데 점으로 이어 붙이지 않고 같은 숫자를 반복하지 않는다", () => {
    expect(html).not.toContain(" · ");
    expect(html.match(/240\+/g)).toHaveLength(1);
  });
});
