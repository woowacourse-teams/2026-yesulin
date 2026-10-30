// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { changeEventPaymentStatus, fetchEventRegistrations } from "@/features/admin/api";
import type { AdminEventRegistration } from "@/features/admin/types";
import { AdminEventRegistrations } from "./admin-event-registrations";

vi.mock("@/features/admin/api", () => ({
  AdminApiError: class extends Error { status = 500; },
  changeEventPaymentStatus: vi.fn(), fetchEventRegistrations: vi.fn(),
  deleteEventRegistration: vi.fn(), downloadBusinessCardArchive: vi.fn(),
}));
let root: Root;
let container: HTMLDivElement;
const pending: AdminEventRegistration = {
  id: 1, participantType: "ACTOR", name: "일반 참가자", phone: "010-1234-5678",
  businessCardRequested: false,
  businessCard: null, email: null, snsHandle: null, snsPlatform: null, birthDate: null,
  affiliation: null, currentWork: null, photoUrl: null, activityFields: [], otherActivity: null, noCareer: false,
  careers: [], intro: null, createdAt: "2026-10-28T06:00:00Z", paymentStatus: "PENDING", paymentConfirmedAt: null,
};
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.clearAllMocks();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  vi.mocked(fetchEventRegistrations).mockResolvedValue([pending]);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function open() { await act(async () => root.render(<AdminEventRegistrations eventId={2} onUnauthorized={() => {}} />)); }
async function select(value: string) {
  await act(async () => {
    const field = container.querySelector<HTMLSelectElement>('[id^="event-payment-"]')!; field.value = value;
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
it("입금 확인을 저장하고 다시 읽어도 확인 상태와 시각을 유지한다", async () => {
  const confirmed = { ...pending, paymentStatus: "CONFIRMED" as const, paymentConfirmedAt: "2026-10-28T07:00:00Z" };
  vi.mocked(changeEventPaymentStatus).mockResolvedValue(confirmed);
  await open(); await select("CONFIRMED");
  expect(changeEventPaymentStatus).toHaveBeenCalledWith(2, 1, "CONFIRMED");
  expect(container.querySelector<HTMLSelectElement>('[id^="event-payment-"]')?.value).toBe("CONFIRMED");
  expect(container.textContent).toContain("입금 확인 1명");
  vi.mocked(fetchEventRegistrations).mockResolvedValue([confirmed]);
  await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "새로고침")!.click());
  expect(container.querySelector<HTMLSelectElement>('[id^="event-payment-"]')?.value).toBe("CONFIRMED");
});
it("저장에 실패하면 기존 입금 상태와 참가자 정보를 유지한다", async () => {
  vi.mocked(changeEventPaymentStatus).mockRejectedValue(new Error("저장 실패"));
  await open(); await select("CONFIRMED");
  expect(container.querySelector<HTMLSelectElement>('[id^="event-payment-"]')?.value).toBe("PENDING");
  expect(container.querySelector('[role="alert"]')?.textContent).toBe("저장 실패");
  expect(container.textContent).toContain("일반 참가자");
});

async function filter(id: string, value: string) {
  await act(async () => {
    const field = container.querySelector<HTMLSelectElement>(`#${id}`)!;
    field.value = value; field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
async function clickButton(label: string) {
  await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === label)!.click());
}
it("참가 유형과 입금 필터를 함께 적용하고 초기화한다", async () => {
  vi.mocked(fetchEventRegistrations).mockResolvedValue([
    pending,
    { ...pending, id: 2, name: "입금한 일반인", paymentStatus: "CONFIRMED" },
    { ...pending, id: 3, name: "관계자", participantType: "PRODUCER", paymentStatus: "CONFIRMED", paymentConfirmedAt: "2026-10-28T07:00:00Z" },
  ]);
  await open(); await filter("event-participant-type", "ACTOR");
  await filter("event-participant-payment", "PENDING");
  expect(container.querySelectorAll("ol > li")).toHaveLength(1);
  expect(container.querySelector("ol")?.textContent).toContain("일반 참가자");
  await filter("event-participant-type", "PRODUCER");
  expect(container.textContent).toContain("조건에 맞는 참가자가 없습니다.");
  await clickButton("검색 초기화");
  expect(container.querySelectorAll("ol > li")).toHaveLength(3);
});
it("페이지당 20명을 보이고 전화번호 검색 시 첫 페이지로 돌아온다", async () => {
  vi.mocked(fetchEventRegistrations).mockResolvedValue(Array.from({ length: 41 }, (_, i) => ({ ...pending, id: i + 1, name: `참가자 ${i + 1}`, phone: `010-0000-${String(i + 1).padStart(4, "0")}` })));
  await open();
  expect(container.querySelectorAll("ol > li")).toHaveLength(20);
  await clickButton("다음"); await clickButton("다음");
  expect(container.querySelectorAll("ol > li")).toHaveLength(1);
  expect(container.querySelector("ol")?.textContent).toContain("참가자 41");
  await act(async () => {
    const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "01000000001");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(container.querySelectorAll("ol > li")).toHaveLength(1);
  expect(container.querySelector("ol")?.textContent).toContain("참가자 1");
  expect(container.querySelector('[aria-label="참가자 페이지"]')?.textContent).toContain("1 / 1 페이지");
});
it("입금 미확인 필터의 마지막 페이지에서 확인 처리하면 유효한 이전 페이지를 보여 준다", async () => {
  const rows = Array.from({ length: 21 }, (_, i) => ({ ...pending, id: i + 1, name: `참가자 ${i + 1}` }));
  vi.mocked(fetchEventRegistrations).mockResolvedValue(rows);
  vi.mocked(changeEventPaymentStatus).mockResolvedValue({ ...rows[20], paymentStatus: "CONFIRMED", paymentConfirmedAt: "2026-10-28T07:00:00Z" });
  await open(); await filter("event-participant-payment", "PENDING"); await clickButton("다음");
  await select("CONFIRMED");
  expect(changeEventPaymentStatus).toHaveBeenCalledWith(2, 21, "CONFIRMED");
  expect(container.querySelectorAll("ol > li")).toHaveLength(20);
  expect(container.querySelector('[aria-label="참가자 페이지"]')?.textContent).toContain("1 / 1 페이지");
  expect(container.textContent).toContain("입금 확인 1명");
});
