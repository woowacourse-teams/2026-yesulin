import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readPdfExtraction } from "../pdf-extractions/api";
import { reportPdfError } from "../pdf-extractions/report-pdf-error";
import type { PdfExtractionJob } from "../pdf-extractions/types";
import { PdfSourceCache } from "./pdf-source-cache";

vi.mock("../pdf-extractions/api", () => ({ readPdfExtraction: vi.fn() }));
vi.mock("../pdf-extractions/report-pdf-error", () => ({ reportPdfError: vi.fn() }));

const job = (jobId: string): PdfExtractionJob => ({
  jobId, originalFilename: `${jobId}.pdf`, size: 100, createdAt: "2026-11-08", uploadedAt: "2026-11-08",
  status: "COMPLETED", sourceFileKey: "", resultFileKey: "", sourceUrl: `https://s3.example.test/${jobId}.pdf`, result: null,
});
const fetchMock = vi.fn(async (url: string) => new Response(new Blob([url])));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(readPdfExtraction).mockImplementation(async jobId => job(jobId));
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:${fetchMock.mock.calls.at(-1)?.[0]}`);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("심사 원본 메모리 보관", () => {
  it("최근 3개만 보관하고 밀려난 원본의 Blob 주소를 놓아 준다", async () => {
    const cache = new PdfSourceCache();
    for (const id of ["a", "b", "c", "d"]) await cache.open(id).source;
    await Promise.resolve();
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:https://s3.example.test/a.pdf");
    await cache.open("b").source;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("다시 연 원본은 가장 최근으로 올라가 밀려나지 않는다", async () => {
    const cache = new PdfSourceCache();
    for (const id of ["a", "b", "c", "a", "d"]) await cache.open(id).source;
    await Promise.resolve();
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:https://s3.example.test/b.pdf");
  });

  it("이미 보관한 원본은 미리 받지 않고, 실패한 원본은 다음에 다시 받는다", async () => {
    const cache = new PdfSourceCache();
    await cache.open("a").source;
    cache.prefetch("a");
    expect(readPdfExtraction).toHaveBeenCalledOnce();
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 403 }));
    await expect(cache.open("b").source).rejects.toThrow("원본 PDF를 불러오지 못했습니다.");
    await cache.open("b").source;
    expect(readPdfExtraction).toHaveBeenCalledTimes(3);
  });

  it("밀려난 원본이 아직 받는 중이면 다운로드를 멈춘다", async () => {
    const signals: AbortSignal[] = [];
    vi.mocked(readPdfExtraction).mockImplementation(async (jobId, _include, signal) => { signals.push(signal!); return job(jobId); });
    const cache = new PdfSourceCache();
    const sources = ["a", "b", "c"].map(id => cache.open(id).source);
    cache.prefetch("d");
    expect(signals.map(signal => signal.aborted)).toEqual([true, false, false, false]);
    await Promise.allSettled([...sources, cache.open("d").source]);
  });

  it("네트워크 실패는 브라우저 오류 대신 안내 문구로 바꾸고 원본 표시 실패로 보고한다", async () => {
    const cache = new PdfSourceCache();
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await expect(cache.open("a").source).rejects.toThrow("원본 PDF를 불러오지 못했습니다.");
    expect(reportPdfError).toHaveBeenCalledWith(expect.any(TypeError), "load_document");
  });

  it("화면을 떠나면 보관한 원본을 모두 놓아 주고, 그 뒤 도착한 원본도 남기지 않는다", async () => {
    const cache = new PdfSourceCache();
    await cache.open("a").source;
    const late = cache.open("b").source;
    cache.clear();
    await late;
    await Promise.resolve();
    expect(vi.mocked(URL.revokeObjectURL).mock.calls.map(([url]) => url).sort())
      .toEqual(["blob:https://s3.example.test/a.pdf", "blob:https://s3.example.test/b.pdf", "blob:https://s3.example.test/b.pdf"]);
  });
});
