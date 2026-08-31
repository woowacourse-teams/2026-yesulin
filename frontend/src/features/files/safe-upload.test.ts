import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({ captureException: vi.fn(), setTag: vi.fn() }));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentry.captureException,
  withScope: (callback: (scope: { setTag: typeof sentry.setTag }) => void) => callback({ setTag: sentry.setTag }),
}));
import {
  SafeUploadError,
  prepareMemoryBlob,
  safeUpload,
  uploadSequentially,
  type UploadDiagnostic,
  type UploadResource,
} from "./safe-upload";

const upload: UploadResource = {
  fileId: 42,
  uploadUrl: "https://storage.test/upload",
  method: "PUT",
  headers: { "Content-Type": "image/jpeg" },
};

function input(overrides: Partial<Parameters<typeof safeUpload>[0]> = {}) {
  return {
    flow: "APPLICATION_PHOTO" as const,
    source: new File([new Uint8Array([1, 2, 3])], "private-name.jpg", { type: "image/jpeg" }),
    originalFilename: "private-name.jpg",
    requestUpload: vi.fn().mockResolvedValue(upload),
    completeUpload: vi.fn().mockResolvedValue(undefined),
    put: vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    createIncidentId: () => "11111111-1111-4111-8111-111111111111",
    reportDiagnostic: vi.fn(),
    ...overrides,
  };
}

describe("safeUpload", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disk-backed File 대신 같은 크기와 타입의 메모리 Blob을 PUT한다", async () => {
    const spec = input();

    await safeUpload(spec);

    const body = vi.mocked(spec.put).mock.calls[0]?.[1];
    expect(body).toBeInstanceOf(Blob);
    expect(body).not.toBe(spec.source);
    expect(body).not.toBeInstanceOf(File);
    expect(body?.size).toBe(spec.source.size);
    expect(body?.type).toBe(spec.source.type);
    expect(spec.requestUpload).toHaveBeenCalledWith(
      { originalFilename: spec.originalFilename, contentType: "image/jpeg", size: 3 },
      { incidentId: "11111111-1111-4111-8111-111111111111" },
    );
  });

  it("현재 페이지에서 준비한 메모리 Blob은 제출할 때 다시 읽지 않고 그대로 PUT한다", async () => {
    const prepared = await prepareMemoryBlob(new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }));
    const read = vi.spyOn(prepared, "arrayBuffer");
    const spec = input({ source: prepared });

    await safeUpload(spec);

    expect(read).not.toHaveBeenCalled();
    expect(vi.mocked(spec.put).mock.calls[0]?.[1]).toBe(prepared);
  });

  it("메모리 복사 크기가 다르면 네트워크 요청 전에 실패한다", async () => {
    class WrongSizeBlob extends Blob {
      override get size() { return super.size + 1; }
    }
    const spec = input({ source: new WrongSizeBlob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }) });

    await expect(safeUpload(spec)).rejects.toMatchObject({
      name: "SafeUploadError",
      code: "MEMORY_BLOB_SIZE_MISMATCH",
      stage: "PREPARE",
    });
    expect(spec.requestUpload).not.toHaveBeenCalled();
    expect(spec.put).not.toHaveBeenCalled();
  });

  it("NotFoundError이면 같은 URL과 Blob으로 한 번만 재시도한다", async () => {
    const notFound = new DOMException("The object can not be found here.", "NotFoundError");
    const spec = input({ put: vi.fn().mockRejectedValueOnce(notFound).mockResolvedValueOnce(new Response(null, { status: 200 })) });

    const result = await safeUpload(spec);

    expect(spec.put).toHaveBeenCalledTimes(2);
    expect(vi.mocked(spec.put).mock.calls[1]?.[0]).toBe(upload);
    expect(vi.mocked(spec.put).mock.calls[1]?.[1]).toBe(vi.mocked(spec.put).mock.calls[0]?.[1]);
    expect(spec.completeUpload).toHaveBeenCalledTimes(1);
    expect(result.retried).toBe(true);
    expect(sentry.setTag).toHaveBeenCalledWith("operation", "retry_recovered");
    expect(sentry.setTag).toHaveBeenCalledWith("error_code", "WEBKIT_FILE_NOT_FOUND");
    expect(sentry.captureException).toHaveBeenCalledWith(notFound);
    expect(spec.reportDiagnostic).toHaveBeenCalledWith(expect.objectContaining({
      stage: "RETRY",
      attempt: 2,
      result: "RETRY_SUCCEEDED",
      errorCode: "WEBKIT_FILE_NOT_FOUND",
    } satisfies Partial<UploadDiagnostic>));
  });

  it("0바이트 completion mismatch이면 같은 URL로 덮어쓴 뒤 completion을 다시 호출한다", async () => {
    const mismatch = Object.assign(new Error("metadata mismatch"), { code: "FILE_METADATA_MISMATCH", status: 409 });
    const spec = input({ completeUpload: vi.fn().mockRejectedValueOnce(mismatch).mockResolvedValueOnce(undefined) });

    await safeUpload(spec);

    expect(spec.put).toHaveBeenCalledTimes(2);
    expect(spec.completeUpload).toHaveBeenCalledTimes(2);
  });

  it("403 PUT 응답은 재시도하지 않고 오류 ID가 포함된 단계 오류로 반환한다", async () => {
    const spec = input({ put: vi.fn().mockResolvedValue(new Response(null, { status: 403 })) });

    const caught = await safeUpload(spec).catch((cause: unknown) => cause);

    expect(caught).toBeInstanceOf(SafeUploadError);
    expect(caught).toMatchObject({ code: "S3_PUT_REJECTED", stage: "PUT", attempt: 1, httpStatus: 403 });
    expect((caught as Error).message).toContain("11111111-1111-4111-8111-111111111111");
    expect((caught as Error).message).toContain("전송");
    expect(spec.put).toHaveBeenCalledTimes(1);
  });

  it("진단 콜백 자체가 실패해도 원래 업로드 오류를 유지한다", async () => {
    const spec = input({
      put: vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
      reportDiagnostic: vi.fn(() => { throw new Error("diagnostic unavailable"); }),
    });

    await expect(safeUpload(spec)).rejects.toMatchObject({
      name: "SafeUploadError",
      code: "S3_PUT_REJECTED",
      stage: "PUT",
    });
  });

  it("두 번째 Failed to fetch 뒤에는 세 번째 PUT을 하지 않는다", async () => {
    const spec = input({ put: vi.fn().mockRejectedValue(new TypeError("Failed to fetch")) });

    await expect(safeUpload(spec)).rejects.toMatchObject({
      code: "NETWORK_FETCH_FAILED",
      stage: "RETRY",
      attempt: 2,
    });
    expect(spec.put).toHaveBeenCalledTimes(2);
    expect(spec.reportDiagnostic).toHaveBeenLastCalledWith(expect.objectContaining({ result: "FAILED", attempt: 2 }));
  });
});

describe("uploadSequentially", () => {
  it("여러 사진의 메모리 준비와 업로드가 겹치지 않는다", async () => {
    let active = 0;
    let maxActive = 0;
    const completed: number[] = [];

    const result = await uploadSequentially([1, 2, 3], async (value) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      completed.push(value);
      active -= 1;
      return value * 10;
    });

    expect(result).toEqual([10, 20, 30]);
    expect(completed).toEqual([1, 2, 3]);
    expect(maxActive).toBe(1);
  });
});
