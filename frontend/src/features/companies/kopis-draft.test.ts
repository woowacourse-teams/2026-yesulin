import { describe, expect, it } from "vitest";
import { draftFromKopis } from "./kopis-draft";
import { undecidedFields } from "./profile-draft";

describe("KOPIS 정보로 공연사 처음 값 만들기", () => {
  it("이름·홈페이지·장르·최근 작품·출처를 채우고 나머지는 운영자가 정하게 둔다", () => {
    const draft = draftFromKopis({
      kopisId: "AG019413",
      name: "(주)크리티브(픽시클래스)",
      genre: "뮤지컬",
      phone: null,
      homepage: "https://blog.naver.com/creetive008",
      recentWorks: ["생명을 지킨 별주부 [인천]", "엄마를 지킨 청개구리 [인천]"],
    }, "2026-10-15");

    expect(draft.name).toBe("(주)크리티브(픽시클래스)");
    expect(draft.links).toEqual(["https://blog.naver.com/creetive008"]);
    expect(draft.phone).toBe("");
    expect(draft.description).toBe("뮤지컬 공연을 만드는 공연사예요.\nKOPIS 등록 작품: 생명을 지킨 별주부 [인천], 엄마를 지킨 청개구리 [인천]");
    expect(draft.sourceNote).toBe("KOPIS 기획제작사 AG019413 (2026-10-15 조회)");
    expect(undecidedFields(draft)).toEqual(["REPRESENTATIVE_NAME", "FOUNDED_ON", "PHONE", "REGION", "ADDRESS", "HISTORY"]);
  });

  it("연락처 형식이 맞을 때만 쓰고 프로토콜 없는 홈페이지에는 https를 붙인다", () => {
    const draft = draftFromKopis({
      kopisId: null, name: "극단", genre: null, phone: "02-765-4321", homepage: "www.example.com", recentWorks: [],
    }, "2026-10-15");

    expect(draft.phone).toBe("02-765-4321");
    expect(draft.links).toEqual(["https://www.example.com"]);
    expect(draft.description).toBe("");
    expect(draft.sourceNote).toBe("KOPIS 기획제작사 (2026-10-15 조회)");
  });
});
