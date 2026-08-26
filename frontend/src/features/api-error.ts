/** 서버 오류 응답을 화면이 그대로 보여 줄 수 있는 형태로 읽는다. */

/** 항목별 오류. 어느 입력이 왜 거부됐는지 화면이 짚어 줄 때 사용한다. */
export type ApiErrorDetail = Readonly<Record<string, string>>;

export function readErrorDetail(body: unknown): ApiErrorDetail {
  if (typeof body !== "object" || body === null || !("detail" in body)) return {};
  const detail = (body as { detail: unknown }).detail;
  if (typeof detail !== "object" || detail === null) return {};
  return Object.fromEntries(
    Object.entries(detail as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0),
  );
}

export function readErrorCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("code" in body)) return null;
  const code = (body as { code: unknown }).code;
  return typeof code === "string" && code.trim() ? code : null;
}

/** 서버 메시지를 우선하고, 없으면 항목별 사유로라도 무엇이 잘못됐는지 알린다. */
export function readErrorMessage(body: unknown, detail: ApiErrorDetail): string {
  const serverMessage =
    typeof body === "object" && body !== null && "message" in body && typeof (body as { message: unknown }).message === "string"
      ? ((body as { message: string }).message).trim()
      : "";
  if (serverMessage) return serverMessage;
  const messages = Object.values(detail);
  return messages.length ? messages.join(" ") : "요청을 처리하지 못했습니다.";
}
