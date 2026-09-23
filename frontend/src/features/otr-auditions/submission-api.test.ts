import { describe, expect, it } from "vitest";
import type { OtrApplication } from "./submission-api";
import { submitOtrApplication } from "./submission-api";

describe("submitOtrApplication", () => {
  it("오류 상태 사진이 선택되어 있으면 제출 전에 거절한다", async () => {
    await expect(submitOtrApplication("audition-id", {} as OtrApplication, [{
      id: "photo-1",
      name: "profile.jpg",
      url: "blob:test",
      status: "ERROR",
    }])).rejects.toThrow("사진 준비가 완료되지 않았어요");
  });
});
