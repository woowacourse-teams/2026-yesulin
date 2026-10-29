// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyAcquisition, clearAcquisition, observeAcquisition, rememberOpenchatAcquisition } from "./acquisition";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("sessionStorage", { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) });
  clearAcquisition();
  window.history.replaceState(null, "", "/");
  Object.defineProperty(document, "referrer", { configurable: true, value: "" });
});
afterEach(() => vi.unstubAllGlobals());

describe("채널 분류와 방문 연결", () => {
  it.each([
    ["?src=kakao_openchat", "https://www.google.com/search?q=private", "openchat"],
    ["?utm_source=instagram", "https://search.naver.com/", "instagram"],
    ["?utm_source=private@example.com", "", "other_tagged"],
    ["", "https://search.naver.com/search?q=private", "naver"],
    ["", "https://www.google.co.kr/search?q=private", "google"],
    ["", "https://l.instagram.com/?u=private", "instagram"],
    ["", "https://naver.com.evil.example/token", "other_external"],
    ["", "https://dev.yesulin.art/posts/1", null],
    ["", "https://yesulin.art/actors/private", null],
    ["", "", null],
  ])("%s / %s는 %s로만 분류한다", (query, ref, expected) => {
    expect(classifyAcquisition(`https://yesulin.art/${query}`, ref)).toBe(expected);
  });
  it("홈에서 들어온 출처가 내부 상세 이동·재조회에 유지되고 30분 뒤 만료된다", () => {
    Object.defineProperty(document, "referrer", { configurable: true, value: "https://search.naver.com/search?q=secret" });
    expect(observeAcquisition(1000)).toBe("naver");
    window.history.replaceState(null, "", "/posts/10");
    expect(observeAcquisition(2000)).toBe("naver");
    expect(observeAcquisition(3000)).toBe("naver");
    expect(sessionStorage.getItem("yesulin:acquisition:v1")).not.toMatch(/secret|https|search/);
    expect(observeAcquisition(3000 + 30 * 60_000)).toBe("direct_unknown");
  });
  it("새 표시 링크로 출처를 바꾸고 주소 정리 후에도 유지한다", () => {
    observeAcquisition();
    window.history.replaceState(null, "", "/posts/10?utm_source=instagram");
    expect(observeAcquisition()).toBe("instagram");
    rememberOpenchatAcquisition();
    window.history.replaceState(null, "", "/posts/11");
    expect(observeAcquisition()).toBe("openchat");
    clearAcquisition();
    expect(observeAcquisition()).toBe("direct_unknown");
  });
  it("차단된 저장소에서도 현재 문서 안에서는 출처를 유지한다", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => { throw Error(); }, setItem: () => { throw Error(); }, removeItem: () => { throw Error(); } });
    window.history.replaceState(null, "", "/?utm_source=google");
    expect(observeAcquisition()).toBe("google");
    window.history.replaceState(null, "", "/posts/10");
    expect(observeAcquisition()).toBe("google");
  });
});
