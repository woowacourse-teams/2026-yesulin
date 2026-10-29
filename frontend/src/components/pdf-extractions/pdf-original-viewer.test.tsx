// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfOriginalViewer } from "./pdf-original-viewer";

vi.mock("next/dynamic", () => ({
  default: () => function OriginalPdfCanvas({ url }: { url: string }) { return <a href={url}>PDF 원본</a>; },
}));

let root: Root;
let container: HTMLDivElement;
const firstUrl = "https://s3.example.test/source.pdf?signature=synthetic-first";
const renewedUrl = "https://s3.example.test/source.pdf?signature=synthetic-renewed";
const refresh = vi.fn();
function render(url = firstUrl) {
  act(() => root.render(<PdfOriginalViewer url={url} filename="synthetic.pdf" onRefresh={refresh} />));
}
function button(label: string) {
  return [...container.querySelectorAll("button")].find(button => button.textContent === label)!;
}
function click(label: string) { act(() => button(label).click()); }
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("S3 원본 PDF 표시", () => {
  it("브라우저 보기를 기본으로 열고 원본 URL과 브라우저별 전환 안내를 제공한다", () => {
    render();
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(firstUrl);
    expect(container.querySelector("iframe")?.getAttribute("title")).toBe("synthetic.pdf 원본 PDF");
    expect(container.querySelector('a[target="_blank"]')?.getAttribute("href")).toBe(firstUrl);
    expect(container.textContent).toContain("GPT 브라우저에서 화면이 비어 있으면");
    expect(container.textContent).toContain("두 보기 모두 같은 원본 PDF");
    const description = container.querySelector('[aria-label="PDF 보기 방식"]')?.getAttribute("aria-describedby");
    expect(container.querySelector(`[id="${description}"]`)?.textContent).toContain("앱에서 보기");
  });

  it("앱 보기도 같은 원본을 사용하며 Safari 안내와 함께 브라우저 보기로 복귀할 수 있다", () => {
    render();
    click("앱에서 보기");
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.querySelector('a:not([target])')?.getAttribute("href")).toBe(firstUrl);
    expect(container.textContent).toContain("Safari에서 표시되지 않으면");
    click("브라우저 보기");
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(firstUrl);
    expect(container.textContent).not.toContain("PDF 원본");
  });

  it("주소 갱신을 요청한 뒤 받은 새 서명 URL을 원본 프레임에 반영한다", () => {
    render(); click("브라우저 보기"); click("다시 불러오기");
    expect(refresh).toHaveBeenCalledOnce();
    render(renewedUrl);
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(renewedUrl);
    expect(container.querySelector('a[target="_blank"]')?.getAttribute("href")).toBe(renewedUrl);
  });

  it("다운로드는 원본 응답 Blob과 파일명을 그대로 사용하고 화면을 닫을 때 URL을 해제한다", async () => {
    const blob = new Blob(["%PDF-synthetic-only"], { type: "application/pdf" });
    const request = vi.fn().mockResolvedValue({ ok: true, blob: async () => blob });
    const create = vi.fn(() => "blob:synthetic-only");
    const revoke = vi.fn();
    class TestURL extends URL { static createObjectURL = create; static revokeObjectURL = revoke; }
    vi.stubGlobal("fetch", request); vi.stubGlobal("URL", TestURL);
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe("synthetic.pdf"); expect(this.href).toBe("blob:synthetic-only");
    });
    render();
    await act(async () => button("원본 다운로드").click());
    expect(request).toHaveBeenCalledWith(firstUrl, { credentials: "omit", redirect: "error", signal: expect.any(AbortSignal) });
    expect(create).toHaveBeenCalledWith(blob); expect(anchorClick).toHaveBeenCalledOnce();
    act(() => root.render(null));
    expect(revoke).toHaveBeenCalledWith("blob:synthetic-only");
  });

  it("만료된 다운로드 URL의 오류를 안내하고 원본 새로고침 동작을 유지한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render();
    await act(async () => button("원본 다운로드").click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("다시 불러온 뒤");
    click("다시 불러오기"); expect(refresh).toHaveBeenCalledOnce();
  });
});
