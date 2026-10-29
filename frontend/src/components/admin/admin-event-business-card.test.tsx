// @vitest-environment jsdom
import { act, useState, type ButtonHTMLAttributes } from "react";
import qrCode from "qrcode";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { connectEventBusinessCard, connectEventBusinessCardMember, disconnectEventBusinessCardMember } from "@/features/admin/api";
import type { AdminEventBusinessCard, AdminEventRegistration } from "@/features/admin/types";
import { AdminEventBusinessCardPanel } from "./admin-event-business-card";

vi.mock("@/features/admin/api", () => ({ AdminApiError: class extends Error {}, connectEventBusinessCard: vi.fn(),
  connectEventBusinessCardMember: vi.fn(), disconnectEventBusinessCardMember: vi.fn() }));
vi.mock("qrcode", () => ({ default: { toString: vi.fn().mockResolvedValue("<svg/>") } }));
vi.mock("./admin-shell", () => ({ AdminActionButton: ({ tone, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: string }) => <button type="button" data-tone={tone} {...props} /> }));
vi.mock("@/components/events/event-business-card-preview", () => ({ EventBusinessCardPreview: () => null }));
const initial: AdminEventBusinessCard = { publicId: "550e8400-e29b-41d4-a716-446655440000", url: "https://yesulin.art/events/cards/test", profileUrl: "https://example.test/profile", memberId: null };
const registration = { id: 7, name: "참가 배우" } as AdminEventRegistration;
let root: Root;
let container: HTMLDivElement;
function Host() {
  const [card, setCard] = useState(initial);
  return <AdminEventBusinessCardPanel eventId={2} registration={registration} card={card} onSaved={setCard} onUnauthorized={vi.fn()} />;
}
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<Host />));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
async function enterCode(code: string) {
  const field = container.querySelector<HTMLInputElement>('input[id$="-code"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(field, code);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function button(label: string) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find((item) => item.textContent === label)!;
}

it("connects using the applicant code and unlinks the account without changing the profile URL", async () => {
  vi.mocked(connectEventBusinessCardMember).mockResolvedValue({ ...initial, memberId: 42 });
  vi.mocked(disconnectEventBusinessCardMember).mockResolvedValue(initial);
  await enterCode("abcd-efgh");
  await act(async () => button("코드로 회원 연결").click());
  expect(connectEventBusinessCardMember).toHaveBeenCalledWith(2, 7, "ABCDEFGH");
  expect(connectEventBusinessCard).not.toHaveBeenCalled();
  expect(container.textContent).toContain("배우 회원 #42 연결됨");
  expect(container.querySelector<HTMLInputElement>('input[id$="-code"]')?.value).toBe("");
  expect(container.querySelector<HTMLInputElement>('input[id$="-profile"]')?.value).toBe(initial.profileUrl);
  await act(async () => button("회원 연결 해제").click());
  expect(disconnectEventBusinessCardMember).toHaveBeenCalledWith(2, 7);
  expect(container.querySelector<HTMLInputElement>('input[id$="-profile"]')?.value).toBe(initial.profileUrl);
});

it("keeps the card unchanged and displays the error when a code has already been used", async () => {
  vi.mocked(connectEventBusinessCardMember).mockRejectedValue(new Error("코드가 만료·사용되었습니다."));
  await enterCode("ABCD-EFGH");
  await act(async () => button("코드로 회원 연결").click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("만료·사용");
  expect(container.textContent).toContain("아직 회원이 연결되지 않았어요");
});

it("encodes the fixed card URL rather than its editable profile destination", () => {
  expect(qrCode.toString).toHaveBeenCalledWith(initial.url,
    expect.objectContaining({ type: "svg", errorCorrectionLevel: "M" }));
});
