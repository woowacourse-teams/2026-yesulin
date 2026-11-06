// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getActorPageSettings } from "@/features/actor-pages/owner-api";
import type { ActorPageSettings } from "@/features/actor-pages/settings";
import { getApplicantProfile, getApplicantSubmissions } from "@/features/applicants/api";
import type { ApplicantProfileResponse, ApplicantSubmissionSummary } from "@/features/applicants/types";
import { ApplicantDashboard } from "./applicant-dashboard";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock("@/config/environment", () => ({ frontendEnvironment: { apiMockingEnabled: false } }));
vi.mock("@/features/applicants/api", () => ({
  getApplicantProfile: vi.fn(),
  getApplicantSubmissions: vi.fn(),
  getRecommendedPostings: vi.fn(),
}));
vi.mock("@/features/actor-pages/owner-api", () => ({ getActorPageSettings: vi.fn() }));

let root: Root;
let container: HTMLDivElement;

const profile = (overrides: Partial<ApplicantProfileResponse> = {}): ApplicantProfileResponse => ({
  answers: [
    { key: "NAME", value: "합성배우" },
    { key: "BIRTH", value: "1999-03-02" },
    { key: "GENDER", value: "여" },
    { key: "HEIGHT", value: 165 },
  ],
  photoLibrary: [{ id: "p1", name: "a.jpg", url: "https://files.test/a.jpg", representative: true }],
  videoLibrary: [],
  completeness: { filled: 8, standardTotal: 8 },
  ...overrides,
} as ApplicantProfileResponse);

const settings = (overrides: Partial<ActorPageSettings> = {}) => ({
  publicId: null, handle: null, handleEditable: true, status: "PRIVATE", autoHiddenReason: null, locked: false,
  lockReason: null, unlockedAt: null, firstPublishedAt: null, publishedAt: null, ...overrides,
}) as ActorPageSettings;

const submission: ApplicantSubmissionSummary = {
  id: "s1" as ApplicantSubmissionSummary["id"], postingId: "posting", performanceTitle: "합성 공연", postingTitle: "배우 모집",
  posterUrl: "https://files.test/poster.jpg", companyName: "합성 극단", submittedAt: "2026-11-03T10:00:00Z",
  selectedRoles: [{ roleId: "r1", roleName: "여자주인공" }],
};

async function render(page: ActorPageSettings | null, data: Partial<ApplicantProfileResponse> = {}, submissions: readonly ApplicantSubmissionSummary[] = []) {
  vi.mocked(getApplicantProfile).mockResolvedValue(profile(data));
  vi.mocked(getApplicantSubmissions).mockResolvedValue({ submissions } as Awaited<ReturnType<typeof getApplicantSubmissions>>);
  vi.mocked(getActorPageSettings).mockImplementation(() => page ? Promise.resolve(page) : Promise.reject(new Error("설정 실패")));
  await act(async () => root.render(<ApplicantDashboard />));
}

