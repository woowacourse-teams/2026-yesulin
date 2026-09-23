import { describe, expect, it } from "vitest";
import { buildTypedApplicationAuthReturnTo } from "./return-to";

describe("buildTypedApplicationAuthReturnTo", () => {
  it("OTR 지원서의 현재 단계를 반환 주소에 보존한다", () => {
    expect(buildTypedApplicationAuthReturnTo("OTR", "audition/id", [], "media"))
      .toBe("/apply/standard/audition%2Fid?step=media");
  });
});
