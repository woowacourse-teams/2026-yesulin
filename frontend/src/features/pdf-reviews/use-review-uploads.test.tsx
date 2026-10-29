// @vitest-environment jsdom
import { StrictMode, act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReviewUploads } from "./use-review-uploads";
import { completePdfUpload, putPdf } from "../pdf-extractions/api";
import { preparePdfReviewUpload } from "./api";

vi.mock("./api", () => ({ preparePdfReviewUpload: vi.fn(), isUnauthorized: () => false }));
vi.mock("../pdf-extractions/api", () => ({
  completePdfUpload: vi.fn(), putPdf: vi.fn(), PdfExtractionApiError: class extends Error {},
}));

let root: Root | null;
let uploads: ReturnType<typeof useReviewUploads>;
let uploaded = vi.fn<() => void>();

function mount() {
  uploaded = vi.fn();
  function Harness() {
    const [, setRefresh] = useState(0);
    uploads = useReviewUploads({ onUploaded: () => { uploaded(); setRefresh(value => value + 1); }, onUnauthorized: vi.fn() });
    return null;
  }
  root = createRoot(document.createElement("div"));
  act(() => root!.render(<StrictMode><Harness /></StrictMode>));
}

function files(count: number) {
  return Array.from({ length: count }, (_, index) => new File(["synthetic metadata only"], `sample-${index + 1}.pdf`, { type: "application/pdf" }));
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}

async function settle(check: () => void) {
  await act(async () => { await vi.waitFor(check); });
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks();
  vi.mocked(preparePdfReviewUpload).mockImplementation(async (_id, file) => ({
    jobId: file.name, fileKey: file.name,
    upload: { url: "http://example.test/never-requested", method: "PUT", expiresAt: "2099-01-01T00:00:00Z", headers: {} },
  }));
  vi.mocked(putPdf).mockResolvedValue(undefined);
  vi.mocked(completePdfUpload).mockResolvedValue({} as Awaited<ReturnType<typeof completePdfUpload>>);
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  vi.unstubAllGlobals();
});

