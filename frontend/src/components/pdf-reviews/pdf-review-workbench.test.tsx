// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPdfExtraction, PdfExtractionApiError } from "@/features/pdf-extractions/api";
import { fetchPdfReview, updatePdfReviewEntry } from "@/features/pdf-reviews/api";
import { SidebarSlotProvider, SidebarSlotTarget } from "@/components/producers/sidebar-slot";
import { PdfReviewWorkbench } from "./pdf-review-workbench";

const fixtures = vi.hoisted(() => ({
  unauthorized: () => {},
  review: { id: "review", title: "합성 심사", createdAt: "2026-10-31", roles: [], entries: [{
    id: "entry", jobId: "job", originalFilename: "합성.pdf", applicantName: "합성가람", roleId: null,
    matchStatus: "MATCHED" as const, matchEvidence: "", memo: "", decision: "PASS" as const,
  }, ...[1, 2].map(index => ({ id: `pending-${index}`, jobId: `job-${index}`, originalFilename: `지원서-${index}.pdf`, applicantName: null,
    roleId: null, matchStatus: "MATCHED" as const, matchEvidence: "", memo: "", decision: "PENDING" as const,
  }))] },
}));
vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/producers/pdf-reviews", useRouter: () => ({}), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ session: { role: "PRODUCER" }, sessionReady: true }) }));
vi.mock("@/features/pdf-reviews/use-pdf-reviews", () => ({ usePdfReviews: () => ({ detail: fixtures.review,
  reviews: [{ ...fixtures.review, roleCount: 0, entryCount: fixtures.review.entries.length }], open: vi.fn(), sync: vi.fn(), refresh: vi.fn(), replaceEntry: vi.fn(),
}) }));
vi.mock("@/features/pdf-reviews/use-review-uploads", () => ({ useReviewUploads: () => ({ rows: [], notices: [], busy: false }) }));
vi.mock("@/features/pdf-reviews/use-review-progress", () => ({ useReviewProgress: ({ onUnauthorized }: { onUnauthorized: () => void }) => {
  fixtures.unauthorized = onUnauthorized;
  return { progress: { total: 1, uploading: 0, waiting: 0, completed: 1, partial: 0, failed: 0, complete: true }, error: "", recheck: vi.fn() };
} }));
vi.mock("@/features/pdf-extractions/api", async original => ({ ...await original<typeof import("@/features/pdf-extractions/api")>(), fetchPdfExtraction: vi.fn() }));
vi.mock("@/features/pdf-reviews/api", async original => ({ ...await original<typeof import("@/features/pdf-reviews/api")>(), fetchPdfReview: vi.fn(), updatePdfReviewEntry: vi.fn() }));

let root: Root;
let container: HTMLDivElement;
async function click(text: string) {
  const button = [...document.querySelectorAll("button")].find(item => item.textContent?.includes(text));
  expect(button, text).toBeDefined();
  await act(async () => button!.click());
}
function breadcrumb() { return container.querySelector('nav[aria-label="심사함 경로"]')!; }
function pager() { return container.querySelector('nav[aria-label="지원서 이동"]'); }
async function activate(button: HTMLButtonElement | null) {
  expect(button).not.toBeNull();
  await act(async () => button!.click());
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => setTimeout(callback, 0));
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  vi.clearAllMocks();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  vi.mocked(fetchPdfReview).mockResolvedValue(fixtures.review);
  vi.mocked(fetchPdfExtraction).mockResolvedValue({ jobId: "job", originalFilename: "합성.pdf", size: 1, createdAt: "2026-10-31", uploadedAt: null,
    status: "COMPLETED", sourceFileKey: "", resultFileKey: "", sourceUrl: null,
    result: { status: "COMPLETED", sourceSha256: "", errorCode: "", warnings: [], pages: [{ number: 1, text: "010-0000-0001\n이메일: actor@example.test", needsOcr: false, images: [] }] },
  });
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

