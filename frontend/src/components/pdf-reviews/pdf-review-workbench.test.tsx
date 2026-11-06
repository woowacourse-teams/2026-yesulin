// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPdfExtraction, PdfExtractionApiError } from "@/features/pdf-extractions/api";
import { fetchPdfReview } from "@/features/pdf-reviews/api";
import { PdfReviewWorkbench } from "./pdf-review-workbench";

const fixtures = vi.hoisted(() => ({
  unauthorized: () => {},
  review: { id: "review", title: "합성 심사", createdAt: "2026-10-31", roles: [], entries: [{
    id: "entry", jobId: "job", originalFilename: "합성.pdf", applicantName: "합성가람", roleId: null,
    matchStatus: "MATCHED" as const, matchEvidence: "", memo: "", decision: "PASS" as const,
  }] },
}));
vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/producers/pdf-reviews", useRouter: () => ({}), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/auth/auth-session", () => ({ useAuthSession: () => ({ session: { role: "PRODUCER" }, sessionReady: true }) }));
vi.mock("@/features/pdf-reviews/use-pdf-reviews", () => ({ usePdfReviews: () => ({ detail: fixtures.review,
  reviews: [{ ...fixtures.review, roleCount: 0, entryCount: 1 }], open: vi.fn(), sync: vi.fn(), refresh: vi.fn(),
}) }));
vi.mock("@/features/pdf-reviews/use-review-uploads", () => ({ useReviewUploads: () => ({ rows: [], notices: [], busy: false }) }));
vi.mock("@/features/pdf-reviews/use-review-progress", () => ({ useReviewProgress: ({ onUnauthorized }: { onUnauthorized: () => void }) => {
  fixtures.unauthorized = onUnauthorized;
  return { progress: { total: 1, uploading: 0, waiting: 0, completed: 1, partial: 0, failed: 0, complete: true }, error: "", recheck: vi.fn() };
} }));
vi.mock("@/features/pdf-extractions/api", async original => ({ ...await original<typeof import("@/features/pdf-extractions/api")>(), fetchPdfExtraction: vi.fn() }));
vi.mock("@/features/pdf-reviews/api", async original => ({ ...await original<typeof import("@/features/pdf-reviews/api")>(), fetchPdfReview: vi.fn() }));

let root: Root;
let container: HTMLDivElement;
async function click(text: string) {
  const button = [...document.querySelectorAll("button")].find(item => item.textContent?.includes(text));
  expect(button, text).toBeDefined();
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
    await click("합성 심사"); await click("합격자 연락처");
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
  it("연락처 보기로 이동해도 처리알림 펼침·닫기 상태를 유지한다", async () => {
    await act(async () => root.render(<PdfReviewWorkbench />));
    await click("합성 심사"); await click("내역");
    const toast = container.querySelector('[data-pdf-processing-toast]');
    expect(toast?.getAttribute("data-expanded")).toBe("true");
    await click("합격자 연락처");
    expect(container.querySelector('[data-pdf-processing-toast]')).toBe(toast);
    expect(toast?.getAttribute("data-inline")).toBe("true");
    expect(toast?.getAttribute("data-expanded")).toBe("true");
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="PDF 처리 알림 닫기"]')!.click());
    await click("심사로 돌아가기");
    expect(container.querySelector('[data-pdf-processing-toast]')).toBeNull();
  });

});
