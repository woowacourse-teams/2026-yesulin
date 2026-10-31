// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewPassedContacts } from "./review-passed-contacts";
import { usePassedContacts, type PassedContact } from "@/features/pdf-reviews/use-passed-contacts";
vi.mock("@/features/pdf-reviews/use-passed-contacts", () => ({ usePassedContacts: vi.fn() }));
vi.mock("./review-original-document", () => ({ ReviewOriginalDocument: () => null }));
vi.mock("./review-timetable-panel", () => ({ ReviewTimetablePanel: () => null }));
const capture = vi.hoisted(() => vi.fn());
vi.mock("@/features/analytics/product-analytics", () => ({ trackProductEvent: capture }));
const rows: PassedContact[] = [
  { entry: { id: "1", jobId: "1", originalFilename: "a.pdf", applicantName: "가람", roleId: null, decision: "PASS", memo: "", matchStatus: "MATCHED", matchEvidence: "" }, roleName: "주연", contact: { status: "FOUND", phone: "010-0000-0001" }, email: { status: "FOUND", email: "actor@example.test" } },
  { entry: { id: "2", jobId: "2", originalFilename: "b.pdf", applicantName: "=이름\t확인\n필요", roleId: null, decision: "PASS", memo: "", matchStatus: "MATCHED", matchEvidence: "" }, roleName: "앙상블", contact: { status: "MULTIPLE", phone: null }, email: { status: "MISSING", email: null } },
];
let root: Root, container: HTMLDivElement;
const writeText = vi.fn();
function button(text: string) { return [...container.querySelectorAll("button")].find(b => b.textContent === text)!; }
async function render(loading = false, data = rows, error = "") {
  vi.mocked(usePassedContacts).mockReturnValue({ rows: data, loading, error, refresh: vi.fn() });
  await act(async () => root.render(<ReviewPassedContacts reviewId="1" onBack={vi.fn()} onDirtyChange={vi.fn()} onUnauthorized={vi.fn()} />));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks(); writeText.mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
describe("합격자 연락처 복사", () => {
  it("전체/선택 범위를 지키며 미확인 상태와 안전한 셀을 복사한다", async () => {
    await render(); await act(async () => button("전체 2명 연락처 복사").click());
    expect(writeText).toHaveBeenLastCalledWith("이름\t배역\t전화번호\t이메일\n가람\t주연\t010-0000-0001\tactor@example.test\n'=이름 확인 필요\t앙상블\t번호 여러 개 · 원문 확인\t이메일 미확인");
    expect(container.textContent).toContain("2명의 이름·배역·전화번호·이메일을 복사했습니다");
    await act(async () => container.querySelector<HTMLInputElement>("tbody input")!.click());
    expect(container.textContent).not.toContain("복사했습니다");
    await act(async () => button("선택한 1명 연락처 복사").click());
    expect(writeText.mock.lastCall![0]).not.toContain("앙상블");
    expect(writeText.mock.lastCall![0].split("\n")).toHaveLength(2);
  });
  it("권한 거절 시 성공 안내 대신 선택된 수동 복사 내용을 제공한다", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    await render(); await act(async () => button("전체 2명 연락처 복사").click());
    const area = container.querySelector("textarea")!;
    expect(area.value).toContain("actor@example.test");
    expect(area.selectionEnd).toBe(area.value.length);
    expect(document.activeElement).toBe(area);
    expect(container.textContent).not.toContain("복사했습니다");
    expect(container.textContent).toContain("직접 복사");
  });
  it("응답 전 성공을 표시하지 않으며 로딩·빈 명단·조회 오류에서 복사하지 않는다", async () => {
    let finish!: () => void;
    writeText.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    await render(); await act(async () => button("전체 2명 연락처 복사").click());
    expect(container.textContent).not.toContain("복사했습니다");
    expect(button("복사 중…").disabled).toBe(true);
    expect(container.querySelector<HTMLInputElement>("tbody input")!.disabled).toBe(true);
    expect(button("오디션 일정 명단").disabled).toBe(true);
    expect(button("새로고침").disabled).toBe(true);
    expect(button("심사로 돌아가기").disabled).toBe(true);
    await act(async () => finish());
    expect(container.textContent).toContain("복사했습니다");
    await render(true); expect(button("전체 2명 연락처 복사").disabled).toBe(true);
    await render(false, []); expect(button("전체 0명 연락처 복사").disabled).toBe(true);
    await render(false, [], "조회 실패"); expect(container.textContent).not.toContain("명 연락처 복사");
    expect(writeText).toHaveBeenCalledTimes(1);
  });
});

it("연락처 원본 클릭은 내용 없이 별도 경로로 기록하고 닫기·재렌더는 제외한다", async () => {
  await render(); expect(capture).not.toHaveBeenCalled();
  await act(async () => button("PDF 보기").click());
  expect(capture).toHaveBeenCalledExactlyOnceWith("review_original_pdf_clicked", {
    metric_version: 1, workflow: "producer_pdf", review_id: "1", item_id: "1", pdf_open_source: "passed_contacts",
  });
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find(b => b.textContent === "닫기")!.click());
  await render(); expect(capture).toHaveBeenCalledTimes(1);
  await act(async () => button("PDF 보기").click()); expect(capture).toHaveBeenCalledTimes(2);
});
