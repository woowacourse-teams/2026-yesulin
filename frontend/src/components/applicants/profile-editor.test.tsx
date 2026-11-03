// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { updateApplicantProfile } from "@/features/applicants/api";
import { toBackendProfileUpdate, toLegacyProfileUpdate, toProfileInformation } from "@/features/applicants/profile-contract";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import { ProfileEditor } from "./profile-editor";
import { trackPdfProfileSaved } from "@/features/analytics/pdf-analytics";
import { getActorPagePreview, recordActorPagePublishPrompt, type PublishedActorPage } from "@/features/actor-pages/owner-api";

const publication = vi.hoisted(() => ({ refresh: vi.fn(), update: vi.fn(), result: null as unknown }));

vi.mock("@/features/applicants/api", () => ({ updateApplicantProfile: vi.fn() }));
vi.mock("@/features/analytics/pdf-analytics", () => ({ clearPdfApplied: vi.fn(), trackPdfProfileSaved: vi.fn() }));
vi.mock("@/components/auditions/toast", () => ({ useToast: () => vi.fn() }));
vi.mock("@/components/actor-pages/actor-page-settings", () => ({
  useActorPageSettings: () => ({ settings: null, ...publication }),
  ActorPageSettingsPanel: ({ hasUnsavedChanges, onPublished }: { hasUnsavedChanges: boolean; onPublished: (result: PublishedActorPage) => void }) => <div><span>{hasUnsavedChanges ? "공개 전 저장 필요" : "공개 설정 준비"}</span><button onClick={() => onPublished(publication.result as PublishedActorPage)}>테스트 공개 응답</button></div>,
  publishedActorPageToast: vi.fn(),
}));
vi.mock("@/components/actor-pages/actor-page-publish-dialog", () => ({ ActorPagePublishDialog: () => <div role="dialog">공개 안내</div> }));
vi.mock("@/features/actor-pages/owner-api", () => ({ recordActorPagePublishPrompt: vi.fn(), getActorPagePreview: vi.fn() }));
vi.mock("@/components/actor-pages/actor-page-detail", () => ({ ActorPageView: () => <p>저장본 미리보기</p> }));
vi.mock("@/features/applicants/profile-photo-api", () => ({ reloadApplicantProfilePhotos: vi.fn() }));
vi.mock("./profile-import", () => ({ ProfileImport: () => null }));
vi.mock("./profile-photo-library", () => ({ MAX_LIBRARY_PHOTOS: 3, ProfilePhotoLibrary: ({ onContinue }: { onContinue: () => void }) => <div><h3>사진 보관함</h3><button onClick={onContinue}>다음: 페이지 공개</button></div> }));
vi.mock("./profile-video-library", () => ({ MAX_LIBRARY_VIDEOS: 3, ProfileVideoLibrary: () => null }));

const profile: ApplicantProfileResponse = {
  answers: [
    { key: "NAME", label: "이름", value: "배우" },
    { key: "HEIGHT", label: "키", value: 166 },
    { key: "WEIGHT", label: "몸무게", value: 52 },
    { key: "BIRTH", label: "생년월일", value: "1999-04-18" },
  ],
  photoLibrary: [], videoLibrary: [], completeness: { filled: 4, standardTotal: 8 },
};

let root: Root;
let container: HTMLDivElement;
let frames: FrameRequestCallback[];
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  publication.refresh.mockResolvedValue(null);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  vi.mocked(updateApplicantProfile).mockImplementation(async (values, current) => ({
    ...current,
    ...toProfileInformation({ ...toBackendProfileUpdate(values), completeness: { filled: 3, total: 8 } }),
  }));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

async function render() {
  function Workspace() {
    const [saved, setSaved] = useState(profile);
    return <ProfileEditor profile={saved} onSaved={setSaved} />;
  }
  await act(async () => root.render(<Workspace />));
}

