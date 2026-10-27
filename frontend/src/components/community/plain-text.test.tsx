import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PlainText } from "./community-ui";

it("사용자 HTML과 javascript 주소를 실행 가능한 요소로 만들지 않는다", () => {
  const html = renderToStaticMarkup(<PlainText text={'<script>alert(1)</script> javascript:alert(1)\n<img src=x onerror=alert(1)>'} />);
  expect(html).not.toContain("<script>");
  expect(html).not.toContain("<img");
  expect(html).not.toContain('href="javascript:');
  expect(html).toContain("&lt;script&gt;");
});

it("http와 https 주소만 안전한 새 창 링크로 만든다", () => {
  const html = renderToStaticMarkup(<PlainText text="내용 https://example.com/path?q=1 다음" />);
  expect(html).toContain('href="https://example.com/path?q=1"');
  expect(html).toContain('rel="noopener noreferrer nofollow ugc"');
});
