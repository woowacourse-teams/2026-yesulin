import { describe, expect, it } from "vitest";
import { auditionListMetadata, HOME_TITLE, SHARE_IMAGE } from "./audition-metadata";

describe("공고 목록 검색 정보", () => {
  it("분야·페이지·마감 조건이 다른 문서에 각각 canonical과 제목을 제공한다", () => {
    const home = auditionListMetadata({ page: 0, includeClosed: false });
    expect(home.title).toEqual({ absolute: HOME_TITLE });
    expect(home.alternates?.canonical).toBe("/");
    const category = auditionListMetadata({ category: "연극", page: 1, includeClosed: true });
    expect(category.title).toBe("연극 오디션 공고 · 마감 포함 · 2페이지");
    expect(category.alternates?.canonical).toBe("/auditions/theater?closed=1&page=2");
    expect(category.openGraph).toMatchObject({ title: "연극 오디션 공고 · 마감 포함 · 2페이지 | 예술in" });
    expect(category.twitter).toMatchObject({ title: "연극 오디션 공고 · 마감 포함 · 2페이지 | 예술in" });
  });

  it("레이아웃의 openGraph·twitter를 대체해도 공유 이미지를 유지한다", () => {
    for (const metadata of [
      auditionListMetadata({ page: 0, includeClosed: false }),
      auditionListMetadata({ category: "뮤지컬", page: 0, includeClosed: false }),
    ]) {
      expect(metadata.openGraph).toMatchObject({ images: [SHARE_IMAGE] });
      expect(metadata.twitter).toMatchObject({ images: [SHARE_IMAGE.url] });
    }
  });
});
