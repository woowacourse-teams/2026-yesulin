import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ShowLinkButtons } from "./show-links";

describe("ShowLinkButtons", () => {
  it("잘못 저장된 링크를 건너뛰고 유효한 웹 링크는 표시한다", () => {
    const markup = renderToStaticMarkup(<ShowLinkButtons links={[
      { label: "주소 누락", url: "https://" },
      { label: "웹 링크", url: "https://www.yesulin.art/news" },
      { label: "다른 스킴", url: "javascript:alert(1)" },
    ]} />);

    expect(markup).toContain("yesulin.art");
    expect(markup).toContain("웹 링크");
    expect(markup).not.toContain("주소 누락");
    expect(markup).not.toContain("다른 스킴");
  });
});
