import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FallbackImage } from "./fallback-image";

describe("이미지 대체 표시", () => {
  it("원래 이미지의 클래스와 가로세로 비율로 같은 자리를 차지한다", () => {
    const html = renderToStaticMarkup(<FallbackImage src="" alt="" width={1080} height={608} className="aspect-[16/9] object-cover" />);
    expect(html).toContain("aspect-ratio:1080 / 608");
    expect(html).toContain("aspect-[16/9] object-cover");
    expect(html).not.toContain("min-h-48");
  });

  it("장식 이미지는 숨기고, 설명이 있는 이미지는 실패를 알린다", () => {
    expect(renderToStaticMarkup(<FallbackImage src="" alt="" fill />)).toContain('aria-hidden="true"');
    const poster = renderToStaticMarkup(<FallbackImage src="" alt="봄날 포스터" fill />);
    expect(poster).toContain('role="img"');
    expect(poster).toContain("봄날 포스터 · 이미지를 불러올 수 없어요");
  });
});
