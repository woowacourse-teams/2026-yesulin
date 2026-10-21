import { describe, expect, it } from "vitest";
import { renderInvitation } from "./invitation-template";

describe("renderInvitation", () => {
  it("배우마다 다른 값을 채우고 모르는 자리는 그대로 둔다", () => {
    expect(renderInvitation("{이름}님 {오디션일시} {작품명} {단체명} {장소} {안내사항} {없는값} {이름}", {
      actorName: "김배우",
      title: "햄릿",
      organizerName: "남극장",
      schedule: "10월 10일 (토) 10:00~10:30",
      location: "연습실",
      guide: "MR 지참",
    })).toBe("김배우님 10월 10일 (토) 10:00~10:30 햄릿 남극장 연습실 MR 지참 {없는값} 김배우");
  });
});
