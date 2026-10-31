// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewTimetablePanel } from "./review-timetable-panel";
import * as api from "@/features/pdf-reviews/timetables";
import type { PassedContact } from "@/features/pdf-reviews/use-passed-contacts";

vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock("@/features/pdf-reviews/timetables", async original => ({
  ...await original<typeof import("@/features/pdf-reviews/timetables")>(),
  listRosters: vi.fn(), fetchRoster: vi.fn(), createRoster: vi.fn(), importRoster: vi.fn(), editRosterContact: vi.fn(), saveRosterAssignments: vi.fn(),
}));
const selected: PassedContact[] = [{ entry: { id: "entry", jobId: "job", originalFilename: "test.pdf",
  applicantName: "가람", roleId: null, decision: "PASS", memo: "", matchStatus: "MATCHED", matchEvidence: "" },
  roleName: "미기재", contact: { status: "MISSING", phone: null }, email: { status: "MISSING", email: null } }];
let root: Root;
let container: HTMLDivElement;
let unauthorized: ReturnType<typeof vi.fn<() => void>>;
let dirtyChange: ReturnType<typeof vi.fn<(dirty: boolean) => void>>;
async function click(text: string) {
  const button = [...container.querySelectorAll("button")].find(item => item.textContent === text);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}
async function fill(selector: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(selector)!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function render() {
  await act(async () => root.render(<ReviewTimetablePanel reviewId="review" selected={selected}
    onClose={vi.fn()} onDirtyChange={dirtyChange} onUnauthorized={unauthorized} />));
}
async function choose() {
  await act(async () => {
    const select = container.querySelector("select")!; select.value = "1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.clearAllMocks(); unauthorized = vi.fn(); dirtyChange = vi.fn();
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  vi.mocked(api.listRosters).mockResolvedValue([{ id: 1, title: "2차", actorCount: 0 }]);
  vi.mocked(api.fetchRoster).mockResolvedValue({ id: 1, title: "2차", actors: [] });
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("합격자 일정 등록", () => {
  it("새 일정 입력을 명시적으로 열고 닫아도 이름·재시도 키와 기존 일정은 보존한다", async () => {
    await render(); await choose();
    expect(container.querySelector("#roster-title")).toBeNull();
    await click("새 일정 만들기");
    expect(document.activeElement).toBe(container.querySelector("#roster-title"));
    await fill("#roster-title", "다음 일정"); await click("닫기");
    expect(container.querySelector("#roster-title")).toBeNull();
    expect(document.activeElement?.textContent).toBe("새 일정 만들기 · 작성 중");
    expect(container.querySelector("select")!.value).toBe("1");
    expect(dirtyChange).toHaveBeenLastCalledWith(true);
    await click("새 일정 만들기 · 작성 중");
    expect(container.querySelector<HTMLInputElement>("#roster-title")!.value).toBe("다음 일정");
    expect(api.createRoster).not.toHaveBeenCalled();
  });
  it("선택한 이름만 가져오며 실패하면 입력을 유지하고 재시도한다", async () => {
    vi.mocked(api.importRoster).mockRejectedValueOnce(new Error("저장 실패"))
      .mockResolvedValueOnce({ id: 1, title: "2차", actors: [] });
    await render(); await choose(); await fill("#import-0-name", "수정한 이름");
    await click("선택한 1명 일정에 등록");
    expect(container.textContent).toContain("저장 실패");
    expect(container.querySelector<HTMLInputElement>("#import-0-name")!.value).toBe("수정한 이름");
    await click("선택한 1명 일정에 등록");
    expect(api.importRoster).toHaveBeenLastCalledWith(1, "review", [{ entryId: "entry", name: "수정한 이름", phone: "", email: "" }]);
    expect(container.textContent).toContain("등록했습니다");
  });
  it("이미 가져온 지원자는 다시 추가하지 않는다", async () => {
    vi.mocked(api.fetchRoster).mockResolvedValue({ id: 1, title: "2차", actors: [{ id: 3, name: "가람", phone: null,
      email: "", roleName: "미기재", sourceApplicantId: "entry", sourceReviewId: "review", sourceDecision: "PASS", slot: null }] });
    await render(); await choose();
    expect(container.textContent).toContain("이미 등록됨");
    expect([...container.querySelectorAll("button")].find(b => b.textContent === "선택한 0명 일정에 등록")!.disabled).toBe(true);
    expect(api.importRoster).not.toHaveBeenCalled();
  });
  it("생성 응답이 유실되어도 같은 키로 재시도한다", async () => {
    vi.mocked(api.createRoster).mockRejectedValueOnce(new Error("통신 실패"))
      .mockResolvedValueOnce({ id: 2, title: "새 일정", actors: [] });
    await render(); await click("새 일정 만들기"); await fill("#roster-title", "새 일정");
    await click("일정 만들기"); await click("일정 만들기");
    expect(vi.mocked(api.createRoster).mock.calls[0]).toEqual(vi.mocked(api.createRoster).mock.calls[1]);
    expect(api.importRoster).not.toHaveBeenCalled();
    expect(container.querySelector("#roster-title")).toBeNull();
    expect(document.activeElement?.textContent).toBe("새 일정 만들기");
  });
  it("조회 도중 로그인이 만료되면 상위 화면에 알린다", async () => {
    vi.mocked(api.fetchRoster).mockRejectedValue(Object.assign(new Error("로그인 만료"), { status: 401 }));
    await render(); await choose(); expect(unauthorized).toHaveBeenCalledOnce();
    expect(container.textContent).not.toContain("가람");
  });
  it("연락처 저장 후에도 다른 폼의 미저장 입력을 보호한다", async () => {
    const actor: api.RosterActor = { id: 3, name: "기존 지원자", phone: null, email: "", roleName: "",
      sourceApplicantId: "existing", sourceReviewId: "review", sourceDecision: "PASS", slot: null };
    vi.mocked(api.fetchRoster).mockResolvedValue({ id: 1, title: "2차", actors: [actor] });
    vi.mocked(api.editRosterContact).mockResolvedValue({ id: 1, title: "2차", actors: [{ ...actor, name: "수정" }] });
    await render(); await choose(); await fill("#import-0-name", "가져올 이름 수정");
    await click("연락처 관리"); await click("연락처 수정"); await fill("#edit-name", "수정"); await click("연락처 저장");
    expect(dirtyChange).toHaveBeenLastCalledWith(true);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await click("합격자 명단으로"); expect(confirm).toHaveBeenCalledOnce();
    expect(container.querySelector<HTMLInputElement>("#import-0-name")!.value).toBe("가져올 이름 수정");
  });
  it("가져오기 저장은 기존 편집과 새 일정 이름을 지우지 않고 일정 생성은 편집 폐기를 확인한다", async () => {
    const actor: api.RosterActor = { id: 3, name: "기존 지원자", phone: null, email: "", roleName: "",
      sourceApplicantId: "existing", sourceReviewId: "review", sourceDecision: "PASS", slot: null };
    vi.mocked(api.fetchRoster).mockResolvedValue({ id: 1, title: "2차", actors: [actor] });
    vi.mocked(api.importRoster).mockResolvedValue({ id: 1, title: "2차", actors: [actor] });
    await render(); await choose(); await click("연락처 관리"); await click("연락처 수정"); await fill("#edit-name", "저장 전");
    await click("새 일정 만들기"); await fill("#roster-title", "새 제목"); await click("선택한 1명 일정에 등록");
    expect(dirtyChange).toHaveBeenLastCalledWith(true);
    expect(container.querySelector<HTMLInputElement>("#edit-name")!.value).toBe("저장 전");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await click("일정 만들기"); expect(confirm).toHaveBeenCalledOnce();
    expect(api.createRoster).not.toHaveBeenCalled();
    await click("수정 취소");
    confirm.mockReturnValue(true); await click("수정 취소");
    expect(dirtyChange).toHaveBeenLastCalledWith(true);
  });

  it("입력을 수정하지 않아도 등록 요청 중에는 상위 이탈 경고를 유지한다", async () => {
    let complete!: (value: api.RosterDetail) => void;
    vi.mocked(api.importRoster).mockReturnValue(new Promise(resolve => { complete = resolve; }));
    await render(); await choose();
    expect(dirtyChange).toHaveBeenLastCalledWith(false);
    await click("선택한 1명 일정에 등록");
    expect(dirtyChange).toHaveBeenLastCalledWith(true);
    await act(async () => complete({ id: 1, title: "2차", actors: [] }));
    expect(dirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("배정 저장 실패 시 입력을 유지하고 재시도한 뒤 조회값을 표시한다", async () => {
    const actor: api.RosterActor = { id: 3, name: "배정테스트", phone: null, email: "", roleName: "",
      sourceApplicantId: "existing", sourceReviewId: "review", sourceDecision: "PASS", slot: null };
    vi.mocked(api.fetchRoster).mockResolvedValue({ id: 1, title: "2차", actors: [actor] });
    vi.mocked(api.saveRosterAssignments).mockRejectedValueOnce(new Error("배정 저장 실패"))
      .mockResolvedValueOnce({ id: 1, title: "2차", actors: [{ ...actor, slot: { date: "2026-11-03", startTime: "14:07:00" } }] });
    await render(); await choose();
    await fill('[aria-label="배정테스트 배정 날짜"]', "2026-11-03");
    expect([...container.querySelectorAll("button")].find(b => b.textContent === "배정 저장 (1명)")!.disabled).toBe(true);
    await fill('[aria-label="배정테스트 배정 시간"]', "14:07");
    await click("배정 저장 (1명)");
    expect(container.textContent).toContain("배정 저장 실패");
    expect(container.querySelector<HTMLInputElement>('[aria-label="배정테스트 배정 시간"]')!.value).toBe("14:07");
    expect(dirtyChange).toHaveBeenLastCalledWith(true);
    await click("배정 저장 (1명)");
    expect(api.saveRosterAssignments).toHaveBeenLastCalledWith(1, [{ actorId: 3, previousSlot: null,
      slot: { date: "2026-11-03", startTime: "14:07" } }]);
    expect(container.textContent).toContain("저장된 시간: 2026-11-03 14:07");
    expect(dirtyChange).toHaveBeenLastCalledWith(false);
    await click("배정 해제");
    expect(container.querySelector<HTMLInputElement>('[aria-label="배정테스트 배정 날짜"]')!.value).toBe("");
    expect(dirtyChange).toHaveBeenLastCalledWith(true);
  });
  it("선택 인원 일괄 적용과 연락처 저장 사이에도 배정 입력과 이탈 보호를 유지한다", async () => {
    const actor: api.RosterActor = { id: 3, name: "배정테스트", phone: null, email: "", roleName: "",
      sourceApplicantId: "existing", sourceReviewId: "review", sourceDecision: "PASS", slot: null };
    vi.mocked(api.fetchRoster).mockResolvedValue({ id: 1, title: "2차", actors: [actor] });
    vi.mocked(api.editRosterContact).mockResolvedValue({ id: 1, title: "2차", actors: [actor] });
    await render(); await choose();
    await act(async () => container.querySelector<HTMLInputElement>('[aria-label="배정 대상 전체 선택"]')!.click());
    await fill('[aria-label="일괄 날짜"]', "2026-11-03"); await fill('[aria-label="일괄 시간"]', "09:13");
    await click("선택한 사람에게 적용"); await click("연락처 관리"); await click("연락처 수정"); await click("연락처 저장");
    await click("날짜·시간 배정");
    expect(container.querySelector<HTMLInputElement>('[aria-label="배정테스트 배정 시간"]')!.value).toBe("09:13");
    expect(dirtyChange).toHaveBeenLastCalledWith(true);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await click("합격자 명단으로"); expect(confirm).toHaveBeenCalledOnce();
    expect(api.saveRosterAssignments).not.toHaveBeenCalled();
    await click("선택한 배정 해제");
    expect(container.querySelector<HTMLInputElement>('[aria-label="배정테스트 배정 시간"]')!.value).toBe("");
    expect(dirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("선택한 연락처 행에서 편집하고 취소·저장 후 원래 버튼으로 초점을 돌린다", async () => {
    const actor: api.RosterActor = { id: 3, name: "첫 배우", phone: null, email: "", roleName: "",
      sourceApplicantId: "first", sourceReviewId: "review", sourceDecision: "PASS", slot: null };
    const second = { ...actor, id: 4, name: "둘째 배우", sourceApplicantId: "second" };
    vi.mocked(api.fetchRoster).mockResolvedValue({ id: 1, title: "2차", actors: [actor, second] });
    vi.mocked(api.editRosterContact).mockResolvedValue({ id: 1, title: "2차", actors: [actor, second] });
    await render(); await choose(); await click("연락처 관리");
    const rows = container.querySelectorAll('[aria-label="일정 연락처 관리"] li');
    let editButton = rows[0].querySelector<HTMLButtonElement>("button")!;
    await act(async () => editButton.click());
    expect(rows[0].contains(container.querySelector("#edit-name"))).toBe(true);
    expect(document.activeElement).toBe(container.querySelector("#edit-name"));
    expect(container.querySelectorAll("#edit-name")).toHaveLength(1);
    await fill("#edit-name", "저장 전 입력");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    await act(async () => rows[1].querySelector<HTMLButtonElement>("button")!.click());
    expect(container.querySelector<HTMLInputElement>("#edit-name")!.value).toBe("저장 전 입력");
    confirm.mockReturnValue(true);
    await click("날짜·시간 배정"); await click("연락처 관리 · 수정 중");
    editButton = container.querySelector<HTMLButtonElement>('[aria-label="첫 배우 연락처"] button')!;
    expect(document.activeElement).toBe(container.querySelector("#edit-name"));
    await click("수정 취소");
    expect(document.activeElement).toBe(editButton);
    await act(async () => editButton.click());
    await click("날짜·시간 배정"); await click("연락처 관리");
    editButton = container.querySelector<HTMLButtonElement>('[aria-label="첫 배우 연락처"] button')!;
    await click("연락처 저장");
    expect(document.activeElement).toBe(editButton);
    expect(container.querySelector("#edit-name")).toBeNull();
  });

  it("행별 되돌리기와 전체 취소가 다른 배정·연락처 입력과 서버값을 보호한다", async () => {
    const actor: api.RosterActor = { id: 3, name: "첫 배우", phone: null, email: "", roleName: "",
      sourceApplicantId: "first", sourceReviewId: "review", sourceDecision: "PASS",
      slot: { date: "2026-11-03", startTime: "14:07:00" } };
    const second = { ...actor, id: 4, name: "둘째 배우", sourceApplicantId: "second", slot: null };
    vi.mocked(api.fetchRoster).mockResolvedValue({ id: 1, title: "2차", actors: [actor, second] });
    await render(); await choose();
    expect(container.querySelector('[aria-label="일정 연락처 관리"]')).toBeNull();
    await fill('[aria-label="첫 배우 배정 날짜"]', "2026-11-04");
    await fill('[aria-label="둘째 배우 배정 날짜"]', "2026-11-05");
    await fill('[aria-label="둘째 배우 배정 시간"]', "13:00");
    await click("저장값으로 되돌리기");
    expect(container.querySelector<HTMLInputElement>('[aria-label="첫 배우 배정 날짜"]')!.value).toBe("2026-11-03");
    expect(container.querySelector<HTMLInputElement>('[aria-label="둘째 배우 배정 시간"]')!.value).toBe("13:00");
    await fill('[aria-label="일괄 날짜"]', "2026-11-06");
    await click("연락처 관리");
    expect(container.querySelector('[aria-label="날짜와 시간 배정"]')).toBeNull();
    await click("연락처 수정"); await fill("#edit-phone", "01000009999");
    await click("날짜·시간 배정");
    expect(container.querySelector<HTMLInputElement>('[aria-label="둘째 배우 배정 시간"]')!.value).toBe("13:00");
    await click("연락처 관리 · 수정 중");
    expect(container.querySelector<HTMLInputElement>("#edit-phone")!.value).toBe("01000009999");
    await click("배정 변경 전체 취소");
    await click("날짜·시간 배정");
    expect(container.querySelector<HTMLInputElement>('[aria-label="둘째 배우 배정 날짜"]')!.value).toBe("");
    expect(container.querySelector<HTMLInputElement>('[aria-label="일괄 날짜"]')!.value).toBe("");
    await click("연락처 관리 · 수정 중");
    expect(container.querySelector<HTMLInputElement>("#edit-phone")!.value).toBe("01000009999");
    expect(dirtyChange).toHaveBeenLastCalledWith(true);
    expect(api.saveRosterAssignments).not.toHaveBeenCalled();
    expect(actor.slot).toEqual({ date: "2026-11-03", startTime: "14:07:00" });
  });

  it("일괄 도구를 접어도 입력을 보존하고 연락처 보기에서는 배정 초안이 있을 때만 저장 도구를 보여준다", async () => {
    const actor: api.RosterActor = { id: 3, name: "배우", phone: null, email: "", roleName: "",
      sourceApplicantId: "existing", sourceReviewId: "review", sourceDecision: "PASS", slot: null };
    vi.mocked(api.fetchRoster).mockResolvedValue({ id: 1, title: "2차", actors: [actor] });
    await render(); await choose();
    const batchInput = () => container.querySelector<HTMLInputElement>('[aria-label="일괄 날짜"]')!;
    expect(batchInput().closest('[hidden]')).not.toBeNull();
    await act(async () => container.querySelector<HTMLInputElement>('[aria-label="배정 대상 전체 선택"]')!.click());
    expect(batchInput().closest('[hidden]')).toBeNull();
    await fill('[aria-label="일괄 날짜"]', "2026-11-09");
    await act(async () => container.querySelector<HTMLInputElement>('[aria-label="배정 대상 전체 선택"]')!.click());
    expect(batchInput().value).toBe("2026-11-09");
    expect(batchInput().closest('[hidden]')).toBeNull();
    await click("연락처 관리");
    expect(container.querySelector('[aria-label="배정 저장 도구"]')).not.toBeNull();
    expect(container.textContent).toContain("날짜·시간 배정의 저장 전 변경");
    await click("배정 변경 전체 취소");
    expect(container.querySelector('[aria-label="배정 저장 도구"]')).toBeNull();
    await click("날짜·시간 배정");
    expect(batchInput().value).toBe("");
    expect(batchInput().closest('[hidden]')).not.toBeNull();
    expect(api.saveRosterAssignments).not.toHaveBeenCalled();
  });

});
