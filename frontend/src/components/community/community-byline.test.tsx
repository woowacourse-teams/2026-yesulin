import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { CommunityByline } from "./community-ui";

const time = "2026-11-05T10:30:00+09:00";

function renderByline(authorPath: string | null) {
  return renderToStaticMarkup(
    <CommunityByline author="배우" authorPath={authorPath} createdAt={time} updatedAt={time} showProfileBadge />,
  );
}

it("목록에서 열 수 있는 배우 프로필에만 표식을 붙인다", () => {
  expect(renderByline("/actors/@actor")).toContain("community-profile-badge");
  expect(renderByline(null)).not.toContain("community-profile-badge");
});
