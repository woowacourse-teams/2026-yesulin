// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProducerSidebarMenu } from "./producer-sidebar-menu";

const navigation = vi.hoisted(() => ({ pathname: "/producers" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  vi.unstubAllGlobals();
});

async function renderMenu(pathname: string) {
  navigation.pathname = pathname;
  await act(async () => root.render(<ProducerSidebarMenu />));
}

function link(href: string) {
  return container.querySelector(`a[href="${href}"]`);
}

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

it("사용하지 않는 접수 심사 메뉴와 빈 목록 안내를 표시하지 않는다", async () => {
  await renderMenu("/producers");
  expect(link("/producers/otr-auditions")).toBeNull();
  expect(container.querySelector('a[href^="/producers/otr-auditions"]')).toBeNull();
  expect(container.textContent).not.toMatch(/접수 심사|등록한 공고가 없어요|이메일 인증 후 접수/);
  expect(link("/producers/pdf-reviews")).not.toBeNull();
  expect(link("/producers/audition-posts")).not.toBeNull();
});