function input(key: string) { return container.querySelector<HTMLInputElement>(`#profile-${key}`)!; }
function button(label: string) {
  return [...container.querySelectorAll("button")].find((item) => item.textContent?.trim() === label)!;
}
async function type(key: string, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(key), value);
    input(key).dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function save() {
  await act(async () => button("프로필 저장").click());
  await act(async () => frames.splice(0).forEach((callback) => callback(0)));
}
async function tab(label: string) {
  const nav = container.querySelector('nav[aria-label="프로필 항목"]')!;
  await act(async () => [...nav.querySelectorAll("button")].find((item) => item.textContent?.startsWith(label))!.click());
}

it.each(["HEIGHT", "WEIGHT"])("%s 삭제 시 빈칸을 유지하고 실제 계약 저장 후 변경 표시가 사라진다", async (key) => {
  await render();
  await type(key, "");
  expect(input(key).value).toBe("");
  await tab("추가정보");
  await tab("기본정보");
  expect(input(key).value).toBe("");
  await save();

  const values = vi.mocked(updateApplicantProfile).mock.calls[0][0];
  expect(toBackendProfileUpdate(values).basicInformation[key === "HEIGHT" ? "height" : "weight"]).toBeNull();
  expect(toLegacyProfileUpdate(values).removeKeys).toContain(key);
  expect(input(key).value).toBe("");
  expect(button("프로필 저장").disabled).toBe(true);
  expect(container.textContent).toContain("모든 변경 사항이 저장되어 있어요.");
});

it.each(["19990231", "1999023", "20990101"])("잘못된 생일 %s는 전송하지 않고 필드 오류·초점을 제공한 뒤 수정하면 저장된다", async (value) => {
  await render();
  await type("BIRTH", value);
  await save();
  expect(updateApplicantProfile).not.toHaveBeenCalled();
  expect(input("BIRTH").getAttribute("aria-invalid")).toBe("true");
  expect(input("BIRTH").getAttribute("aria-describedby")).toContain("profile-BIRTH-error");
  expect(document.activeElement).toBe(input("BIRTH"));
  expect(container.querySelector("#profile-BIRTH-error")?.textContent).toContain("생년월일");

  await type("BIRTH", "20000229");
  expect(input("BIRTH").hasAttribute("aria-invalid")).toBe(false);
  await save();
  expect(updateApplicantProfile).toHaveBeenCalledOnce();
  expect(button("프로필 저장").disabled).toBe(true);
});

it("생일 입력을 마치면 오류를 보여주고 다른 탭에서 저장해도 해당 필드로 돌아온다", async () => {
  await render();
  await type("BIRTH", "19990231");
  await act(async () => { input("BIRTH").focus(); input("BIRTH").blur(); });
  expect(input("BIRTH").getAttribute("aria-invalid")).toBe("true");
  await tab("추가정보");
  await save();
  expect(document.activeElement).toBe(input("BIRTH"));
  expect(input("BIRTH").getAttribute("aria-invalid")).toBe("true");
  expect(updateApplicantProfile).not.toHaveBeenCalled();
});

it("선택 생일을 지우면 오류 없이 저장된다", async () => {
  await render();
  await type("BIRTH", "");
  await save();
  expect(updateApplicantProfile).toHaveBeenCalledOnce();
  expect(toBackendProfileUpdate(vi.mocked(updateApplicantProfile).mock.calls[0][0]).basicInformation.birthDate).toBeNull();
  expect(button("프로필 저장").disabled).toBe(true);
});

it("저장 요청 중 새로 입력한 값은 늦게 도착한 저장 응답이 덮어쓰지 않는다", async () => {
  let complete!: (value: ApplicantProfileResponse) => void;
  vi.mocked(updateApplicantProfile).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
  await render();
  await type("NAME", "저장할 이름");
  await save();
  await type("NAME", "다음에 저장할 이름");
  await act(async () => complete({ ...profile, answers: profile.answers.map((answer) => answer.key === "NAME" ? { ...answer, value: "저장할 이름" } : answer) }));
  expect(input("NAME").value).toBe("다음에 저장할 이름");
  expect(button("프로필 저장").disabled).toBe(false);
});

