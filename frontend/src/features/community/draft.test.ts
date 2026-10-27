import { describe, expect, it } from "vitest";
import { SubmissionAttempt, normalizePost, normalizeComment } from "./draft";

describe("익명 작성", () => {
  it("공백만 있거나 제한보다 긴 글을 막는다", () => {
    expect(() => normalizePost(" ", "내용")).toThrow();
    expect(() => normalizePost("제목", "가".repeat(5001))).toThrow();
    expect(() => normalizeComment("가".repeat(1001))).toThrow();
    expect(normalizePost(" 제목 ", " 내용\n다음 ")).toEqual({ title: "제목", body: "내용\n다음" });
  });
  it("실패 후 같은 내용을 다시 보내면 같은 요청 번호를 사용한다", () => {
    const attempt = new SubmissionAttempt();
    const first = attempt.idFor({ title: "제목", body: "내용" });
    expect(attempt.idFor({ title: "제목", body: "내용" })).toBe(first);
    expect(attempt.idFor({ title: "제목", body: "변경" })).not.toBe(first);
    attempt.reset();
    expect(attempt.idFor({ title: "제목", body: "내용" })).not.toBe(first);
  });
});
