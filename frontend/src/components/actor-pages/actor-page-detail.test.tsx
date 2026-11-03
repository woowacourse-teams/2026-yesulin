// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ActorPageContent } from "@/features/actor-pages/types";
import { ActorPageView } from "./actor-page-detail";
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("./actor-bookmarks", () => ({ ActorBookmarkButton: () => null }));
vi.mock("./actor-screen-view", () => ({ ActorScreenView: () => null }));
vi.mock("./actor-photo-gallery", () => ({ ActorPhotoGallery: () => <p>프로필 사진</p> }));
const page: ActorPageContent = {
  publicId: null, handle: "actor", name: "체험 배우", gender: "FEMALE", birthYear: 2000, age: 26, height: 165, weight: null,
  representativePhotoUrl: null, photos: [], videos: [], careerGroups: [], coverLetter: "긴 자기소개\n두 번째 줄\n세 번째 줄\n네 번째 줄", specialty: null, hobbies: null, nationality: null, education: null, links: [],
};
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(112);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(84);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it("긴 소개를 펼치고 다시 접을 수 있으며 문의는 기본정보 안에서 제공한다", async () => {
  await act(async () => root.render(<ActorPageView actorPage={page} />));
  const expand = [...container.querySelectorAll("button")].find((button) => button.textContent === "소개 더 보기")!;
  expect(expand.getAttribute("aria-expanded")).toBe("false");
  await act(async () => expand.click());
  expect(expand.textContent).toBe("소개 접기");
  expect(document.getElementById(expand.getAttribute("aria-controls")!)!.classList.contains("line-clamp-3")).toBe(false);
  await act(async () => expand.click());
  expect(expand.getAttribute("aria-expanded")).toBe("false");
  expect(container.querySelector('header a[href="https://pf.kakao.com/_pbTBX/chat"]')).not.toBeNull();
  expect(container.querySelector("aside")).toBeNull();
  expect(container.querySelector("dl")!.textContent).toContain("키165cm");
  expect(container.querySelector("dl")!.textContent).not.toContain("몸무게");
});