it("저장 실패 후에도 지운 숫자와 작성 중인 이름을 유지하고 다시 저장할 수 있다", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(updateApplicantProfile).mockRejectedValueOnce(new Error("연결을 확인해 주세요."));
  await render();
  await type("HEIGHT", "");
  await type("NAME", "유지할 이름");
  await save();
  expect(input("HEIGHT").value).toBe("");
  expect(input("NAME").value).toBe("유지할 이름");
  expect(container.textContent).toContain("연결을 확인해 주세요.");
  expect(button("프로필 저장").disabled).toBe(false);
  await save();
  expect(updateApplicantProfile).toHaveBeenCalledTimes(2);
  expect(button("프로필 저장").disabled).toBe(true);
});

it("첫 화면은 기본 3항목과 닫힌 추가정보를 제공하고 단계 순서는 기본정보·사진·공개다", async () => {
  await render();
  const starting = [...container.querySelectorAll('.workspace-panel > .mt-6 > .grid input,.workspace-panel > .mt-6 > .grid select')].map((element) => element.id);
  expect(starting).toEqual(["profile-NAME", "profile-BIRTH", "profile-GENDER"]);
  expect(container.querySelector<HTMLDetailsElement>(".profile-optional-fields")!.open).toBe(false);
  const labels = [...container.querySelectorAll('nav[aria-label="프로필 항목"] strong')].map((element) => element.textContent);
  expect(labels).toEqual(["기본정보", "사진", "배우 페이지", "추가정보", "영상"]);
  expect(container.querySelector('nav[aria-label="프로필 항목"] button')!.textContent).toContain("2/3");
});

it("접힌 이메일에 오류가 있으면 내용을 펼치고 오류 필드로 이동한다", async () => {
  await render();
  await type("EMAIL", "잘못된주소");
  await save();
  expect(updateApplicantProfile).not.toHaveBeenCalled();
  expect(container.querySelector<HTMLDetailsElement>(".profile-optional-fields")!.open).toBe(true);
  expect(document.activeElement).toBe(input("EMAIL"));
  expect(input("EMAIL").getAttribute("aria-invalid")).toBe("true");
});

it("다음 단계는 저장 성공 뒤에만 열리고 연속 클릭이나 단계 이동 자체를 저장 성공으로 기록하지 않는다", async () => {
  let complete!: (value: ApplicantProfileResponse) => void;
  vi.mocked(updateApplicantProfile).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
  await render();
  await type("NAME", "체험 배우");
  const next = button("저장하고 사진으로");
  await act(async () => { next.click(); next.click(); });
  expect(updateApplicantProfile).toHaveBeenCalledOnce();
  expect(container.querySelector("h2")!.textContent).toBe("기본정보");
  expect(trackPdfProfileSaved).not.toHaveBeenCalled();
  await act(async () => complete({ ...profile, answers: profile.answers.map((answer) => answer.key === "NAME" ? { ...answer, value: "체험 배우" } : answer) }));
  expect(container.querySelector("h2")!.textContent).toBe("사진");
  expect(trackPdfProfileSaved).toHaveBeenCalledOnce();
  await act(async () => button("다음: 페이지 공개").click());
  expect(container.textContent).toContain("공개 설정 준비");
  expect(trackPdfProfileSaved).toHaveBeenCalledOnce();
});

it("다음 단계 저장이 실패하면 입력 화면을 유지하며 공개 탭에도 미저장 안내를 표시한다", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(updateApplicantProfile).mockRejectedValueOnce(new Error("저장에 실패했어요."));
  await render();
  await type("NAME", "유지할 이름");
  await act(async () => button("저장하고 사진으로").click());
  expect(container.querySelector("h2")!.textContent).toBe("기본정보");
  expect(input("NAME").value).toBe("유지할 이름");
  expect(trackPdfProfileSaved).not.toHaveBeenCalled();
  await tab("배우 페이지");
  expect(container.textContent).toContain("공개 전 저장 필요");
  await act(async () => button("프로필 저장 후 계속").click());
  expect(container.textContent).toContain("공개 설정 준비");
});

