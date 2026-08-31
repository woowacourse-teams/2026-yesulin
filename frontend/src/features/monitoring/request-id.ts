export const REQUEST_ID_HEADER = "X-Request-Id";

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export function withRequestId(headers: Record<string, string>) {
  const existingEntry = Object.entries(headers)
    .find(([name]) => name.toLowerCase() === REQUEST_ID_HEADER.toLowerCase());
  const requestId = existingEntry && isRequestId(existingEntry[1])
    ? existingEntry[1]
    : createRequestId();

  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers).filter(([name]) => name.toLowerCase() !== REQUEST_ID_HEADER.toLowerCase()),
  );

  return {
    requestId,
    headers: { ...normalizedHeaders, [REQUEST_ID_HEADER]: requestId },
  };
}

export function responseRequestId(response: Response, fallback: string) {
  const candidate = response.headers.get(REQUEST_ID_HEADER);
  return candidate && isRequestId(candidate) ? candidate : fallback;
}

export function isRequestId(value: unknown): value is string {
  return typeof value === "string" && REQUEST_ID_PATTERN.test(value);
}

export function createRequestId() {
  if (typeof globalThis.crypto.randomUUID === "function") return globalThis.crypto.randomUUID();
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}
