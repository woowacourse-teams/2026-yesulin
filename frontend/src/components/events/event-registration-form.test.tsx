// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerForEvent, uploadEventRegistrationPhoto } from "@/features/events/api";
import { getApplicantProfile } from "@/features/applicants/profile-api";
import { getActorPageSettings } from "@/features/actor-pages/owner-api";
import { shrinkPhoto } from "@/features/companies/photo-image";
import { EventRegistrationForm } from "./event-registration-form";

vi.mock("@/features/events/api", () => ({ registerForEvent: vi.fn(), uploadEventRegistrationPhoto: vi.fn() }));
vi.mock("@/features/applicants/profile-api", () => ({ getApplicantProfile: vi.fn() }));
vi.mock("@/features/actor-pages/owner-api", () => ({ getActorPageSettings: vi.fn() }));
vi.mock("@/features/monitoring/report-error", () => ({ reportError: vi.fn() }));
vi.mock("@/features/companies/photo-image", () => ({ shrinkPhoto: vi.fn() }));

let root: Root;
let container: HTMLDivElement;
const done = vi.fn();
const NativeURL = URL;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.clearAllMocks();
  vi.stubGlobal("URL", class extends NativeURL {
    static createObjectURL = vi.fn(() => "blob:profile-photo");
    static revokeObjectURL = vi.fn();
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.mocked(registerForEvent).mockResolvedValue({ id: 1 });
  vi.mocked(shrinkPhoto).mockResolvedValue(new Blob(["photo"], { type: "image/jpeg" }));
  vi.mocked(uploadEventRegistrationPhoto).mockResolvedValue("photo-upload-key");
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

async function open(popup = true) {
  await act(async () => root.render(<EventRegistrationForm eventId={2} businessCardOpen businessCardClosesAt={null}
    registrationConfirmationEnabled={popup} registrationConfirmationMessage={popup ? "보증금 안내\n입금 후 현장에서 반환합니다." : null} onDone={done} />));
}
async function input(selector: string, value: string) {
  const field = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
  const prototype = field instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function ready() {
  await act(async () => document.querySelectorAll<HTMLInputElement>('[type="radio"]')[1].click());
  await input("#registration-name", "테스트 참가자");
  await input("#registration-phone", "01012345678");
  await input("#registration-affiliation", "극단");
  await input("#registration-current-work", "제작 담당");
  await act(async () => document.querySelector<HTMLInputElement>('[type="checkbox"]')!.click());
}
async function submit() {
  await act(async () => document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}
function button(text: string) {
  return [...document.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent === text)!;
}
function preview() { return document.querySelector('figure[aria-label="입력한 명함 미리보기"]')!; }
async function actorCard() {
  await open();
  await act(async () => document.querySelector<HTMLInputElement>('[type="radio"]')!.click());
  await act(async () => button("무료 명함 만들기").click());
  await act(async () => button("프로필 등록 없이 직접 작성하기").click());
}

describe("참가 신청 전 안내", () => {
  it("무료 명함 버튼 하나에서 안내 팝업을 열고 프로필 경로를 우선 안내한다", async () => {
    await open(false);
    await act(async () => document.querySelector<HTMLInputElement>('[type="radio"]')!.click());
    expect(button("무료 명함 만들기")).toBeDefined();
    expect(button("프로필 등록하고 명함 만들기")).toBeUndefined();
    await act(async () => button("무료 명함 만들기").click());
    const dialog = document.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain("명함 정보 자동 채움");
    expect(dialog.textContent).toContain("내 공개 프로필로 연결되는 QR");
    expect(button("프로필 등록하고 명함 만들기")).toBeDefined();
    expect(button("프로필 등록 없이 직접 작성하기")).toBeDefined();
    expect(document.querySelector("#registration-email")).toBeNull();
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="명함 만들기 안내 닫기"]')!.click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(registerForEvent).not.toHaveBeenCalled();
  });

  it("입력 오류가 있으면 팝업과 접수 전에 오류를 보여 준다", async () => {
    await open();
    await act(async () => document.querySelector<HTMLInputElement>('[type="radio"]')!.click());
    await submit();
    expect(document.querySelector('[role="alert"]')).not.toBeNull();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(registerForEvent).not.toHaveBeenCalled();
  });

  it("팝업을 닫으면 입력과 동의를 유지하며, 최종 확인해야 접수한다", async () => {
    await open();
    await ready();
    expect(document.querySelector("details")?.open).toBe(false);
    await submit();
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("보증금 안내");
    expect(registerForEvent).not.toHaveBeenCalled();
    await act(async () => button("돌아가기").click());
    expect(document.querySelector<HTMLInputElement>("#registration-name")?.value).toBe("테스트 참가자");
    expect(document.querySelector<HTMLInputElement>('[type="checkbox"]')?.checked).toBe(true);
    await submit();
    await act(async () => button("확인하고 신청하기").click());
    expect(registerForEvent).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("팝업을 끄면 바로 접수하며 오류 뒤에는 입력을 유지하고 재시도할 수 있다", async () => {
    vi.mocked(registerForEvent).mockRejectedValueOnce(new Error("접수 실패"));
    await open(false);
    await ready();
    await submit();
    expect(document.querySelector('[role="alert"]')?.textContent).toBe("접수 실패");
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(done).not.toHaveBeenCalled();
    await submit();
    expect(registerForEvent).toHaveBeenCalledTimes(2);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("고정 제작 예시는 모달을 열고 닫아도 유지하고 실제 입력은 모달에서만 받는다", async () => {
    await open();
    await act(async () => document.querySelector<HTMLInputElement>('[type="radio"]')!.click());
    const example = container.querySelector('img[alt^="프로필 명함 앞·뒷면 제작 예시"]');
    expect(example).not.toBeNull();
    expect(document.querySelector("#registration-email")).toBeNull();
    expect(container.querySelectorAll('[type="checkbox"]').length).toBe(1);
    await act(async () => button("무료 명함 만들기").click());
  await act(async () => button("프로필 등록 없이 직접 작성하기").click());
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("프로필 명함 만들기");
    expect(container.contains(example)).toBe(true);
    await input("#registration-email", "saved@example.test");
    await act(async () => button("닫기").click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(container.contains(example)).toBe(true);
    await act(async () => button("명함 정보 수정").click());
    expect(document.querySelector<HTMLInputElement>("#registration-email")?.value).toBe("saved@example.test");
    expect(registerForEvent).not.toHaveBeenCalled();
  });

  it("이름과 이메일·SNS를 입력하거나 지우면 명함도 즉시 바뀌고 휴대폰은 제외한다", async () => {
    await actorCard();
    await input("#registration-card-name", "김예술");
    await input("#registration-email", "actor@example.test");
    await input("#registration-sns", "@actor");
    await input("#registration-phone", "01012345678");
    expect(preview().textContent).toContain("김예술");
    expect(preview().textContent).toContain("actor@example.test");
    expect(preview().textContent).toContain("@actor");
    expect(preview().textContent).not.toContain("010-1234-5678");
    await input("#registration-card-name", "");
    expect(preview().textContent).not.toContain("김예술");
    expect(preview().textContent).toContain("이름");
  });

  it("모바일 보기 전환에도 입력과 생년월일 선택을 유지하고 SNS 유형을 미리보기에 표시한다", async () => {
    await actorCard();
    await input("#registration-email", "actor@example.test");
    const snsType = document.querySelector<HTMLSelectElement>('[aria-label="SNS 유형"]')!;
    const year = document.querySelector<HTMLSelectElement>('[aria-label="태어난 연도"]')!;
    await act(async () => {
      snsType.value = "YOUTUBE"; snsType.dispatchEvent(new Event("change", { bubbles: true }));
      year.value = "1998"; year.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await input("#registration-sns", "@yesulin_actor");
    expect(document.querySelector<HTMLInputElement>("#registration-sns")?.maxLength).toBe(20);
    await input("#registration-sns", "가".repeat(21));
    expect(document.querySelector<HTMLInputElement>("#registration-sns")?.value).toBe("가".repeat(20));
    await input("#registration-sns", "@yesulin_actor");
    await act(async () => document.querySelector<HTMLButtonElement>("#event-card-tab-preview")!.click());
    expect(document.querySelector("#event-card-tab-preview")?.getAttribute("aria-selected")).toBe("true");
    expect(preview().textContent).toContain("@yesulin_actor");
    expect(preview().textContent).not.toContain("유튜브");
    expect(preview().querySelector(".event-card-example-sns-logo")).not.toBeNull();
    await act(async () => document.querySelector<HTMLButtonElement>("#event-card-tab-input")!.click());
    expect(document.querySelector<HTMLInputElement>("#registration-email")?.value).toBe("actor@example.test");
    expect(year.value).toBe("1998");
    await act(async () => { snsType.value = ""; snsType.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(document.querySelector<HTMLInputElement>("#registration-sns")?.value).toBe("");
    expect(registerForEvent).not.toHaveBeenCalled();
  });

  it("보이는 화면 높이가 바뀌면 모달에 반영하고 닫은 뒤에는 리스너를 해제한다", async () => {
    const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0 });
    vi.stubGlobal("visualViewport", viewport);
    await actorCard();
    const panel = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(panel.style.getPropertyValue("--event-editor-height")).toBe("844px");
    viewport.height = 420; viewport.offsetTop = 20;
    await act(async () => viewport.dispatchEvent(new Event("resize")));
    expect(panel.style.getPropertyValue("--event-editor-height")).toBe("420px");
    expect(panel.style.getPropertyValue("--event-editor-top")).toBe("20px");
    await act(async () => button("닫기").click());
    viewport.height = 900; viewport.dispatchEvent(new Event("resize"));
    expect(panel.style.getPropertyValue("--event-editor-height")).toBe("420px");
  });

  it("분야·경력에 포커스하면 뒷면에서 입력을 확인하고 경력 없음도 바로 반영한다", async () => {
    await actorCard();
    const theater = [...document.querySelectorAll<HTMLLabelElement>("label")].find((label) => label.textContent === "연극")!.querySelector("input")!;
    await act(async () => { theater.focus(); theater.click(); });
    expect(preview().querySelector('[aria-label="명함 뒷면"]')).not.toBeNull();
    expect(preview().textContent).toContain("연극");
    await input('[aria-label="경력 1 작품명"]', "달빛 정거장");
    await input('[aria-label="경력 1 역할"]', "민수 역");
    expect(preview().textContent).toContain("달빛 정거장 · 민수 역");
    const noCareer = [...document.querySelectorAll<HTMLLabelElement>("label")].find((label) => label.textContent?.includes("경력 없음 (신입)"))!.querySelector("input")!;
    await act(async () => noCareer.click());
    expect(preview().textContent).toContain("신입");
    expect(preview().textContent).not.toContain("경력 없음");
    expect(preview().textContent).not.toContain("달빛 정거장");
    await act(async () => document.querySelector<HTMLInputElement>("#registration-email")!.focus());
    expect(preview().querySelector('[aria-label="명함 앞면"]')).not.toBeNull();
  });

  it("업로드한 사진을 명함에도 표시하고 제작 선택을 끄면 미리보기 주소를 해제한다", async () => {
    await actorCard();
    const photoInput = document.querySelector<HTMLInputElement>('[type="file"]')!;
    await act(async () => {
      Object.defineProperty(photoInput, "files", { value: [new File(["photo"], "profile.jpg", { type: "image/jpeg" })] });
      photoInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(uploadEventRegistrationPhoto).toHaveBeenCalledTimes(1);
    expect(preview().querySelector("img")?.getAttribute("src")).toBe("blob:profile-photo");
    await act(async () => button("닫기").click());
    await act(async () => button("명함 제작 취소").click());
    expect(preview()).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:profile-photo");
  });

  it("업로드 중에는 닫기를 막고 완료 후 모달을 닫아도 사진을 유지한다", async () => {
    let finish!: (key: string) => void;
    vi.mocked(uploadEventRegistrationPhoto).mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await actorCard();
    const photoInput = document.querySelector<HTMLInputElement>('[type="file"]')!;
    await act(async () => {
      Object.defineProperty(photoInput, "files", { value: [new File(["photo"], "profile.jpg", { type: "image/jpeg" })] });
      photoInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(button("닫기").disabled).toBe(true);
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    await act(async () => finish("upload-key"));
    await act(async () => button("닫기").click());
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    await act(async () => button("명함 정보 수정").click());
    expect(preview().querySelector("img")?.getAttribute("src")).toBe("blob:profile-photo");
  });

  it("모달 완료 전에 명함 필수 정보를 검증하고 행사 신청은 보내지 않는다", async () => {
    await actorCard();
    await act(async () => button("명함 정보 완료").click());
    expect(document.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain("이름");
    expect(registerForEvent).not.toHaveBeenCalled();
  });

  it("명함 정보를 완료한 뒤 행사 신청을 최종 확인해야 함께 접수한다", async () => {
    await actorCard();
    await input("#registration-card-name", "김예술");
    await input("#registration-email", "actor@example.test");
    for (const [label, value] of [["태어난 연도", "1998"], ["태어난 월", "03"], ["태어난 일", "15"]]) {
      const select = document.querySelector<HTMLSelectElement>(`[aria-label="${label}"]`)!;
      await act(async () => { select.value = value; select.dispatchEvent(new Event("change", { bubbles: true })); });
    }
    const photoInput = document.querySelector<HTMLInputElement>('[type="file"]')!;
    await act(async () => {
      Object.defineProperty(photoInput, "files", { value: [new File(["photo"], "profile.jpg", { type: "image/jpeg" })] });
      photoInput.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const field = [...document.querySelectorAll<HTMLLabelElement>("label")].find((label) => label.textContent === "연극")!.querySelector("input")!;
    const noCareer = [...document.querySelectorAll<HTMLLabelElement>("label")].find((label) => label.textContent?.includes("경력 없음 (신입)"))!.querySelector("input")!;
    await act(async () => { field.click(); noCareer.click(); });
    await act(async () => button("명함 정보 완료").click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(container.textContent).toContain("명함 정보 입력 완료");
    expect(registerForEvent).not.toHaveBeenCalled();
    await input("#registration-phone", "01012345678");
    await act(async () => container.querySelector<HTMLInputElement>('[type="checkbox"]')!.click());
    await submit();
    await act(async () => button("확인하고 신청하기").click());
    expect(registerForEvent).toHaveBeenCalledWith(2, expect.objectContaining({
      businessCardRequested: true, name: "김예술", email: "actor@example.test", birthDate: "1998-03-15",
      photoUploadKey: "photo-upload-key", activityFields: ["THEATER"], noCareer: true,
    }));
    expect(done).toHaveBeenCalledTimes(1);
  });
});


it("일반 참가자도 두 구분 중 배우를 선택하고 명함 없이 신청한다", async () => {
  await open(false);
  await act(async () => document.querySelector<HTMLInputElement>('[value="ACTOR"]')!.click());
  expect(document.querySelectorAll('[type="radio"]')).toHaveLength(2);
  expect(document.querySelector('[value="GENERAL"]')).toBeNull();
  expect(document.querySelector('#registration-participant-guide')?.textContent).toContain('일반 참가자도 ‘배우’를 선택');
  expect(document.querySelector('#registration-affiliation')).toBeNull();
  expect(button('무료 명함 만들기')).toBeDefined();
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  await input("#registration-name", "일반 참가자");
  await input("#registration-phone", "01012345678");
  await act(async () => document.querySelector<HTMLInputElement>('[type="checkbox"]')!.click());
  await submit();
  expect(registerForEvent).toHaveBeenCalledWith(2, expect.objectContaining({ participantType: "ACTOR", affiliation: null, businessCardRequested: false }));
});

it("공개 프로필과 사진을 불러온 뒤 명함 수정값으로 본인 프로필 연결 신청을 보낸다", async () => {
    vi.mocked(getApplicantProfile).mockResolvedValue({
      answers: [{ key: "NAME", label: "이름", value: "김배우" }, { key: "PHONE", label: "전화", value: "010-1234-5678" }, { key: "EMAIL", label: "이메일", value: "profile@example.com" }, { key: "BIRTH", label: "생년월일", value: "2000-03-14" }],
      photoLibrary: [{ id: "1", name: "대표", url: "/api/v1/files/1/content", representative: true }],
      videoLibrary: [], completeness: { filled: 4, standardTotal: 8 },
    });
    vi.mocked(getActorPageSettings).mockResolvedValue({ status: "PUBLIC", handle: "actor", handleEditable: false,
      locked: false, lockReason: null, autoHiddenReason: null, consentVersion: "actor-page-publish-v1.0",
      fieldVisibilities: { education: "PRIVATE", careers: "PRIVATE", coverLetter: "PRIVATE", specialty: "PRIVATE", hobbies: "PRIVATE", nationality: "PRIVATE", links: "PRIVATE" },
      publicId: "actor-id", unlockedAt: null, firstPublishedAt: null, publishedAt: null, publishPromptShown: true, pageRepresentativePhotoId: 1,
      readiness: { ready: true, missing: [], underAge: false, locked: false } });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(new Blob(["photo"], { type: "image/jpeg" }))));
    await open(false);
    await act(async () => document.querySelector<HTMLInputElement>('[type="radio"]')!.click());
    await input("#registration-name", "명함용 예명");
    await act(async () => button("무료 명함 만들기").click());
    await act(async () => button("프로필 등록하고 명함 만들기").click());
    expect(document.querySelector<HTMLInputElement>("#registration-card-name")!.value).toBe("명함용 예명");
    expect(document.querySelector<HTMLInputElement>("#registration-email")!.value).toBe("profile@example.com");
    expect(uploadEventRegistrationPhoto).toHaveBeenCalledTimes(1);
    await input("#registration-email", "card@example.com");
    const field = [...document.querySelectorAll<HTMLLabelElement>("label")].find(label => label.textContent === "연극")!.querySelector("input")!;
    const noCareer = [...document.querySelectorAll<HTMLLabelElement>("label")].find(label => label.textContent?.includes("경력 없음 (신입)"))!.querySelector("input")!;
    await act(async () => { field.click(); noCareer.click(); });
    await act(async () => button("명함 정보 완료").click());
    await act(async () => container.querySelector<HTMLInputElement>('[type="checkbox"]')!.click());
    await submit();
    expect(registerForEvent).toHaveBeenCalledWith(2, expect.objectContaining({ name: "명함용 예명", email: "card@example.com", photoUploadKey: "photo-upload-key" }), true);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it("프로필 조회 실패를 표시하고 직접 작성 경로를 계속 사용할 수 있다", async () => {
    vi.mocked(getApplicantProfile).mockRejectedValue(new Error("프로필 조회 실패"));
    vi.mocked(getActorPageSettings).mockRejectedValue(new Error("프로필 조회 실패"));
    await open(false);
    await act(async () => document.querySelector<HTMLInputElement>('[type="radio"]')!.click());
    await act(async () => button("무료 명함 만들기").click());
    await act(async () => button("프로필 등록하고 명함 만들기").click());
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("프로필 조회 실패");
    await act(async () => button("프로필 등록 없이 직접 작성하기").click());
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(registerForEvent).not.toHaveBeenCalled();
  });
