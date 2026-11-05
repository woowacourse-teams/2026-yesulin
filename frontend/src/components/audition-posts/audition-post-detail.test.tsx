// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditionPost } from "@/features/audition-posts/types";
import { AuditionPostRoute } from "./audition-post-detail";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@/features/audition-posts/api", () => ({
  getAuditionPost: vi.fn(),
  recordAuditionPostView: vi.fn(() => Promise.resolve(false)),
}));
vi.mock("@/features/analytics/product-analytics", () => ({ trackPostView: vi.fn(), trackAttachment: vi.fn() }));
vi.mock("@/components/landing/landing-header", () => ({ LandingHeader: () => null, LandingFooter: () => null }));
vi.mock("@/components/ui/image-lightbox", () => ({
  ImageLightbox: ({ imageUrls, index, onClose }: { imageUrls: readonly string[]; index: number; onClose: () => void }) => (
    <div role="dialog" data-image={imageUrls[index]} data-count={imageUrls.length}>
      <button type="button" onClick={onClose}>닫기</button>
    </div>
  ),
}));

let root: Root;
let container: HTMLDivElement;

const post = (bodyHtml: string): AuditionPost => ({
  id: 7, category: "연극", title: "합성 공고", authorName: "합성 극단", pay: "협의", deadlineText: "상시", deadline: null,
  closed: false, viewCount: 0, postedAt: null, alertChatMembers: 0, bodyHtml, tags: [], attachments: [],
  source: "OTR", sourceUrl: null, updatedAt: "2026-11-05T00:00:00Z", company: null,
});

async function render(bodyHtml: string) {
  await act(async () => root.render(<AuditionPostRoute postId="7" initialPost={post(bodyHtml)} />));
}

const dialog = () => container.querySelector<HTMLElement>('[role="dialog"]');
const openButton = () => [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("원문 크게 보기"));

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("공고 원문 크게 보기", () => {
  it("버튼은 첫 원문 사진부터 전체 화면 보기를 열고 사진 수를 알려 준다", async () => {
    await render('<p><img src="https://cdn.test/a.jpg"></p><img src="https://cdn.test/b.jpg">');
    expect(openButton()?.textContent).toContain("2장");
    await act(async () => openButton()?.click());
    expect(dialog()?.dataset.image).toBe("https://cdn.test/a.jpg");
    expect(dialog()?.dataset.count).toBe("2");
  });

  it("본문 사진을 누르면 그 사진부터 열고 닫으면 사라진다", async () => {
    await render('<img src="https://cdn.test/a.jpg"><img src="https://cdn.test/b.jpg">');
    await act(async () => container.querySelectorAll<HTMLImageElement>(".post-body img")[1].click());
    expect(dialog()?.dataset.image).toBe("https://cdn.test/b.jpg");
    await act(async () => dialog()?.querySelector("button")?.click());
    expect(dialog()).toBeNull();
  });

  it("링크로 감싼 사진은 뷰어를 열지 않고 원래 링크 동작을 남긴다", async () => {
    await render('<a href="https://forms.test/apply"><img src="https://cdn.test/a.jpg"></a>');
    const image = container.querySelector<HTMLImageElement>(".post-body img");
    image?.closest("a")?.addEventListener("click", (event) => event.preventDefault());
    await act(async () => image?.click());
    expect(dialog()).toBeNull();
  });

  it("사진이 없는 글 공고에는 버튼을 두지 않는다", async () => {
    await render("<p>모집 안내</p>");
    expect(openButton()).toBeUndefined();
  });
});
