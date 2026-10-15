import { describe, expect, it } from "vitest";
import {
  changedFields,
  draftOf,
  emptyDraft,
  hideUndecided,
  mergeRequest,
  undecidedFields,
  writeOf,
  type CompanyProfileValues,
} from "./profile-draft";

const company: CompanyProfileValues = {
  name: "극단 예술in",
  representativeName: "홍길동",
  representativeNamePublic: false,
  links: ["https://yesulin.art"],
  foundedOn: "2015-03-01",
  address: { roadAddress: "서울 종로구 대학로 12", detailAddress: "3층", zonecode: "03086", latitude: null, longitude: null },
  addressPublic: false,
  region: null,
  phone: null,
  description: null,
  history: null,
  sourceNote: "홈페이지",
};

describe("공연사 정보 비공개 체크", () => {
  it("새로 쓸 때는 선택 항목마다 값을 적거나 비공개를 체크해야 한다", () => {
    const draft = { ...emptyDraft("극단"), phone: "02-123-4567" };

    expect(undecidedFields(draft)).toEqual([
      "REPRESENTATIVE_NAME", "FOUNDED_ON", "REGION", "LINKS", "ADDRESS", "DESCRIPTION", "HISTORY",
    ]);
    expect(undecidedFields(hideUndecided(draft))).toEqual([]);
    expect(hideUndecided(draft).hidden.PHONE).toBe(false);
  });

  it("저장된 정보의 빈 항목은 비공개로 체크해 둔다", () => {
    const draft = draftOf(company);

    expect(draft.hidden.REGION).toBe(true);
    expect(draft.hidden.REPRESENTATIVE_NAME).toBe(false);
    expect(undecidedFields(draft)).toEqual([]);
  });

  it("비공개로 체크한 항목은 값이 있어도 비워서 보낸다", () => {
    const draft = draftOf(company);
    const write = writeOf({ ...draft, hidden: { ...draft.hidden, REPRESENTATIVE_NAME: true, ADDRESS: true, LINKS: true } });

    expect(write.representativeName).toBe("");
    expect(write.address).toBeNull();
    expect(write.addressPublic).toBe(false);
    expect(write.links).toEqual([]);
    expect(write.foundedOn).toBe("2015-03-01");
  });
});

describe("공연사 정보 수정 요청", () => {
  it("처음 보여 준 정보와 다른 항목만 바꾼 항목으로 센다", () => {
    const initial = draftOf(company);
    const draft = {
      ...initial, history: "2015 창단", links: ["https://yesulin.art", " "], hidden: { ...initial.hidden, HISTORY: false },
    };

    expect(changedFields(initial, draft)).toEqual(["HISTORY"]);
    expect(changedFields(initial, { ...initial, history: "비공개 칸에 적은 글" })).toEqual([]);
  });

  it("바꾼 항목만 요청 값으로 덮어써 공개되지 않은 값을 지키고 정보 출처는 그대로 둔다", () => {
    const proposal: CompanyProfileValues = {
      ...company, representativeName: null, address: null, history: "2015 창단", sourceNote: null,
    };

    const merged = writeOf(mergeRequest(company, proposal, ["HISTORY"]));

    expect(merged.history).toBe("2015 창단");
    expect(merged.representativeName).toBe("홍길동");
    expect(merged.address?.roadAddress).toBe("서울 종로구 대학로 12");
    expect(merged.sourceNote).toBe("홈페이지");
  });
});
