import { describe, expect, it } from "vitest";
import { adminAuditionPostReadLink, adminAuditionPostRoutes, extractOtrId } from "./audition-posts";

describe("extractOtrId", () => {
  it("번호만 넣거나 원문 주소를 붙여 넣어도 번호를 꺼낸다", () => {
    expect(extractOtrId(" 22397 ")).toBe("22397");
    expect(extractOtrId("https://otr.co.kr/audition/?vid=22397")).toBe("22397");
    expect(extractOtrId("https://otr.co.kr/audition/?mode=view&vid=22394#top")).toBe("22394");
  });

  it("번호가 없으면 null이다", () => {
    expect(extractOtrId("")).toBeNull();
    expect(extractOtrId("https://otr.co.kr/audition/")).toBeNull();
    expect(extractOtrId("22a97")).toBeNull();
  });
});

describe("adminAuditionPostReadLink", () => {
  it("공개 중인 공고는 원문 유무에 관계없이 공개 상세를 연다", () => {
    for (const sourceUrl of [null, "https://otr.co.kr/audition/?vid=22397"]) {
      expect(adminAuditionPostReadLink({ id: 7, status: "PUBLISHED", sourceUrl }).href).toBe("/posts/7");
    }
  });

  it.each(["PENDING", "HIDDEN"] as const)("%s 공고는 원문이 있으면 원문, 없으면 관리자 미리보기를 연다", (status) => {
    const sourceUrl = "https://otr.co.kr/audition/?vid=22397";
    expect(adminAuditionPostReadLink({ id: 7, status, sourceUrl }).href).toBe(sourceUrl);
    expect(adminAuditionPostReadLink({ id: 7, status, sourceUrl: null }).href).toBe("/admin/posts/7/preview");
  });
});

describe("adminAuditionPostRoutes", () => {
  it("업체별 보기와 기획사별 공고 목록 주소를 만든다", () => {
    expect(adminAuditionPostRoutes.owners).toBe("/admin/posts?view=owners");
    expect(adminAuditionPostRoutes.byOwner(9003)).toBe("/admin/posts?owner=9003");
  });
});
