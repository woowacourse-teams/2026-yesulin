function required(value: string, maximum: number, label: string) {
  const normalized = value.replace(/\r\n?/g, "\n").trim();
  if (!normalized) throw new Error(`${label}을 입력해 주세요.`);
  if (normalized.length > maximum) throw new Error(`${label}은 ${maximum}자까지 입력할 수 있어요.`);
  return normalized;
}

export function normalizePost(title: string, body: string) {
  return { title: required(title, 100, "제목"), body: required(body, 5000, "내용") };
}

export function normalizeComment(body: string) {
  return { body: required(body, 1000, "내용") };
}

export class SubmissionAttempt {
  private payload = "";
  private requestId = "";

  idFor(input: object) {
    const payload = JSON.stringify(input);
    if (payload !== this.payload) {
      this.payload = payload;
      this.requestId = crypto.randomUUID();
    }
    return this.requestId;
  }

  reset() {
    this.payload = "";
    this.requestId = "";
  }
}
