// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observePdfExtraction } from "@/features/analytics/pdf-analytics";
import { readPdfExtraction } from "@/features/pdf-extractions/api";
import type { PdfExtractionJob } from "@/features/pdf-extractions/types";
import { trackProductEvent } from "@/features/analytics/product-analytics";
import { PdfSourceCache } from "@/features/pdf-reviews/pdf-source-cache";
import { ReviewOriginalDocument } from "./review-original-document";

vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock("@/features/analytics/product-analytics", () => ({ trackProductEvent: vi.fn() }));
vi.mock("@/features/analytics/pdf-analytics", () => ({ observePdfExtraction: vi.fn() }));
vi.mock("@/features/pdf-extractions/api", () => ({ readPdfExtraction: vi.fn() }));
vi.mock("@/components/pdf-extractions/pdf-original-viewer", () => ({
  PdfOriginalViewer: ({ url, onRefresh }: { url: string; onRefresh: () => void }) => <>
    <a href={url}>원본</a><button type="button" onClick={onRefresh}>주소 새로고침</button>
  </>,
}));

let root: Root;
let container: HTMLDivElement;
let sources: PdfSourceCache;
const unauthorized = vi.fn();
const downloaded: string[] = [];
const job = (url: string | null, jobId = "synthetic-job"): PdfExtractionJob => ({
  jobId, originalFilename: "synthetic.pdf", size: 100, createdAt: "2026-10-25", uploadedAt: null,
  status: "COMPLETED", sourceFileKey: "originals/synthetic.pdf", resultFileKey: "", sourceUrl: url, result: null,
});
async function open(jobId = "synthetic-job", prefetchJobId?: string) {
  await act(async () => root.render(<ReviewOriginalDocument jobId={jobId} sources={sources} prefetchJobId={prefetchJobId} onUnauthorized={unauthorized} />));
}
const shown = () => container.querySelector("a")?.getAttribute("href");
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  downloaded.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => { downloaded.push(url); return new Response(new Blob([url])); }));
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:${downloaded.at(-1)}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  sources = new PdfSourceCache();
  container = document.createElement("div");
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("원본 PDF 메모리 재사용", () => {
  it("자동 원본 표시는 원본 클릭 분석 이벤트를 만들지 않고, 보여준 작업만 결과 관측으로 남긴다", async () => {
    vi.mocked(readPdfExtraction).mockResolvedValueOnce(job("https://example.test/auto.pdf"));
    await open();
    expect(trackProductEvent).not.toHaveBeenCalledWith("review_original_pdf_clicked", expect.anything());
    expect(observePdfExtraction).toHaveBeenCalledOnce();
  });

  it("서명 주소로 받은 원본을 Blob 주소로 보여 주고, 다시 열면 같은 원본을 새로 받지 않는다", async () => {
    vi.mocked(readPdfExtraction).mockResolvedValueOnce(job("https://s3.example.test/original.pdf?signature=first"));
    await open();
    expect(shown()).toBe("blob:https://s3.example.test/original.pdf?signature=first");
    await act(async () => root.render(null));
    await open();
    expect(shown()).toBe("blob:https://s3.example.test/original.pdf?signature=first");
    expect(readPdfExtraction).toHaveBeenCalledTimes(1);
    expect(downloaded).toHaveLength(1);
  });

  it("현재 원본이 뜬 뒤 다음 지원자 원본을 미리 받고, 미리 받기는 결과 관측으로 남기지 않는다", async () => {
    vi.mocked(readPdfExtraction).mockResolvedValueOnce(job("https://s3.example.test/a.pdf"))
      .mockResolvedValueOnce(job("https://s3.example.test/b.pdf", "b"));
    await open("synthetic-job", "b");
    expect(downloaded).toEqual(["https://s3.example.test/a.pdf", "https://s3.example.test/b.pdf"]);
    expect(observePdfExtraction).toHaveBeenCalledOnce();
    await open("b");
    expect(shown()).toBe("blob:https://s3.example.test/b.pdf");
    expect(readPdfExtraction).toHaveBeenCalledTimes(2);
  });

  it("원본이 준비되지 않으면 재시도로 다시 조회한다", async () => {
    vi.mocked(readPdfExtraction).mockResolvedValueOnce(job(null)).mockResolvedValueOnce(job("https://s3.example.test/ready.pdf"));
    await open();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("아직 준비되지");
    await act(async () => container.querySelector("button")!.click());
    expect(shown()).toBe("blob:https://s3.example.test/ready.pdf");
  });

  it("뷰어가 다시 시도를 요청하면 보관한 원본을 버리고 새 서명 주소로 받는다", async () => {
    vi.mocked(readPdfExtraction).mockResolvedValueOnce(job("https://s3.example.test/first.pdf"))
      .mockResolvedValueOnce(job("https://s3.example.test/renewed.pdf"));
    await open();
    await act(async () => container.querySelector("button")!.click());
    expect(shown()).toBe("blob:https://s3.example.test/renewed.pdf");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:https://s3.example.test/first.pdf");
  });

  it("401이면 권한 만료를 알리고 원본을 표시하지 않는다", async () => {
    vi.mocked(readPdfExtraction).mockRejectedValueOnce(Object.assign(new Error("로그인 필요"), { status: 401 }));
    await open();
    expect(unauthorized).toHaveBeenCalledOnce();
    expect(container.querySelector("a")).toBeNull();
  });

  it("A→B 전환 후 늦은 A 응답이 B의 원본을 덮지 않는다", async () => {
    let resolveA!: (value: PdfExtractionJob) => void;
    vi.mocked(readPdfExtraction).mockReturnValueOnce(new Promise(resolve => { resolveA = resolve; }))
      .mockResolvedValueOnce(job("https://s3.example.test/b.pdf", "b"));
    await open();
    await open("b");
    await act(async () => resolveA(job("https://s3.example.test/a.pdf")));
    expect(shown()).toBe("blob:https://s3.example.test/b.pdf");
    expect(observePdfExtraction).toHaveBeenCalledOnce();
  });
});
