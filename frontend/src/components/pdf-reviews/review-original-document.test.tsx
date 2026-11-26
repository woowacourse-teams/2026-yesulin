// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PdfCanvasViewer } from "@/components/pdf-extractions/pdf-canvas-viewer";
import { PdfOriginalViewer } from "@/components/pdf-extractions/pdf-original-viewer";
import { fetchPdfExtraction } from "@/features/pdf-extractions/api";
import type { PdfExtractionJob } from "@/features/pdf-extractions/types";
import { observeReviewDocumentPreview, trackReviewDocumentDownload } from "@/features/analytics/review-document";
import { trackProductEvent } from "@/features/analytics/product-analytics";
import { ReviewOriginalDocument, SOURCE_WAIT_LIMIT, SOURCE_WAIT_MS } from "./review-original-document";

vi.mock("@/features/analytics/review-document", () => ({ observeReviewDocumentPreview: vi.fn(), trackReviewDocumentDownload: vi.fn() }));
vi.mock("@/features/analytics/product-analytics", () => ({ trackProductEvent: vi.fn() }));
vi.mock("@/features/pdf-extractions/api", () => ({ fetchPdfExtraction: vi.fn() }));
const { loadPdf } = vi.hoisted(() => ({ loadPdf: vi.fn() }));
vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock("pdfjs-dist", () => ({ GlobalWorkerOptions: {}, version: "test", getDocument: loadPdf }));
vi.mock("@/components/pdf-extractions/pdf-original-viewer", () => ({
  PdfOriginalViewer: vi.fn(({ url, onRefresh }: { url: string; onRefresh: () => void }) => <>
    <a href={url}>원본</a><button type="button" onClick={onRefresh}>주소 새로고침</button>
  </>),
}));

