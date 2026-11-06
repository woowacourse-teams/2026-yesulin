import { expect, it } from "vitest";
import { feedAuthor } from "./author-name";

it("목록에서는 글 안에서만 의미가 있는 익명 번호를 생략한다", () => {
  expect(feedAuthor({ authorMode: "ANONYMOUS", author: "익명1" })).toBe("익명");
});

it("공개 프로필 이름은 익명 번호처럼 보여도 그대로 표시한다", () => {
  expect(feedAuthor({ authorMode: "PROFILE", author: "익명2" })).toBe("익명2");
  expect(feedAuthor({ authorMode: "PROFILE", author: "프로필 비공개" })).toBe("프로필 비공개");
});
