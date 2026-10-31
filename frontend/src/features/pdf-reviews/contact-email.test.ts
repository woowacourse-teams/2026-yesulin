import { describe, expect, it } from "vitest";
import { contactEmail } from "./contact-email";

describe("PDF 기재 이메일", () => {
  it.each(["이메일: actor.name+stage@example.test", "<actor.name+stage@example.test>", "mailto:actor.name+stage@example.test", "actor.name+stage@EXAMPLE.TEST.", "ａｃｔｏｒ．ｎａｍｅ＋ｓｔａｇｅ＠ｅｘａｍｐｌｅ．ｔｅｓｔ"])("명시된 주소를 읽는다: %s", text => {
    expect(contactEmail(text)).toEqual({ status: "FOUND", email: "actor.name+stage@example.test" });
  });
  it("도메인 대소문자와 반복만 합치고 로컬 부분은 보존한다", () => {
    expect(contactEmail("Actor@example.test\nActor@EXAMPLE.TEST")).toEqual({ status: "FOUND", email: "Actor@example.test" });
    expect(contactEmail("Actor@example.test actor@example.test").status).toBe("MULTIPLE");
  });
  it("서로 다른 이메일 중 하나를 추측하지 않는다", () => {
    expect(contactEmail("본인: actor@example.test / 소속사: agency@example.test")).toEqual({ status: "MULTIPLE", email: null });
  });
  it.each(["", "이메일 미기재", "actor [at] example.test", "actor@\nexample.test", "actor\n@example.test", "actor@@example.test", ".actor@example.test", "actor..name@example.test", "actor.@example.test", "actor@example..test", "actor@-example.test", "actor@example-.test", "actor@example_test.com", "actor@example.test..", "한글actor@example.test", "actor@example.test입니다", "https://example.test/?email=actor@example.test", "www.example.test/actor@example.test", "ftp://actor@example.test/file"])("누락·잘못된 주소·URL·줄바꿈 주소를 추정하지 않는다: %s", text => {
    expect(contactEmail(text)).toEqual({ status: "MISSING", email: null });
  });
  it("주소 길이 상한을 넘으면 일부를 잘라 표시하지 않는다", () => {
    expect(contactEmail(`${"a".repeat(65)}@example.test`).status).toBe("MISSING");
    expect(contactEmail(`actor@${"a".repeat(64)}.test`).status).toBe("MISSING");
  });
});
