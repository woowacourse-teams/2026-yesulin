import { describe, expect, it } from "vitest";
import { businessCardContent } from "./business-card-preview";
import { emptyCareer, emptyRegistrationDraft } from "./registration-draft";

const draft = {
  ...emptyRegistrationDraft(),
  name: " 이동건 ",
  email: " dkms625@naver.com ",
  snsHandle: "movinggun01",
  birthDate: "2001-06-25",
  activityFields: ["THEATER", "YOUTUBE", "OTHER"] as const,
  otherActivity: " 성우 ",
  intro: " 음악과 춤을 좋아하는 사람 이동건입니다! ",
  careers: [
    { key: 1, year: "2024", month: "04", workTitle: "한성대학교 연극제", role: "춤꾼1" },
    { key: 2, year: "2026", month: "02", workTitle: "우아한연극", role: "남자" },
    { key: 3, year: "2025", month: "", workTitle: "적는 중", role: "" },
  ],
};

describe("명함 미리보기 문구", () => {
  it("실제 명함과 같은 모양으로 정리한다", () => {
    const card = businessCardContent(draft);

    expect(card.name).toBe("이동건");
    expect(card.roleLine).toBe("Actor · Theater · YouTube · 성우");
    expect(card.birthDate).toBe("2001.06.25");
    expect(card.email).toBe("dkms625@naver.com");
    expect(card.snsHandle).toBe("@movinggun01");
    expect(card.intro).toBe("음악과 춤을 좋아하는 사람 이동건입니다!");
    expect(card.careers).toEqual([
      { when: "2026.02", title: "우아한연극", role: "남자" },
      { when: "2024.04", title: "한성대학교 연극제", role: "춤꾼1" },
    ]);
    expect(card.backLayout).toBe("careers");
  });

  it("신입이거나 경력을 아직 안 적었으면 뒷면을 가운데 배치로 둔다", () => {
    expect(businessCardContent({ ...draft, noCareer: true }).backLayout).toBe("centered");
    expect(businessCardContent({ ...draft, careers: [emptyCareer(1)] }).backLayout).toBe("centered");
  });

  it("비운 칸은 그리지 않고 분야가 없으면 Actor만 쓴다", () => {
    const card = businessCardContent({ ...emptyRegistrationDraft() });
    expect(card).toMatchObject({ name: "", roleLine: "Actor", birthDate: null, email: null, snsHandle: null, intro: null });
  });
});
