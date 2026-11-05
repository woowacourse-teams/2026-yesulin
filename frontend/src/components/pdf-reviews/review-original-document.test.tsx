// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPdfExtraction } from "@/features/pdf-extractions/api";
import type { PdfExtractionJob } from "@/features/pdf-extractions/types";
import { trackProductEvent } from "@/features/analytics/product-analytics";
import { ReviewOriginalDocument } from "./review-original-document";

vi.mock("@/features/analytics/product-analytics", () => ({ trackProductEvent: vi.fn() }));
vi.mock("@/features/pdf-extractions/api", () => ({ fetchPdfExtraction: vi.fn() }));
vi.mock("@/components/pdf-extractions/pdf-original-viewer", () => ({
  PdfOriginalViewer: ({ url, onRefresh }: { url: string; onRefresh: () => void }) => <>
    <a href={url}>원본</a><button type="button" onClick={onRefresh}>주소 새로고침</button>
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
  it("자동 원본 표시는 원본 클릭 분석 이벤트를 만들지 않는다", async () => {
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(job("https://example.test/auto.pdf"));await open();
    expect(trackProductEvent).not.toHaveBeenCalledWith("review_original_pdf_clicked", expect.anything());
  });
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

  it("주소 갱신 뒤에도 새 원본을 PDF.js 뷰어에 전달한다", async () => {
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(job("https://s3.example.test/first.pdf"))
      .mockResolvedValueOnce(job("https://s3.example.test/renewed.pdf"));
    await open();
    await act(async () => container.querySelector("button")!.click());
    expect(container.querySelector("a")?.getAttribute("href")).toContain("renewed.pdf");
  });

  it("401이면 권한 만료를 알리고 원본을 표시하지 않는다", async () => {
    vi.mocked(fetchPdfExtraction).mockRejectedValueOnce(Object.assign(new Error("로그인 필요"), { status: 401 }));
    await open();
    expect(unauthorized).toHaveBeenCalledOnce();
    expect(container.querySelector("a")).toBeNull();
  });

  it("A→B 전환 후 늦은 A 응답이 B의 원본을 덮지 않는다", async () => {
    let resolveA!: (value: PdfExtractionJob) => void;
    vi.mocked(fetchPdfExtraction).mockReturnValueOnce(new Promise(resolve => { resolveA = resolve; }))
      .mockResolvedValueOnce(job("https://s3.example.test/b.pdf"));
    await open();
    await act(async () => root.render(<ReviewOriginalDocument jobId="b" onUnauthorized={unauthorized} />));
    expect(vi.mocked(fetchPdfExtraction).mock.calls[0][2]?.aborted).toBe(true);
    await act(async () => resolveA(job("https://s3.example.test/a.pdf")));
    expect(container.querySelector("a")?.getAttribute("href")).toContain("b.pdf");
  });

});
