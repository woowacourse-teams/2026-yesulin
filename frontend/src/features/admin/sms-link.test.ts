import { describe, expect, it } from "vitest";
import { smsHref } from "./sms-link";

const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 15; SM-S928N) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36";

describe("smsHref", () => {
  it("fills one recipient without hyphens and the encoded body", () => {
    expect(smsHref("010-1234-5678", "[예술인] 안내\n링크 & 확인", ANDROID))
      .toBe("sms:01012345678?body=%5B%EC%98%88%EC%88%A0%EC%9D%B8%5D%20%EC%95%88%EB%82%B4%0A%EB%A7%81%ED%81%AC%20%26%20%ED%99%95%EC%9D%B8");
  });

  it("uses the Apple body separator on iPhone and Mac", () => {
    expect(smsHref("010-1234-5678", "본문", IPHONE)).toBe("sms:01012345678&body=%EB%B3%B8%EB%AC%B8");
    expect(smsHref("01012345678", "본문", "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)")).toMatch(/^sms:01012345678&body=/);
  });
});
