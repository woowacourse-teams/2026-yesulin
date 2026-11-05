// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfOriginalViewer } from "./pdf-original-viewer";

vi.mock("next/dynamic", () => ({
  default: () => function OriginalPdfCanvas({ url, actions }: { url: string; actions: ReactNode }) { return <div>{actions}<a href={url}>PDF 원본</a></div>; },
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
  it("PDF.js만 표시하며 브라우저 전환·iframe 없이 원본 링크를 유지한다", () => {
    render();
    expect(container.querySelector("iframe")).toBeNull();
    expect(container.textContent).not.toContain("브라우저 보기");
    expect(container.querySelector('a:not([target])')?.getAttribute("href")).toBe(firstUrl);
    expect(container.querySelector('a[target="_blank"]')?.getAttribute("href")).toBe(firstUrl);
  });
  it("주소 갱신 뒤 새 서명 URL을 PDF.js에 전달한다", () => {
    render(); click("다시 불러오기"); expect(refresh).toHaveBeenCalledOnce();
    render(renewedUrl);
    expect(container.querySelector('a:not([target])')?.getAttribute("href")).toBe(renewedUrl);
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
    await act(async () => button("다운로드").click());
    expect(request).toHaveBeenCalledWith(firstUrl, { credentials: "omit", redirect: "error", signal: expect.any(AbortSignal) });
    expect(create).toHaveBeenCalledWith(blob); expect(anchorClick).toHaveBeenCalledOnce();
    act(() => root.render(null));
    expect(revoke).toHaveBeenCalledWith("blob:synthetic-only");
  });

  it("만료된 다운로드 URL의 오류를 안내하고 원본 새로고침 동작을 유지한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render();
    await act(async () => button("다운로드").click());
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("다시 불러온 뒤");
    click("다시 불러오기"); expect(refresh).toHaveBeenCalledOnce();
  });
});
