// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActorPhotoGallery } from "./actor-photo-gallery";

let root: Root;
let container: HTMLDivElement;
const photos = [{ url: "/portrait.jpg" }, { url: "/full-body.jpg" }, { url: "/stage.jpg" }];

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function render(representativePhotoUrl: string | null = "/portrait.jpg", items = photos) {
  await act(async () => root.render(<ActorPhotoGallery name="김예술" representativePhotoUrl={representativePhotoUrl} photos={items} />));
}

function photoButton(label = "김예술 대표 사진 확대") {
  return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
}

function viewer() { return document.querySelector<HTMLElement>('[role="dialog"]')!; }
function viewerImage() { return new URL(viewer().querySelector("img")!.src).pathname; }
function button(text: string) { return [...viewer().querySelectorAll("button")].find((item) => item.textContent === text)!; }
async function press(key: string) {
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })));
}

describe("배우 프로필 사진 갤러리", () => {
  it("중복 대표 사진을 제외하고 클릭한 사진부터 열어 이전·다음으로 넘긴다", async () => {
    await render();
    expect(container.querySelectorAll("li")).toHaveLength(3);
    await act(async () => photoButton("김예술 사진 2 확대").click());
    expect(viewerImage()).toBe("/full-body.jpg");
    expect(viewer().textContent).toContain("2 / 3");
    await act(async () => button("다음").click());
    expect(viewerImage()).toBe("/stage.jpg");
    expect(button("다음").disabled).toBe(true);
    await act(async () => button("이전").click());
    expect(viewerImage()).toBe("/full-body.jpg");
  });

  it("방향키로 넘기고 확대를 전환하며 Escape 뒤 초점과 배경 스크롤을 복원한다", async () => {
    await render();
    const trigger = photoButton();
    trigger.focus();
    await act(async () => trigger.click());
    expect(document.body.style.overflow).toBe("hidden");
    expect(button("이전").disabled).toBe(true);
    await press("ArrowRight");
    expect(viewerImage()).toBe("/full-body.jpg");
    await act(async () => button("2배 확대").click());
    expect(button("맞춤 보기").getAttribute("aria-pressed")).toBe("true");
    await press("ArrowLeft");
    expect(viewerImage()).toBe("/portrait.jpg");
    expect(button("2배 확대").getAttribute("aria-pressed")).toBe("false");
    await press("Escape");
    expect(viewer()).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
  });

  it("사진이 없으면 확대 버튼과 잘못된 이미지 요청을 만들지 않는다", async () => {
    await render(null, []);
    expect(container.textContent).toContain("이미지 준비 중");
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("대표 사진만 있어도 확대하고 한 장에서는 넘김 버튼을 생략한다", async () => {
    await render("/portrait.jpg", []);
    expect(container.querySelector("ul")).toBeNull();
    await act(async () => photoButton().click());
    expect(viewerImage()).toBe("/portrait.jpg");
    expect(viewer().textContent).toContain("1 / 1");
    expect(button("다음")).toBeUndefined();
    await act(async () => button("닫기").click());
    expect(viewer()).toBeNull();
  });

  it("미리보기에서 사진이 바뀌면 제거된 사진의 뷰어를 닫고 새 사진을 열 수 있다", async () => {
    await render();
    await act(async () => photoButton("김예술 사진 2 확대").click());
    await render("/new.jpg", [{ url: "/new.jpg" }]);
    expect(viewer()).toBeNull();
    await act(async () => photoButton().click());
    expect(viewerImage()).toBe("/new.jpg");
  });
});
