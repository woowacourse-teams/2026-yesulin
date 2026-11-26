// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { observePdfExtraction } from "@/features/analytics/pdf-analytics";
import { fetchPdfExtraction } from "./api";

vi.mock("@/features/analytics/pdf-analytics", () => ({ observePdfExtraction: vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("문서 주소만 필요하면 추출 결과를 요청하거나 기존 PDF 관측을 기록하지 않는다", async () => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ result: null, previewStatus: "READY" }));
  const signal = new AbortController().signal;
  vi.stubGlobal("fetch", fetch);
  expect(await fetchPdfExtraction("job/1", "document", signal)).toMatchObject({ result: null });
  expect(fetch).toHaveBeenCalledExactlyOnceWith("/api/v1/pdf-extractions/job%2F1?includeDocument=true",
    expect.objectContaining({ method: "GET", credentials: "include", cache: "no-store", signal }));
  expect(observePdfExtraction).not.toHaveBeenCalled();
});

it.each([false, true])("기존 추출 조회 includeResult=%s 계약을 유지한다", async includeResult => {
  const fetch = vi.fn().mockResolvedValue(Response.json({ jobId: "pdf-job" }));
  vi.stubGlobal("fetch", fetch);
  await fetchPdfExtraction("pdf-job", includeResult);
  expect(fetch).toHaveBeenCalledWith("/api/v1/pdf-extractions/pdf-job?includeResult=" + includeResult, expect.anything());
  expect(observePdfExtraction).toHaveBeenCalledExactlyOnceWith({ jobId: "pdf-job" });
});
