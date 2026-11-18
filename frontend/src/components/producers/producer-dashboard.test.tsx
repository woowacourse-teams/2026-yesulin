// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchMyAuditionPosts } from "@/features/audition-posts/producer-api";
import { listPdfReviews } from "@/features/pdf-reviews/api";
import { getProducerShows } from "@/features/shows/producer-api";
import type { ProducerShowSummary } from "@/features/shows/types";
import { ProducerDashboard } from "./producer-dashboard";

vi.mock("@/components/otr-auditions/otr-audition-context", () => ({
  useOtrAuditions: () => ({ auditions: [], loading: false, error: null, reload: vi.fn() }),
}));
vi.mock("@/features/audition-posts/producer-api", () => ({ fetchMyAuditionPosts: vi.fn() }));
vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock("@/features/pdf-reviews/api", () => ({ listPdfReviews: vi.fn() }));
vi.mock("@/features/shows/producer-api", () => ({ getProducerShows: vi.fn() }));

const firstStart = "2026-11-17T06:01:00Z";
const secondStart = "2026-11-17T08:00:00Z";

function show(nextSessionStartsAt: string): ProducerShowSummary {
  return {
    id: "show-1", title: "공연", genre: "PLAY", posterUrl: "", status: "OPEN", hidden: false,
    sessionCount: 2, reservedTickets: 0, nextSessionStartsAt, createdAt: "2026-11-01T00:00:00Z",
  };
}

let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-17T06:00:00Z"));
  vi.mocked(fetchMyAuditionPosts).mockResolvedValue([]);
  vi.mocked(listPdfReviews).mockResolvedValue([]);
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("공연 응답을 기다리는 사이 시작한 회차를 감지해 다음 회차를 조회한다", async () => {
  const firstRequest = Promise.withResolvers<ProducerShowSummary[]>();
  vi.mocked(getProducerShows).mockReturnValueOnce(firstRequest.promise).mockResolvedValue([show(secondStart)]);
  await act(async () => root.render(<ProducerDashboard />));

  vi.setSystemTime(new Date("2026-11-17T06:02:00Z"));
  act(() => window.dispatchEvent(new Event("focus")));
  expect(getProducerShows).toHaveBeenCalledOnce();

  await act(async () => firstRequest.resolve([show(firstStart)]));

  expect(getProducerShows).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[aria-labelledby="dashboard-schedule"]')?.textContent).toContain("공연 회차 17:00");
});

it("포커스 이동 없이 늦은 응답이 같은 회차를 다시 반환해도 지난 회차를 표시하지 않는다", async () => {
  const firstRequest = Promise.withResolvers<ProducerShowSummary[]>();
  vi.mocked(getProducerShows).mockReturnValueOnce(firstRequest.promise).mockImplementation(async () => [show(firstStart)]);
  await act(async () => root.render(<ProducerDashboard />));

  vi.setSystemTime(new Date("2026-11-17T06:02:00Z"));
  await act(async () => firstRequest.resolve([show(firstStart)]));

  expect(getProducerShows).toHaveBeenCalledTimes(2);
  expect(container.querySelector('[aria-labelledby="dashboard-schedule"]')?.textContent).toContain("다가오는 일정이 없어요");
});