it("저장 응답 대기 중 새로 입력하면 최초 공개 팝업을 열거나 표시 기록을 남기지 않는다", async () => {
  let complete!: (value: ApplicantProfileResponse) => void;
  vi.mocked(updateApplicantProfile).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
  publication.refresh.mockResolvedValue({ status: "PRIVATE", locked: false, publishPromptShown: false });
  await render();
  await type("NAME", "저장할 이름");
  await save();
  await type("NAME", "아직 작성 중인 이름");
  await act(async () => complete({ ...profile, answers: profile.answers.map((answer) => answer.key === "NAME" ? { ...answer, value: "저장할 이름" } : answer) }));
  expect(input("NAME").value).toBe("아직 작성 중인 이름");
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(recordActorPagePublishPrompt).not.toHaveBeenCalled();
  expect(button("프로필 저장").disabled).toBe(false);
});

it("공개 조건 조회 중 새로 입력한 내용도 공개 팝업을 막고 미저장값을 보존한다", async () => {
  let refresh!: (value: unknown) => void;
  publication.refresh.mockImplementationOnce(() => new Promise((resolve) => { refresh = resolve; }));
  await render();
  await type("NAME", "저장할 이름");
  await save();
  expect(publication.refresh).toHaveBeenCalledOnce();
  await type("NAME", "조회 중에 입력한 이름");
  await act(async () => refresh({ status: "PRIVATE", locked: false, publishPromptShown: false }));
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(recordActorPagePublishPrompt).not.toHaveBeenCalled();
  expect(input("NAME").value).toBe("조회 중에 입력한 이름");
});

it("작성한 내용이 모두 저장됐을 때는 기존 최초 공개 안내를 유지한다", async () => {
  publication.refresh.mockResolvedValue({ status: "PRIVATE", locked: false, publishPromptShown: false });
  await render();
  await type("NAME", "저장한 이름");
  await save();
  expect(container.querySelector('[role="dialog"]')!.textContent).toBe("공개 안내");
  expect(recordActorPagePublishPrompt).toHaveBeenCalledOnce();
});

it("미리보기를 오가도 미저장값과 선택 정보 펼침 상태를 보존하며 저장을 실행하지 않는다", async () => {
  vi.mocked(getActorPagePreview).mockResolvedValue({ name: "저장된 이름" } as Awaited<ReturnType<typeof getActorPagePreview>>);
  await render();
  await type("NAME", "아직 저장하지 않은 이름");
  const details = container.querySelector<HTMLDetailsElement>(".profile-optional-fields")!;
  details.open = true;
  await act(async () => button("페이지 미리보기").click());
  expect(container.textContent).toContain("아직 저장하지 않은 입력값은 반영되지 않았어요");
  expect(container.textContent).toContain("저장본 미리보기");
  await act(async () => button("정보 입력").click());
  expect(input("NAME").value).toBe("아직 저장하지 않은 이름");
  expect(container.querySelector<HTMLDetailsElement>(".profile-optional-fields")!.open).toBe(true);
  expect(updateApplicantProfile).not.toHaveBeenCalled();
});

it("공개 응답으로 완료 화면을 열고 작성 화면 복귀 시 상위 제목도 복구한다", async () => {
  const completionChanged = vi.fn();
  publication.result = { settings: { status: "PUBLIC", handle: "event.actor" }, profile, failedPhotoIds: [] };
  await act(async () => root.render(<ProfileEditor profile={profile} onSaved={vi.fn()} initialTab="ACTOR_PAGE" onCompletionChange={completionChanged} />));
  await act(async () => button("테스트 공개 응답").click());
  expect(completionChanged).toHaveBeenLastCalledWith(true);
  expect(container.querySelector("#profile-published-title")).not.toBeNull();
  await act(async () => button("나중에 더 채우기 · 작성 화면으로").click());
  expect(completionChanged).toHaveBeenLastCalledWith(false);
  expect(container.querySelector("#profile-section-title")).not.toBeNull();
});