describe("PDF 다중 업로드 접수", () => {
  it("가상 PDF 7개를 한 번에 선택하면 갱신 중에도 7개 모두 접수한다", async () => {
    mount();
    act(() => uploads.choose("review", files(7), 0));
    await settle(() => expect(uploaded).toHaveBeenCalledTimes(7));
    expect(preparePdfReviewUpload).toHaveBeenCalledTimes(7);
    expect(putPdf).toHaveBeenCalledTimes(7);
    expect(completePdfUpload).toHaveBeenCalledTimes(7);
    expect(uploads.rows).toHaveLength(0);
    expect(uploads.busy).toBe(false);
    expect(uploads.notices).toHaveLength(7);
    expect(uploads.notices.every(item => item.phase === "UPLOADED" && !("file" in item))).toBe(true);
  });

  it("파일 선택 입력을 비워도 복사된 7개 작업은 줄어들지 않는다", async () => {
    mount();
    const selected = files(7);
    const liveList = { get length() { return selected.length; }, [Symbol.iterator]: () => selected[Symbol.iterator]() } as unknown as FileList;
    act(() => { uploads.choose("review", liveList, 0); selected.length = 0; });
    await settle(() => expect(uploaded).toHaveBeenCalledTimes(7));
    expect(preparePdfReviewUpload).toHaveBeenCalledTimes(7);
  });

  it("업로드 동시 실행 수는 파일 7개에서도 최대 2개다", async () => {
    mount();
    const gate = deferred();
    let active = 0;
    let maximum = 0;
    vi.mocked(putPdf).mockImplementation(async () => {
      active += 1; maximum = Math.max(maximum, active);
      await gate.promise; active -= 1;
    });
    act(() => uploads.choose("review", files(7), 0));
    await settle(() => expect(putPdf).toHaveBeenCalledTimes(2));
    expect(preparePdfReviewUpload).toHaveBeenCalledTimes(2);
    await act(async () => { gate.resolve(); });
    await settle(() => expect(uploaded).toHaveBeenCalledTimes(7));
    expect(maximum).toBe(2);
  });

  it("화면이 재마운트돼도 이미 접수한 7개 작업을 3개에서 중단하지 않는다", async () => {
    mount();
    const second = deferred();
    const third = deferred();
    vi.mocked(putPdf).mockImplementation(async file => {
      if (file.name === "sample-2.pdf") await second.promise;
      if (file.name === "sample-3.pdf") await third.promise;
    });
    act(() => uploads.choose("review", files(7), 0));
    await settle(() => expect(preparePdfReviewUpload).toHaveBeenCalledTimes(3));
    act(() => root!.unmount());
    root = null;
    await act(async () => { second.resolve(); third.resolve(); });
    await settle(() => expect(completePdfUpload).toHaveBeenCalledTimes(7));
    expect(preparePdfReviewUpload).toHaveBeenCalledTimes(7);
  });

  it("한 파일의 업로드 준비 실패가 뒤의 파일을 막지 않는다", async () => {
    mount();
    const original = vi.mocked(preparePdfReviewUpload).getMockImplementation()!;
    vi.mocked(preparePdfReviewUpload).mockImplementation(async (id, file) => {
      if (file.name === "sample-3.pdf") throw new Error("mock preparation failure");
      return original(id, file);
    });
    act(() => uploads.choose("review", files(7), 0));
    await settle(() => expect(uploaded).toHaveBeenCalledTimes(6));
    expect(uploads.busy).toBe(false);
    expect(preparePdfReviewUpload).toHaveBeenCalledTimes(7);
    expect(uploaded).toHaveBeenCalledTimes(6);
    expect(uploads.rows).toHaveLength(1);
    expect(uploads.rows[0].name).toBe("sample-3.pdf");
    expect(uploads.rows[0].error).toContain("mock preparation failure");
  });

  it("제외된 파일도 선택 개수와 결과에 남겨 7개를 3개로 잘못 안내하지 않는다", async () => {
    mount();
    const selected = files(7);
    for (const file of selected.slice(3)) Object.defineProperty(file, "size", { value: 26 * 1024 * 1024 });
    act(() => uploads.choose("review", selected, 0));
    await settle(() => expect(uploaded).toHaveBeenCalledTimes(3));
    expect(uploads.rows).toHaveLength(4);
    expect(uploads.message).toContain("선택 7개");
    expect(uploads.message).toContain("업로드 완료 3개");
    expect(uploads.message).toContain("제외 4개");
  });

  it("화면이 사라져도 남은 작업 동안 창 종료 경고를 유지하고 끝나면 해제한다", async () => {
    mount();
    const gate = deferred();
    vi.mocked(putPdf).mockImplementation(async () => gate.promise);
    act(() => uploads.choose("review", files(7), 0));
    await settle(() => expect(putPdf).toHaveBeenCalledTimes(2));
    act(() => root!.unmount()); root = null;
    const during = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(during);
    expect(during.defaultPrevented).toBe(true);
    await act(async () => gate.resolve());
    await settle(() => expect(completePdfUpload).toHaveBeenCalledTimes(7));
    const after = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it("완료 알림을 지워도 실패한 파일의 재시도 작업은 남긴다", async () => {
    mount();
    const original = vi.mocked(preparePdfReviewUpload).getMockImplementation()!;
    vi.mocked(preparePdfReviewUpload).mockImplementation(async (id, file) => {
      if (file.name === "sample-2.pdf") throw new Error("temporary failure");
      return original(id, file);
    });
    act(() => uploads.choose("review", files(3), 0));
    await settle(() => expect(uploaded).toHaveBeenCalledTimes(2));
    expect(uploads.busy).toBe(false);
    expect(uploads.notices).toHaveLength(3);
    act(() => uploads.clearUploaded("review"));
    expect(uploads.notices).toHaveLength(1);
    expect(uploads.rows).toHaveLength(1);
    vi.mocked(preparePdfReviewUpload).mockImplementation(original);
    act(() => { void uploads.retry(uploads.rows[0]); });
    await settle(() => expect(uploaded).toHaveBeenCalledTimes(3));
    expect(uploads.notices[0].phase).toBe("UPLOADED");
    act(() => uploads.remove(uploads.notices[0].id));
    expect(uploads.notices).toHaveLength(0);
    expect(uploads.rows).toHaveLength(0);
  });
});
