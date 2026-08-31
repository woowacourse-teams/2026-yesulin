import { describe, expect, it } from "vitest";
import { createRequestId, REQUEST_ID_HEADER, responseRequestId, withRequestId } from "./request-id";

describe("request ID correlation", () => {
  it("기존 업로드 오류 ID가 있으면 그대로 유지한다", () => {
    const correlated = withRequestId({ "x-request-id": "upload-incident-1", Accept: "application/json" });

    expect(correlated.requestId).toBe("upload-incident-1");
    expect(correlated.headers).toEqual({ Accept: "application/json", [REQUEST_ID_HEADER]: "upload-incident-1" });
  });

  it("ID가 없으면 백엔드 허용 형식의 UUID를 만든다", () => {
    const correlated = withRequestId({ Accept: "application/json" });

    expect(correlated.requestId).toMatch(/^[A-Za-z0-9._-]{1,64}$/);
    expect(correlated.headers[REQUEST_ID_HEADER]).toBe(correlated.requestId);
  });

  it("응답 ID가 유효하면 요청 때 만든 값보다 우선한다", () => {
    const response = new Response(null, { headers: { [REQUEST_ID_HEADER]: "backend-request-2" } });

    expect(responseRequestId(response, "frontend-request-1")).toBe("backend-request-2");
  });

  it("randomUUID가 없는 WebKit에서도 getRandomValues로 ID를 만든다", () => {
    const originalCrypto = globalThis.crypto;
    const getRandomValues = <T extends ArrayBufferView | null>(array: T) => {
      if (array instanceof Uint8Array) array.fill(15);
      return array;
    };
    Object.defineProperty(globalThis, "crypto", { configurable: true, value: { getRandomValues } });

    try {
      expect(createRequestId()).toBe("0f".repeat(16));
    } finally {
      Object.defineProperty(globalThis, "crypto", { configurable: true, value: originalCrypto });
    }
  });
});