describe("합격자 연락처 세션 경계", () => {
  it.each(["원문 조회", "상위 진행률 조회"])("%s에서 401을 받으면 이미 표시된 연락처와 원문 모달도 제거한다", async source => {
    await act(async () => root.render(<PdfReviewWorkbench />));
    await click("합성 심사"); await click("합격"); await click("합격자 연락처");
    expect(container.textContent).toContain("합성가람"); expect(container.textContent).toContain("010-0000-0001");
    expect(container.textContent).toContain("actor@example.test");
    expect(container.textContent).toContain("이메일 확인 1명");
    if (source === "원문 조회") {
      vi.mocked(fetchPdfExtraction).mockRejectedValueOnce(new PdfExtractionApiError(401, "로그인 필요"));
      await click("PDF 보기");
    } else await act(async () => fixtures.unauthorized());
    expect(container.textContent).toContain("로그인이 만료되어 연락처를 숨겼습니다");
    expect(container.textContent).not.toContain("합성가람"); expect(container.textContent).not.toContain("010-0000-0001");
    expect(container.textContent).not.toContain("actor@example.test");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it("원본 심사 화면은 업로드가 끝나면 추출·AI 진행 알림을 기다리지 않는다", async () => {
    await act(async () => root.render(<PdfReviewWorkbench />));
    await click("합성 심사");
    expect(container.querySelector('[data-pdf-processing-toast]')).toBeNull();
    await click("합격"); await click("합격자 연락처"); await click("심사로 돌아가기");
    expect(container.querySelector('[data-pdf-processing-toast]')).toBeNull();
  });

});

describe("지원자 카드 목록과 원본 상세", () => {
  it("목록부터 표시하고 상세에서만 원본과 툴바 이동을 열며 파일명 경로를 갱신한다", async () => {
    await act(async () => root.render(<PdfReviewWorkbench />));
    await click("합성 심사");
    expect([...container.querySelectorAll("article h2")].map(element => element.textContent)).toEqual(["지원서-1.pdf", "지원서-2.pdf"]);
    expect(container.querySelector('[aria-label="보기 방식"]')).toBeNull();
    expect(pager()).toBeNull();
    expect(fetchPdfExtraction).not.toHaveBeenCalled();
    await activate(container.querySelector('button[aria-label^="지원서 열기:"]'));
    expect(breadcrumb().querySelector("h1")?.textContent).toBe("지원서-1.pdf");
    expect(pager()?.closest('section[aria-label$="심사"]')).toBeNull();
    expect(pager()?.parentElement?.parentElement?.querySelector('[aria-label="지원서 PDF 추가"]')).not.toBeNull();
    expect(pager()?.querySelector<HTMLButtonElement>('[aria-label="이전 지원서"]')?.disabled).toBe(true);
    await activate(pager()!.querySelector('[aria-label="다음 지원서"]'));
    expect(breadcrumb().querySelector("h1")?.textContent).toBe("지원서-2.pdf");
    expect(pager()?.querySelector<HTMLButtonElement>('[aria-label="다음 지원서"]')?.disabled).toBe(true);
    await activate(pager()!.querySelector('[aria-label="이전 지원서"]'));
    expect(breadcrumb().querySelector("h1")?.textContent).toBe("지원서-1.pdf");
    await activate(breadcrumb().querySelector('button[title="합성 심사"]'));
    expect(breadcrumb().querySelector("h1")?.textContent).toBe("합성 심사");
    expect(document.activeElement).toBe(breadcrumb().querySelector("h1"));
    expect(container.querySelectorAll("article")).toHaveLength(2);
    expect(pager()).toBeNull();
  });

  it("경로에서 목록으로 돌아갈 때 메모 저장 실패는 상세와 입력을 보호한다", async () => {
    vi.mocked(updatePdfReviewEntry).mockRejectedValueOnce(new Error("Network"))
      .mockResolvedValueOnce({ ...fixtures.review.entries[1], memo: "검토 메모" });
    await act(async () => root.render(<PdfReviewWorkbench />));
    await click("합성 심사"); await activate(container.querySelector('button[aria-label^="지원서 열기:"]'));
    const field = container.querySelector("textarea")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(field, "검토 메모");
      field.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await activate(breadcrumb().querySelector('button[title="합성 심사"]'));
    expect(breadcrumb().querySelector("h1")?.textContent).toBe("지원서-1.pdf");
    expect(field.value).toBe("검토 메모");
    await activate(breadcrumb().querySelector('button[title="합성 심사"]'));
    expect(updatePdfReviewEntry).toHaveBeenLastCalledWith("review", "pending-1", { decision: "PENDING", memo: "검토 메모" }, "memo");
    expect(container.querySelectorAll("article")).toHaveLength(2);
  });

  it("판정 요청 중 목록으로 돌아가거나 탭을 바꿔도 늦은 응답이 다른 화면을 열지 않는다", async () => {
    const request = Promise.withResolvers<Awaited<ReturnType<typeof updatePdfReviewEntry>>>();
    vi.mocked(updatePdfReviewEntry).mockReturnValueOnce(request.promise);
    await act(async () => root.render(<PdfReviewWorkbench />));
    await click("합성 심사"); await activate(container.querySelector('button[aria-label^="지원서 열기:"]'));
    await activate(container.querySelector('button[aria-label="합격 (D)"]'));
    await activate(breadcrumb().querySelector('button[title="합성 심사"]'));
    await click("합격1");
    expect(breadcrumb().querySelector("h1")?.textContent).toBe("지원서-1.pdf");
    await act(async () => request.resolve({ ...fixtures.review.entries[1], decision: "PASS" }));
    expect(breadcrumb().querySelector("h1")?.textContent).toBe("지원서-2.pdf");
  });

  it("배역 필터는 열려 있는 관리 메뉴에만 생기며 사이드바를 접어도 본문은 유지된다", async () => {
    const previous = window.location.href; window.history.replaceState({}, "", "/producers/pdf-reviews");
    try {
      const renderWithMenus = (desktop: boolean, mobile: boolean) => <SidebarSlotProvider>
        <aside><a href="/producers/pdf-reviews">PDF 지원서 심사</a>{desktop && <SidebarSlotTarget surface="desktop" />}</aside>
        <aside>{mobile && <SidebarSlotTarget surface="mobile" />}</aside>
        <PdfReviewWorkbench />
      </SidebarSlotProvider>;
      await act(async () => root.render(renderWithMenus(true, false)));
      await click("합성 심사");
      const slot = container.querySelector('[data-sidebar-slot="desktop"]')!;
      expect(slot.textContent).toContain("합성 심사");
      expect(slot.querySelector('nav[aria-label="배역별 지원자"] button[aria-pressed="true"]')?.textContent).toBe("자유 배역3");
      await activate(container.querySelector('button[aria-label^="지원서 열기:"]'));
      const path = breadcrumb();
      await act(async () => root.render(renderWithMenus(true, true)));
      expect(container.querySelector('[data-sidebar-slot="mobile"] nav[aria-label="배역별 지원자"]')).not.toBeNull();
      await act(async () => root.render(renderWithMenus(false, false)));
      expect(container.querySelector('nav[aria-label="배역별 지원자"]')).toBeNull();
      expect(breadcrumb()).toBe(path);
      expect(path.querySelector("h1")?.textContent).toBe("지원서-1.pdf");
      expect(pager()).not.toBeNull();
      await act(async () => container.querySelector("aside a")!.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })));
      expect(container.textContent).toContain("내 심사함");
    } finally { window.history.replaceState({}, "", previous); }
  });

  it("공연사 관리 메뉴가 없는 로컬 확인 화면에서도 배역 필터를 제공한다", async () => {
    await act(async () => root.render(<PdfReviewWorkbench local />));
    await click("합성 심사");
    expect(container.querySelector('aside nav[aria-label="배역별 지원자"] button[aria-pressed="true"]')?.textContent).toBe("자유 배역3");
    expect(container.querySelectorAll("article")).toHaveLength(2);
  });
});
