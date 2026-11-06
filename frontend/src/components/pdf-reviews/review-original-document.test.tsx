// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPdfExtraction } from "@/features/pdf-extractions/api";
import type { PdfExtractionJob } from "@/features/pdf-extractions/types";
import { ReviewOriginalDocument } from "./review-original-document";

vi.mock("@/features/pdf-extractions/api", () => ({ fetchPdfExtraction: vi.fn() }));
vi.mock("@/components/pdf-extractions/pdf-original-viewer", () => ({
  PdfOriginalViewer: ({ url, initialMode, onModeChange, onRefresh }: { url: string; initialMode: string; onModeChange: (mode: string) => void; onRefresh: () => void }) => <>
    <a href={url}>원본</a><span data-view-mode={initialMode} />
    <button type="button" onClick={() => onModeChange("canvas")}>앱 보기 선택</button>
    <button type="button" onClick={onRefresh}>주소 새로고침</button>
  </>,
}));

let root: Root;
let container: HTMLDivElement;
const unauthorized = vi.fn();
const job = (url: string | null): PdfExtractionJob => ({
  jobId: "synthetic-job", originalFilename: "synthetic.pdf", size: 100, createdAt: "2026-10-25", uploadedAt: null,
  status: "COMPLETED", sourceFileKey: "originals/synthetic.pdf", resultFileKey: "", sourceUrl: url, result: null,
});
async function open() {
  await act(async () => root.render(<ReviewOriginalDocument jobId="synthetic-job" onUnauthorized={unauthorized} />));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); vi.unstubAllGlobals(); });

describe("원본 PDF 서명 주소", () => {
  it("열 때마다 메타데이터 API에서 최신 S3 주소를 받아 사용한다", async () => {
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(job("https://s3.example.test/original.pdf?signature=first"))
      .mockResolvedValueOnce(job("https://s3.example.test/original.pdf?signature=renewed"));
    await open();
    expect(container.querySelector("a")?.getAttribute("href")).toContain("signature=first");
    await act(async () => root.render(null));
    await open();
    expect(container.querySelector("a")?.getAttribute("href")).toContain("signature=renewed");
    expect(fetchPdfExtraction).toHaveBeenCalledTimes(2);
    expect(fetchPdfExtraction).toHaveBeenLastCalledWith("synthetic-job", true, expect.any(AbortSignal));
  });

  it("원본이 준비되지 않으면 재시도로 다시 조회한다", async () => {
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(job(null)).mockResolvedValueOnce(job("https://s3.example.test/ready.pdf"));
    await open();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("아직 준비되지");
    await act(async () => container.querySelector("button")!.click());
    expect(container.querySelector("a")?.getAttribute("href")).toBe("https://s3.example.test/ready.pdf");
  });

  it("같은 PDF의 주소를 새로 받아도 사용자가 고른 앱 보기를 유지한다", async () => {
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(job("https://s3.example.test/original.pdf?signature=first"))
      .mockResolvedValueOnce(job("https://s3.example.test/original.pdf?signature=renewed"));
    await open();
    await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "앱 보기 선택")!.click());
    await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "주소 새로고침")!.click());
    expect(container.querySelector("a")?.getAttribute("href")).toContain("signature=renewed");
    expect(container.querySelector("[data-view-mode]")?.getAttribute("data-view-mode")).toBe("canvas");
  });

  it("다른 PDF를 열면 브라우저 보기 우선 정책으로 돌아온다", async () => {
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(job("https://s3.example.test/first.pdf"))
      .mockResolvedValueOnce(job("https://s3.example.test/second.pdf"));
    await open();
    await act(async () => [...container.querySelectorAll("button")].find(button => button.textContent === "앱 보기 선택")!.click());
    await act(async () => root.render(<ReviewOriginalDocument jobId="another-synthetic-job" onUnauthorized={unauthorized} />));
    expect(container.querySelector("a")?.getAttribute("href")).toContain("second.pdf");
    expect(container.querySelector("[data-view-mode]")?.getAttribute("data-view-mode")).toBe("original");
  });

});
