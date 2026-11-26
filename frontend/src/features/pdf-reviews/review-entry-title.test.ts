import { expect, it } from "vitest";
import { reviewContactName, reviewEntryTitle } from "./types";

const originalFilename = "지원서  최종.pdf";

it.each([undefined, "", "  ", originalFilename])("제목 %j의 기본값은 공백을 그대로 둔 원본 파일명이다", title => {
  const entry = { title, originalFilename, applicantName: "가람" };
  expect(reviewEntryTitle(entry)).toBe(originalFilename);
  expect(reviewContactName(entry)).toBe("가람");
});

it("수동으로 저장한 제목은 유지하며 파일명 자체는 사람 이름으로 쓰지 않는다", () => {
  expect(reviewEntryTitle({ originalFilename, title: "가람" })).toBe("가람");
  expect(reviewContactName({ originalFilename, title: "가람", applicantName: "자동 이름" })).toBe("가람");
  expect(reviewContactName({ originalFilename, title: originalFilename, applicantName: null })).toBe("");
});
