import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authSuccessReturnTo } from "./return-to";
import { consumeSocialLoginReturnTo, rememberSocialLoginReturnTo } from "./social-login-return-to";

describe("배우 소셜 로그인 복귀", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
        removeItem: (key: string) => { values.delete(key); },
      },
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("일반 로그인은 메인으로 이동한다", () => {
    rememberSocialLoginReturnTo();
    expect(consumeSocialLoginReturnTo()).toBe("/");
  });

  it.each([
    "/apply/audition-id/write/review?roleId=role-1",
    "/apply/standard/otr-id?step=media",
  ])("지원서 작성 중 로그인은 복귀 정보와 함께 %s로 돌아간다", (returnTo) => {
    const destination = authSuccessReturnTo(returnTo);
    rememberSocialLoginReturnTo(destination);
    expect(consumeSocialLoginReturnTo()).toBe(destination);
    expect(consumeSocialLoginReturnTo()).toBe("/");
  });

  it("일반 로그인 시 이전에 남은 복귀 주소를 지운다", () => {
    rememberSocialLoginReturnTo("/applicants/submissions");
    rememberSocialLoginReturnTo();
    expect(consumeSocialLoginReturnTo()).toBe("/");
  });

  it("외부 주소는 메인으로 대체한다", () => {
    window.sessionStorage.setItem("yesulin:social-login:return-to", "//example.com");
    expect(consumeSocialLoginReturnTo()).toBe("/");
  });

  it("저장소에 접근할 수 없어도 메인으로 이동한다", () => {
    vi.stubGlobal("window", { get sessionStorage() { throw new Error("storage unavailable"); } });
    expect(() => rememberSocialLoginReturnTo("/apply/standard/otr-id")).not.toThrow();
    expect(consumeSocialLoginReturnTo()).toBe("/");
  });
});
