// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchAuditionPostOwners, fetchProducers, linkAuditionPostAuthor } from "@/features/admin/api";
import type { AdminProducer } from "@/features/admin/types";
import { AdminAuditionPostOwners } from "./admin-audition-post-owners";

vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock("@/features/admin/api", async (original) => ({
  ...await original<typeof import("@/features/admin/api")>(),
  fetchAuditionPostOwners: vi.fn(), fetchProducers: vi.fn(), linkAuditionPostAuthor: vi.fn(),
}));

const member: AdminProducer = {
  memberId: 10, companyName: "극단 예술", email: "producer@example.com", status: "ACTIVE",
  joinedAt: "2026-10-29T00:00:00Z", contactName: null, contactRole: null, phone: null,
  performanceCount: 0, auditionCount: 0,
};
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.mocked(fetchProducers).mockResolvedValue([member]);
  vi.mocked(fetchAuditionPostOwners).mockResolvedValue({
    owners: [], missingAuthorIdCount: 0,
    unlinkedAuthors: [{ source: "OTR", sourceAuthorId: "48", authorName: "OTR 닉네임", postCount: 2, latestCreatedAt: "2026-10-29T00:00:00Z" }],
  });
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

async function selectMember() {
  await act(async () => root.render(<AdminAuditionPostOwners />));
  const choose = Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "가입 회원 선택")!;
  await act(async () => choose.click());
  const select = container.querySelector<HTMLSelectElement>("select")!;
  expect(select.textContent).toContain("극단 예술 · producer@example.com · 회원 #10");
  await act(async () => { select.value = "10"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  return Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "이 회원에게 공고 연결")!;
}

it("OTR 회원 번호와 가입 회원 ID로 연결하고 갱신된 연결 결과를 보여 준다", async () => {
  const connect = await selectMember();
  vi.mocked(linkAuditionPostAuthor).mockResolvedValue({
    id: 1, source: "OTR", sourceAuthorId: "48", sourceAuthorName: "OTR 닉네임",
    ownerId: 10, ownerName: "극단 예술", connectedPostCount: 2,
  });
  vi.mocked(fetchAuditionPostOwners).mockResolvedValue({
    unlinkedAuthors: [], missingAuthorIdCount: 0,
    owners: [{ ownerId: 10, companyName: "극단 예술", pendingCount: 2, publishedCount: 0, hiddenCount: 0,
      latestCreatedAt: null, authorLinks: [{ id: 1, source: "OTR", sourceAuthorId: "48", sourceAuthorName: "OTR 닉네임" }] }],
  });
  await act(async () => connect.click());
  expect(linkAuditionPostAuthor).toHaveBeenCalledWith("OTR", "48", 10);
  expect(container.querySelector('[role="status"]')?.textContent).toContain("기존 공고 2건");
  expect(container.querySelector('[aria-labelledby="owner-list-title"]')?.textContent).toContain("producer@example.com");
  expect(container.querySelector('a[href="/admin/posts?owner=10"]')).not.toBeNull();
});

it("연결 실패 시 선택한 회원을 유지해 다시 시도할 수 있다", async () => {
  const connect = await selectMember();
  vi.mocked(linkAuditionPostAuthor).mockRejectedValue(new Error("연결을 저장하지 못했어요."));
  await act(async () => connect.click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("연결을 저장하지 못했어요.");
  expect(container.querySelector<HTMLSelectElement>("select")?.value).toBe("10");
  expect(connect.disabled).toBe(false);
});

it("이메일 인증 대기 회원을 선택하면 공고 확인 조건을 안내한다", async () => {
  vi.mocked(fetchProducers).mockResolvedValue([{ ...member, status: "PENDING" }]);
  await selectMember();
  expect(container.textContent).toContain("인증을 마치면 연결된 공고를 확인할 수 있어요.");
});
