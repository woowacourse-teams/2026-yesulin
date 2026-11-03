// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { PublishedActorPage } from "@/features/actor-pages/owner-api";
import { ActorPagePublished } from "./actor-page-published";
import QRCode from "qrcode";

vi.mock("qrcode", () => ({ default: { toString: vi.fn() } }));
const result = {
  settings: { handle: "test.actor", status: "PUBLIC" },
  profile: { answers: [{ key: "NAME", value: "체험 배우" }], photoLibrary: [{ id: "1", visibility: "PUBLIC", publicCopyUrl: "/public.jpg" }, { id: "2", visibility: "PRIVATE", url: "/private.jpg" }] },
  failedPhotoIds: [],
} as unknown as PublishedActorPage;
let root: Root;
let container: HTMLDivElement;
const copy = vi.fn();
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: copy } });
  Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  vi.mocked(QRCode.toString).mockImplementation(() => Promise.resolve("<svg></svg>"));
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function render(value = result, onPhotos = vi.fn()) { await act(async () => root.render(<ActorPagePublished result={value} onEdit={vi.fn()} onPhotos={onPhotos} />)); }
function button(label: string) { return [...container.querySelectorAll("button")].find((item) => item.textContent === label)!; }

it("공개 주소·공유·QR이 같은 페이지를 가리키고 공개 사본만 대표로 보여 준다", async () => {
  await render();
  const url = new URL("/actors/@test.actor", window.location.origin).toString();
  expect(QRCode.toString).toHaveBeenCalledWith(url, expect.objectContaining({ margin: 4 }));
  expect(container.querySelector<HTMLAnchorElement>("a")!.href).toBe(url);
  expect(container.querySelector('img[alt="페이지 대표사진"]')!.getAttribute("src")).toBe("/public.jpg");
  await act(async () => button("페이지 공유").click());
  expect(copy).toHaveBeenCalledWith(url);
  expect(container.textContent).toContain("주소를 복사했어요");
  expect(document.activeElement?.id).toBe("profile-published-title");
});
it("공유 취소를 오류로 표시하지 않으며 복사 실패는 직접 복사를 안내한다", async () => {
  const share = vi.fn().mockRejectedValue(new DOMException("취소", "AbortError"));
  Object.defineProperty(navigator, "share", { configurable: true, value: share });
  await render();
  await act(async () => button("페이지 공유").click());
  expect(copy).not.toHaveBeenCalled();
  expect(container.textContent).not.toContain("공유하지 못했어요");
  copy.mockRejectedValueOnce(new Error("denied"));
  await act(async () => button("주소 복사").click());
  expect(container.textContent).toContain("주소를 길게 눌러 복사");
});
it("부분 사진 실패는 복구로 연결하고 QR 생성 실패는 공개 링크를 유지한 채 재시도한다", async () => {
  vi.mocked(QRCode.toString).mockRejectedValueOnce(new Error("qr"));
  const photos = vi.fn();
  await render({ ...result, failedPhotoIds: ["3"] }, photos);
  expect(container.textContent).toContain("사진 1장은 아직 페이지에 올라가지 않았어요");
  await act(async () => button("사진 다시 확인하기").click());
  expect(photos).toHaveBeenCalledOnce();
  expect(container.querySelector('a[href$="/actors/@test.actor"]')).not.toBeNull();
  expect(container.textContent).toContain("QR을 만들지 못했어요");
  await act(async () => button("QR 다시 만들기").click());
  expect(container.querySelector('img[alt="내 배우 페이지로 연결되는 QR 코드"]')).not.toBeNull();
});
