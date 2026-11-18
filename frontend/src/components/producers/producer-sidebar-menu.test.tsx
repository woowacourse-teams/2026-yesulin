// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OtrAuditionProvider } from "@/components/otr-auditions/otr-audition-context";
import { getOtrAuditions } from "@/features/otr-auditions/api";
import type { OtrAudition } from "@/features/otr-auditions/types";
import { ProducerSidebarMenu } from "./producer-sidebar-menu";

const navigation = vi.hoisted(() => ({ pathname: "/producers" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock("@/features/otr-auditions/api", () => ({ getOtrAuditions: vi.fn() }));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.mocked(getOtrAuditions).mockResolvedValue([]);
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  vi.unstubAllGlobals();
});

async function renderMenu(pathname: string, enabled = true) {
  navigation.pathname = pathname;
  await act(async () => root.render(
    <OtrAuditionProvider key={String(enabled)} enabled={enabled}><ProducerSidebarMenu /></OtrAuditionProvider>,
  ));
}

function link(href: string) {
  return container.querySelector(`a[href="${href}"]`);
}

it("인증 대기 때는 접수 공고를 조회하지 않고 인증 후 빈 목록을 구분한다", async () => {
  await renderMenu("/producers", false);
  expect(getOtrAuditions).not.toHaveBeenCalled();
  expect(container.textContent).toContain("이메일 인증 후 접수 공고를 볼 수 있어요.");
  expect(container.textContent).not.toContain("등록한 공고가 없어요.");

  await renderMenu("/producers");
  expect(getOtrAuditions).toHaveBeenCalledOnce();
  expect(container.textContent).toContain("등록한 공고가 없어요.");
  expect(container.textContent).not.toContain("이메일 인증 후 접수 공고를 볼 수 있어요.");
});

it("접수 목록의 긴 공고 제목과 번호를 줄바꿈 가능한 요소에 표시한다", async () => {
  const title = "띄어쓰기가 없는 접수공고제목이길어도끝까지표시되어야합니다";
  const audition: OtrAudition = {
    id: "audition-1", otrId: "12345", title, otrLink: "", applicationPath: "", roles: [],
    deadline: "2026-11-30", createdAt: "2026-11-17T06:00:00Z",
  };
  vi.mocked(getOtrAuditions).mockResolvedValue([audition]);
  await renderMenu("/producers");

  const titleElement = link("/producers/otr-auditions/audition-1")?.querySelector("span");
  expect(titleElement?.textContent).toBe(`[12345] ${title}`);
  expect(titleElement?.classList.contains("wrap-anywhere")).toBe(true);
});

it("정확히 일치하는 메뉴와 하위 경로를 스크린리더에 다르게 알린다", async () => {
  await renderMenu("/producers");
  expect(link("/producers")?.getAttribute("aria-current")).toBe("page");

  await renderMenu("/producers/audition-posts/1/edit");
  expect(link("/producers")?.getAttribute("aria-current")).toBeNull();
  expect(link("/producers")?.getAttribute("data-active")).toBe("false");
  expect(link("/producers/audition-posts")?.getAttribute("aria-current")).toBe("location");
  expect(link("/producers/audition-posts")?.getAttribute("data-active")).toBe("true");

  await renderMenu("/producers/audition-posts");
  expect(link("/producers/audition-posts")?.getAttribute("aria-current")).toBe("page");
});
