// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { changeEventRegistrationClosed, fetchAdminEvent, fetchAdminEvents, updateEvent } from "@/features/admin/api";
import type { AdminEvent } from "@/features/admin/types";
import { emptyEventDraft, writeOfEvent } from "@/features/events/draft";
import { AdminEventManagement } from "./admin-event-management";
import { AdminEvents } from "./admin-events";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/admin/api", () => ({
  AdminApiError: class extends Error { constructor(message: string, readonly status = 500) { super(message); } },
  fetchAdminEvent: vi.fn(), fetchAdminEvents: vi.fn(), createEvent: vi.fn(), updateEvent: vi.fn(),
  changeEventStatus: vi.fn(), changeEventRegistrationClosed: vi.fn(), deleteEvent: vi.fn(), uploadEventImage: vi.fn(),
}));
vi.mock("@/features/auth/session-api", () => ({ logout: vi.fn() }));
vi.mock("./admin-event-registrations", () => ({ AdminEventRegistrations: ({ eventId }: { eventId: number }) => <section aria-label="참가 신청자">행사 {eventId} 참가자</section> }));
vi.mock("./admin-shell", async () => {
  const { SecondaryButton, SecondaryLink } = await import("@/components/ui/controls");
  return {
    AdminShell: ({ children }: { children: ReactNode }) => <main>{children}</main>,
    AdminActionButton: SecondaryButton, AdminActionLink: SecondaryLink,
    AdminEmptyState: ({ title }: { title: string }) => <p>{title}</p>,
  };
});
const event: AdminEvent = {
  ...writeOfEvent({ ...emptyEventDraft(), title: "첫 번째 행사", body: "행사 개요", registrationEnabled: true, registrationCapacity: "3", registrationNotice: "보증금 안내" }),
  id: 6, status: "PUBLISHED", phase: "ONGOING", bannerVisible: false,
  registrationCount: 2, registrationClosed: false, registrationStatus: "OPEN",
  createdAt: "2026-10-28T06:00:00Z", updatedAt: "2026-10-28T06:00:00Z",
};
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  vi.mocked(fetchAdminEvents).mockResolvedValue([event]); vi.mocked(fetchAdminEvent).mockResolvedValue(event);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
it("목록은 관리 링크만 제공하고 참가자나 수정 폼을 펼치지 않는다", async () => {
  await act(async () => root.render(<AdminEvents />));
  expect(container.querySelector('a[href="/admin/events/6"]')).not.toBeNull();
  expect(container.textContent).toContain("관리하기");
  expect(container.querySelector('[aria-label="참가 신청자"]')).toBeNull();
  expect(container.querySelector("form")).toBeNull();
});
it("행사 번호로 직접 조회하고 참가자 관리와 설정 주소를 제공한다", async () => {
  await act(async () => root.render(<AdminEventManagement eventId={6} tab="participants" />));
  expect(fetchAdminEvent).toHaveBeenCalledWith(6);
  expect(fetchAdminEvents).not.toHaveBeenCalled();
  expect(container.textContent).toContain("행사 6 참가자");
  expect(container.querySelector('a[href="/admin/events/6?tab=settings"]')).not.toBeNull();
  vi.mocked(changeEventRegistrationClosed).mockResolvedValue({ ...event, registrationClosed: true, registrationStatus: "CLOSED" });
  await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "모집 마감")!.click());
  expect(changeEventRegistrationClosed).toHaveBeenCalledWith(6, true);
  expect(container.textContent).toContain("모집 다시 열기");
  expect(container.textContent).toContain("2명 접수");
});
it("설정 탭의 정원 변경을 같은 행사에 저장하며 안내를 유지한다", async () => {
  await act(async () => root.render(<AdminEventManagement eventId={6} tab="settings" />));
  expect(container.querySelector('[aria-label="참가 신청자"]')).toBeNull();
  const field = container.querySelector<HTMLInputElement>("#event-registration-capacity")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, "5");
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  vi.mocked(updateEvent).mockResolvedValue({ ...event, registrationCapacity: 5 });
  await act(async () => container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(updateEvent).toHaveBeenCalledWith(6, expect.objectContaining({ registrationCapacity: 5, registrationNotice: "보증금 안내" }));
  expect(container.textContent).toContain("이벤트 설정을 저장했습니다.");
});

it("다른 행사 주소를 여는 동안 이전 행사의 참가자와 작업 버튼을 노출하지 않는다", async () => {
  await act(async () => root.render(<AdminEventManagement eventId={6} tab="participants" />));
  vi.mocked(fetchAdminEvent).mockReturnValue(new Promise(() => {}));
  await act(async () => root.render(<AdminEventManagement eventId={7} tab="participants" />));
  expect(container.textContent).not.toContain("첫 번째 행사");
  expect(container.querySelector('[aria-label="참가 신청자"]')).toBeNull();
  expect(container.textContent).toContain("이벤트를 불러오는 중");
});
