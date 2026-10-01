import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ApplicantPhotoImage } from "./applicant-photo";

describe("ApplicantPhotoImage", () => {
  it("비공개 콘텐츠 URL을 최적화 프록시나 fallback으로 바꾸지 않는다", () => {
    const markup = renderToStaticMarkup(<ApplicantPhotoImage photo={{
      label: "프로필", url: "/api/v1/files/41/content", fallbackUrl: "data:image/svg+xml,fallback",
    }} alt="지원자 프로필 사진" sizes="280px" />);

    expect(markup).toContain('src="/api/v1/files/41/content"');
    expect(markup).not.toContain("/_next/image");
    expect(markup).not.toContain("fallback");
    expect(markup).toContain('loading="lazy"');
  });

  it("사진 미제출은 이미지 요청 없이 안내한다", () => {
    const markup = renderToStaticMarkup(<ApplicantPhotoImage photo={undefined} alt="지원자 사진" sizes="38px" />);

    expect(markup).toContain("제출된 사진이 없습니다");
    expect(markup).not.toContain("<img");
  });

  it("사진 데이터가 있지만 URL이 비어 있으면 미제출이 아닌 조회 오류로 안내한다", () => {
    const markup = renderToStaticMarkup(<ApplicantPhotoImage photo={{
      label: "프로필", url: "", fallbackUrl: "data:image/svg+xml,fallback",
    }} alt="지원자 사진" sizes="280px" />);

    expect(markup).toContain("사진을 불러오지 못했습니다");
    expect(markup).not.toContain("제출된 사진이 없습니다");
    expect(markup).not.toContain("<img");
  });
});
