import { describe, expect, it } from "vitest";
import { MAX_PROFILE_IMPORT_BYTES, birthDateOf, careerGenreOf, careerYearOf, heightOf, importedCareers, profileImportFileError } from "./profile-import";

const TODAY = new Date("2026-10-29T00:00:00+09:00");

describe("birth date", () => {
  it.each([
    ["1998.07.04", "1998-07-04"],
    ["1998-7-4", "1998-07-04"],
    ["1998년 7월 4일", "1998-07-04"],
    ["생년월일 1998 . 07 . 04", "1998-07-04"],
  ])("reads %s", (value, expected) => {
    expect(birthDateOf(value, TODAY)).toBe(expected);
  });

  it.each(["98.07.04", "1998.07", "1998.02.30", "2030.01.01", "만 27세"])("leaves %s empty", (value) => {
    expect(birthDateOf(value, TODAY)).toBeNull();
  });
});

describe("height", () => {
  it.each([["165cm", 165], ["165", 165], ["165 cm", 165], ["170㎝", 170]])("reads %s", (value, expected) => {
    expect(heightOf(value)).toBe(expected);
  });

  it.each(["165.5cm", "5ft 5in", "키 165", "1650"])("leaves %s empty", (value) => {
    expect(heightOf(value)).toBeNull();
  });
});

describe("career year and genre", () => {
  it("reads a single four-digit year only", () => {
    expect(careerYearOf("2024.05 ~ 06", TODAY)).toBe(2024);
    expect(careerYearOf("2025", TODAY)).toBe(2025);
    expect(careerYearOf("25.08 ~ 12", TODAY)).toBeNull();
    expect(careerYearOf("2023.12 ~ 2024.02", TODAY)).toBeNull();
    expect(careerYearOf("2099", TODAY)).toBeNull();
    expect(careerYearOf(null, TODAY)).toBeNull();
  });

  it("uses only the exact genre names", () => {
    expect(careerGenreOf("연극")).toBe("THEATER");
    expect(careerGenreOf(" 웹드라마 ")).toBe("WEB_DRAMA");
    expect(careerGenreOf("창작 연극")).toBeNull();
    expect(careerGenreOf(null)).toBeNull();
  });
});

describe("imported careers", () => {
  it("marks repeated proposals as duplicates while preserving different years and roles", () => {
    const career = { title: "햄릿", part: "오필리아", genre: "연극", period: "2025", venue: null, company: null, evidence: "2025 햄릿 오필리아" };
    const careers = importedCareers([
      career,
      { ...career, title: " 햄릿 ", part: " 오필리아 " },
      { ...career, part: "햄릿" },
      { ...career, period: "2024" },
    ], [], TODAY);

    expect(careers.map((item) => item.duplicate)).toEqual([false, true, false, false]);
  });

  it("does not assume proposals with unreadable years are the same career", () => {
    const career = { title: "햄릿", part: "오필리아", genre: "연극", period: null, venue: null, company: null, evidence: "햄릿 오필리아" };
    expect(importedCareers([career, career], [], TODAY).map((item) => item.duplicate)).toEqual([false, false]);
  });

  it("leaves unreadable year and role blank and marks careers already saved", () => {
    const careers = importedCareers([
      { title: "햄릿", part: "오필리아", genre: "연극", period: "2025", venue: null, company: null, evidence: "연극 햄릿 오필리아 2025" },
      { title: "빨래", part: null, genre: "뮤지컬", period: "23.03 ~ 04", venue: null, company: null, evidence: "뮤지컬 빨래 23.03 ~ 04" },
    ], [{ year: 2025, title: "햄릿", part: "오필리아", genre: null }], TODAY);

    expect(careers[0]).toEqual({ entry: { year: 2025, title: "햄릿", part: "오필리아", genre: "THEATER" }, needsInput: false, duplicate: true, similar: false });
    expect(careers[1]).toEqual({ entry: { year: 0, title: "빨래", part: "", genre: "MUSICAL" }, needsInput: true, duplicate: false, similar: false });
  });

  it("flags a career with an unreadable year when the same title is already saved", () => {
    const [career] = importedCareers(
      [{ title: "빨래", part: null, genre: "뮤지컬", period: "23.03 ~ 04", venue: null, company: null, evidence: "뮤지컬 빨래 23.03 ~ 04" }],
      [{ year: 2023, title: "빨래", part: "앙상블", genre: "MUSICAL" }],
      TODAY,
    );

    expect(career).toMatchObject({ duplicate: false, similar: true });
  });
});

it("accepts PDFs and rejects other formats", () => {
  expect(profileImportFileError(new File(["x"], "profile.pdf", { type: "application/pdf" }))).toBeNull();
  expect(profileImportFileError(new File(["x"], "profile.png", { type: "image/png" }))).toBe("PDF 파일만 올릴 수 있어요.");
});

it.each([
  [MAX_PROFILE_IMPORT_BYTES, null],
  [MAX_PROFILE_IMPORT_BYTES + 1, "PDF는 25MB 이하만 올릴 수 있어요."],
])("checks the PDF size boundary at %i bytes", (size, expected) => {
  const file = new File(["x"], "profile.pdf", { type: "application/pdf" });
  Object.defineProperty(file, "size", { value: size });
  expect(profileImportFileError(file)).toBe(expected);
});