const link = (text: string) => [...container.querySelectorAll("a")].find((anchor) => anchor.textContent?.includes(text));
const button = (text: string) => [...container.querySelectorAll("button")].find((element) => element.textContent?.includes(text));

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.spyOn(console, "error").mockImplementation(() => {});
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("마이페이지 무대형 상단", () => {
  it("비공개면 공개 흐름이 있는 설정 탭으로 보내고 이름과 기본정보 요약을 보여 준다", async () => {
    await render(settings());
    expect(container.querySelector("h2")?.textContent).toBe("합성배우");
    expect(container.textContent).toContain("1999년생 · 여 · 165cm");
    expect(container.textContent).toContain("비공개");
    expect(link("배우 페이지 공개하기")?.getAttribute("href")).toBe("/applicants/profile?tab=actor-page");
  });

  it("공개 중이면 새 창으로 내 배우 페이지를 연다", async () => {
    await render(settings({ status: "PUBLIC", handle: "harin" }));
    const view = link("내 배우 페이지 보기");
    expect(view?.getAttribute("href")).toContain("harin");
    expect(view?.getAttribute("target")).toBe("_blank");
    expect(container.textContent).toContain("공개 중");
  });

  it("잠긴 페이지는 공개 상태여도 잠김을 먼저 알리고 설정으로 보낸다", async () => {
    await render(settings({ status: "PUBLIC", handle: "harin", locked: true }));
    expect(container.textContent).toContain("운영자가 잠갔어요");
    expect(link("내 배우 페이지 보기")).toBeUndefined();
    expect(link("배우 페이지 설정")).toBeDefined();
  });

  it("자동 비공개면 이유를 볼 수 있는 설정으로 보낸다", async () => {
    await render(settings({ autoHiddenReason: "MISSING_REQUIRED" }));
    expect(container.textContent).toContain("자동으로 비공개됐어요");
    expect(link("배우 페이지 설정")?.getAttribute("href")).toBe("/applicants/profile?tab=actor-page");
  });

  it("공개 중인데 아이디가 없으면 새 창 대신 설정으로 보낸다", async () => {
    await render(settings({ status: "PUBLIC", handle: null }));
    expect(link("내 배우 페이지 보기")).toBeUndefined();
    expect(link("배우 페이지 설정")).toBeDefined();
  });

  it("상단 사진은 배우 페이지 대표인 첫 공개 사진을 쓴다", async () => {
    await render(settings(), { photoLibrary: [
      { id: "private", name: "a.jpg", url: "https://files.test/private.jpg", representative: true, visibility: "PRIVATE" },
      { id: "public", name: "b.jpg", url: "https://files.test/public.jpg", representative: false, visibility: "PUBLIC" },
    ] });
    expect(container.querySelector<HTMLImageElement>('img[alt="내 프로필 사진"]')?.getAttribute("src")).toBe("https://files.test/public.jpg");
  });

  it("프로필을 읽지 못하면 화면 전체를 다시 시도한다", async () => {
    vi.mocked(getApplicantProfile).mockRejectedValueOnce(new Error("실패"));
    vi.mocked(getApplicantSubmissions).mockResolvedValue({ submissions: [] } as Awaited<ReturnType<typeof getApplicantSubmissions>>);
    vi.mocked(getActorPageSettings).mockResolvedValue(settings());
    await act(async () => root.render(<ApplicantDashboard />));
    expect(container.querySelector("h2")).toBeNull();
    vi.mocked(getApplicantProfile).mockResolvedValue(profile());
    await act(async () => [...container.querySelectorAll("button")].at(-1)?.click());
    expect(container.querySelector("h2")?.textContent).toBe("합성배우");
  });

  it("설정을 읽지 못하면 공개 영역 없이 프로필 수정만 남긴다", async () => {
    await render(null);
    expect(container.textContent).not.toContain("비공개");
    expect(link("프로필 수정")).toBeDefined();
  });

  it("기본정보를 다 채우면 안내를 숨기고, 덜 채웠으면 남은 수를 알린다", async () => {
    await render(settings());
    expect(container.textContent).not.toContain("기본정보 ");
    act(() => root.unmount());
    root = createRoot(container);
    await render(settings(), { completeness: { filled: 5, standardTotal: 8 } });
    expect(container.textContent).toContain("5/8");
  });
});

describe("마이페이지 보관함과 지원서", () => {
  it("영상이 없으면 영상 추가를 권하고 지원서로 바꾸면 최근 지원서를 보여 준다", async () => {
    await render(settings(), {}, [submission]);
    expect(container.textContent).toContain("연기 영상 추가");
    expect(button("지원서")?.textContent).toContain("1");
    await act(async () => button("지원서")?.click());
    expect(link("합성 공연")?.getAttribute("href")).toBe("/applicants/submissions/s1");
    expect(container.textContent).toContain("여자주인공");
  });

  it("지원서를 읽지 못하면 다시 확인하도록 안내한다", async () => {
    vi.mocked(getApplicantSubmissions).mockRejectedValueOnce(new Error("실패"));
    vi.mocked(getApplicantProfile).mockResolvedValue(profile());
    vi.mocked(getActorPageSettings).mockResolvedValue(settings());
    await act(async () => root.render(<ApplicantDashboard />));
    await act(async () => button("지원서")?.click());
    expect(container.textContent).toContain("지원서를 불러오지 못했어요");
  });
});