let root: Root;
let container: HTMLDivElement;
const unauthorized = vi.fn();
const job = (url: string | null): PdfExtractionJob => ({
  jobId: "synthetic-job", originalFilename: "synthetic.pdf", size: 100, createdAt: "2026-10-25", uploadedAt: null,
  status: "COMPLETED", sourceFileKey: "originals/synthetic.pdf", resultFileKey: "", sourceUrl: url, result: null,
});
async function open(filename = "synthetic.pdf") {
  await act(async () => root.render(<ReviewOriginalDocument reviewId="synthetic-review" jobId="synthetic-job" filename={filename} onUnauthorized={unauthorized} />));
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
  it("같은 지원서의 폴링과 원본 다운로드는 첫 열람 상태를 바꾸지 않는다", async () => {
    vi.useFakeTimers();
    const pending = { ...job(null), uploadedAt: "2026-11-26", extension: "docx", originalUrl: "https://example.test/raw", previewStatus: "PENDING" } as const;
    const ready = { ...pending, sourceUrl: "https://example.test/preview", previewStatus: "READY" } as const;
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(pending).mockResolvedValue(ready);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    try {
      await open("지원서.DOCX");
      await act(async () => { await vi.advanceTimersByTimeAsync(SOURCE_WAIT_MS); });
      expect(vi.mocked(fetchPdfExtraction).mock.calls.map(call => call[1])).toEqual(["document", "document"]);
      expect(observeReviewDocumentPreview).toHaveBeenCalledExactlyOnceWith("synthetic-review", pending);
      expect(trackReviewDocumentDownload).not.toHaveBeenCalled();
      await act(async () => { container.querySelector<HTMLButtonElement>("button")?.click(); });
      expect(click).toHaveBeenCalledOnce();
      expect(trackReviewDocumentDownload).toHaveBeenCalledExactlyOnceWith("synthetic-review", ready);
      expect(observeReviewDocumentPreview).toHaveBeenCalledTimes(1);
    } finally { click.mockRestore(); vi.useRealTimers(); }
  });
  it("접수 전에 연 문서는 접수가 확인된 첫 응답을 기록하고, 만료된 항목은 제외한다", async () => {
    vi.useFakeTimers();
    const uploading = { ...job(null), extension: "hwp", status: "UPLOADING", previewStatus: "PENDING" } as const;
    const received = { ...uploading, uploadedAt: "2026-11-26", status: "QUEUED" } as const;
    try {
      vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(uploading).mockResolvedValueOnce(received);
      await open("지원서.hwp");
      expect(observeReviewDocumentPreview).not.toHaveBeenCalled();
      await act(async () => { await vi.advanceTimersByTimeAsync(SOURCE_WAIT_MS); });
      expect(observeReviewDocumentPreview).toHaveBeenCalledExactlyOnceWith("synthetic-review", received);
      await act(async () => root.render(null));
      vi.mocked(fetchPdfExtraction).mockResolvedValueOnce({ ...uploading, status: "UPLOAD_EXPIRED" });
      await open("만료.hwp");
      expect(container.textContent).toContain("기한이 지났습니다");
      expect(observeReviewDocumentPreview).toHaveBeenCalledTimes(1);
    } finally { vi.useRealTimers(); }
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

  it("업로드 중인 원본은 오류 대신 진행 표시를 보이고 저절로 다시 조회한다", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(job(null)).mockResolvedValueOnce(job("https://s3.example.test/ready.pdf"));
    await open();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector('[role="status"]')?.textContent).toContain("올리는 중");
    await act(async () => { await vi.advanceTimersByTimeAsync(SOURCE_WAIT_MS); });
    expect(container.querySelector("a")?.getAttribute("href")).toBe("https://s3.example.test/ready.pdf");
    vi.useRealTimers();
  });

  it("기다리다 다시 조회하는 동안에도 올리는 중 문구를 유지한다", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(job(null)).mockReturnValueOnce(new Promise(() => {}));
    await open();
    await act(async () => { await vi.advanceTimersByTimeAsync(SOURCE_WAIT_MS); });
    expect(fetchPdfExtraction).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[role="status"]')?.textContent).toContain("올리는 중");
    vi.useRealTimers();
  });

  it("끝까지 준비되지 않으면 기다리기를 멈추고 수동 재시도를 보인다", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchPdfExtraction).mockResolvedValue(job(null));
    await open();
    for (let step = 0; step < SOURCE_WAIT_LIMIT + 2; step++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(SOURCE_WAIT_MS); });
    }
    expect(fetchPdfExtraction).toHaveBeenCalledTimes(SOURCE_WAIT_LIMIT + 1);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("아직 준비되지");
    expect(container.querySelector("button")?.textContent).toBe("미리보기 다시 불러오기");
    vi.useRealTimers();
  });

  it("대기 시간이 끝나도 수동 재시도 후 다시 폴링해서 완성된 미리보기를 연다", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchPdfExtraction).mockResolvedValue(job(null));
    await open();
    for (let step = 0; step < SOURCE_WAIT_LIMIT; step++) {
      await act(async () => { await vi.advanceTimersByTimeAsync(SOURCE_WAIT_MS); });
    }
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(job(null))
      .mockResolvedValueOnce(job("https://s3.example.test/late.pdf"));
    await act(async () => container.querySelector("button")!.click());
    expect(container.querySelector('[role="status"]')).not.toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(SOURCE_WAIT_MS); });
    expect(container.querySelector("a")?.href).toBe("https://s3.example.test/late.pdf");
    vi.useRealTimers();
  });

  it("일시적 조회 오류에도 원본 다운로드는 새 주소를 받아 진행한다", async () => {
    vi.useFakeTimers();
    const original = { ...job(null), originalFilename: "합성.docx", originalUrl: "https://s3.example.test/old" };
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function(this: HTMLAnchorElement) {
      expect(this.href).toBe("https://s3.example.test/fresh");
    });
    try {
      vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(original)
        .mockRejectedValueOnce(Object.assign(new Error("일시적 조회 오류"), { status: 503 }))
        .mockResolvedValueOnce({ ...original, originalUrl: "https://s3.example.test/fresh" });
      await open();
      await act(async () => { await vi.advanceTimersByTimeAsync(SOURCE_WAIT_MS); });
      expect(container.querySelector('[role="alert"]')?.textContent).toBe("일시적 조회 오류");
      const download = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "원본 다운로드");
      await act(async () => download!.click());
      expect(click).toHaveBeenCalledOnce();
    } finally { click.mockRestore(); vi.useRealTimers(); }
  });

  it.each([401, 403, 404])("메타데이터가 %i이면 이전 원본과 서명 주소를 감춘다", async status => {
    const original = { ...job("https://s3.example.test/stale.pdf"), originalUrl: "https://s3.example.test/stale.docx" };
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(original).mockRejectedValueOnce(Object.assign(new Error("조회 불가"), { status }));
    await open();
    const refresh = Array.from(container.querySelectorAll("button")).find(button => button.textContent === "주소 새로고침");
    await act(async () => refresh!.click());
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).not.toContain("원본 다운로드");
  });

  it("원본 다운로드 재인증이 거부되면 진행 중인 조회도 이전 권한을 복원하지 않는다", async () => {
    vi.useFakeTimers();
    const original = { ...job(null), originalUrl: "https://s3.example.test/stale.docx" };
    let resolvePoll!: (value: PdfExtractionJob) => void;
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(original)
      .mockReturnValueOnce(new Promise(resolve => { resolvePoll = resolve; }))
      .mockRejectedValueOnce(Object.assign(new Error("권한 없음"), { status: 403 }));
    await open();
    await act(async () => { await vi.advanceTimersByTimeAsync(SOURCE_WAIT_MS); });
    await act(async () => container.querySelector("button")!.click());
    await act(async () => resolvePoll({ ...original, sourceUrl: "https://s3.example.test/stale.pdf" }));
    expect(container.querySelector("a")).toBeNull();
    expect(container.textContent).not.toContain("원본 다운로드");
    vi.useRealTimers();
  });

  it("주소 갱신 뒤에도 새 원본을 PDF.js 뷰어에 전달한다", async () => {
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(job("https://s3.example.test/first.pdf"))
      .mockResolvedValueOnce(job("https://s3.example.test/renewed.pdf"));
    await open();
    await act(async () => container.querySelector("button")!.click());
    expect(container.querySelector("a")?.getAttribute("href")).toContain("renewed.pdf");
  });

  it("PDF.js 실패 후 같은 서명 주소도 메타데이터 갱신이 성공한 시점에 한 번 다시 연다", async () => {
    const url = "https://s3.example.test/preview.pdf?signature=same";
    const ready = { ...job(url), originalFilename: "합성.docx", originalUrl: "https://s3.example.test/original.docx", uploadedAt: "2026-11-26" };
    let completeLookup!: (value: PdfExtractionJob) => void;
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(ready)
      .mockReturnValueOnce(new Promise(resolve => { completeLookup = resolve; }));
    vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
    const destroy = vi.fn().mockResolvedValue(undefined);
    loadPdf.mockImplementationOnce(() => ({ promise: Promise.reject(Object.assign(new Error("Expired"), { status: 403 })), destroy }))
      .mockImplementationOnce(() => ({ promise: Promise.resolve({ numPages: 0 }), destroy }));

    await vi.mocked(PdfOriginalViewer).withImplementation(
      ({ url, filename, onRefresh }) => <PdfCanvasViewer url={url} filename={filename} onRetry={onRefresh} />,
      async () => {
        await open(ready.originalFilename);
        const retryButton = container.querySelector<HTMLButtonElement>('[role="alert"] button');
        expect(retryButton?.textContent).toBe("다시 시도");
        await act(async () => retryButton!.click());
        expect(fetchPdfExtraction).toHaveBeenCalledTimes(2);
        expect(loadPdf).toHaveBeenCalledTimes(1);
        expect(container.textContent).toContain("원본 다운로드");

        await act(async () => completeLookup(ready));
        expect(loadPdf.mock.calls.map(([request]) => request.url)).toEqual([url, url]);
        expect(container.querySelector('[role="alert"]')).toBeNull();
        expect(observeReviewDocumentPreview).toHaveBeenCalledTimes(1);
      },
    );
  });

  it("한글 원본은 PDF 뷰어에 전달하지 않고 변환 중에도 내려받을 수 있다", async () => {
    vi.useFakeTimers();
    const original = { ...job(null), originalFilename: "합성.hwp", originalUrl: "https://s3.example.test/original.hwp", uploadedAt: "2026-11-26", previewStatus: "PENDING" } as const;
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(original)
      .mockResolvedValueOnce({ ...original, sourceUrl: "https://s3.example.test/preview.pdf", previewStatus: "READY" });
    await open();
    expect(container.querySelector('[role="status"]')?.textContent).toContain("변환");
    expect(container.querySelector("button")?.textContent).toBe("원본 다운로드");
    expect(container.querySelector("a")).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(SOURCE_WAIT_MS); });
    expect(container.querySelector("a")?.href).toBe("https://s3.example.test/preview.pdf");
    expect(container.textContent).toContain("사진이나 표 배치가 달라질 수 있습니다");
    vi.useRealTimers();
  });

  it("변환 실패 후 폴링을 멈추고 원본 다운로드를 계속 제공한다", async () => {
    vi.useFakeTimers();
    const original = { ...job(null), originalFilename: "합성.hwpx", originalUrl: "https://s3.example.test/original.hwpx", previewStatus: "FAILED" } as const;
    vi.mocked(fetchPdfExtraction).mockResolvedValueOnce(original);
    await open();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("원본");
    expect(container.querySelector("button")?.textContent).toBe("원본 다운로드");
    await act(async () => { await vi.advanceTimersByTimeAsync(SOURCE_WAIT_MS * 5); });
    expect(fetchPdfExtraction).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
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
    await act(async () => root.render(<ReviewOriginalDocument reviewId="synthetic-review" jobId="b" filename="b.pdf" onUnauthorized={unauthorized} />));
    expect(vi.mocked(fetchPdfExtraction).mock.calls[0][2]?.aborted).toBe(true);
    await act(async () => resolveA(job("https://s3.example.test/a.pdf")));
    expect(container.querySelector("a")?.getAttribute("href")).toContain("b.pdf");
  });

});
