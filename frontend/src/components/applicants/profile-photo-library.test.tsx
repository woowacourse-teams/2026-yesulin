// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import { moveApplicantProfilePhoto, changeApplicantProfilePhotoVisibility, prepareApplicantPhotoPublicCopies } from "@/features/applicants/profile-photo-api";
import { ProfilePhotoLibrary } from "./profile-photo-library";
vi.mock("@/components/auditions/toast", () => ({ useToast: () => vi.fn() }));
vi.mock("@/features/applicants/profile-photo-api", () => ({ moveApplicantProfilePhoto: vi.fn(), changeApplicantProfilePhotoVisibility: vi.fn(), prepareApplicantPhotoPublicCopies: vi.fn(), addApplicantProfilePhotos: vi.fn(), deleteApplicantProfilePhoto: vi.fn(), makeApplicantProfilePhotoRepresentative: vi.fn() }));
const profile: ApplicantProfileResponse = {
  answers: [], videoLibrary: [], completeness: { filled: 0, standardTotal: 8 },
  photoLibrary: [1, 2, 3].map((id) => ({ id: String(id), name: `사진${id}`, url: `/photo${id}.jpg`, representative: id === 1, visibility: id === 1 ? "PRIVATE" : "PUBLIC", publicCopyUrl: id === 1 ? null : `/copy${id}.jpg` })),
};
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  vi.mocked(moveApplicantProfilePhoto).mockImplementation(async (current, index, target) => {
    const photos = [...current.photoLibrary]; const [photo] = photos.splice(index, 1); photos.splice(target, 0, photo);
    return { ...current, photoLibrary: photos.map((photo, i) => ({ ...photo, representative: i === 0 })) };
  });
  vi.mocked(changeApplicantProfilePhotoVisibility).mockImplementation(async (current, id, visibility) => ({ ...current, photoLibrary: current.photoLibrary.map((photo) => photo.id === id ? { ...photo, visibility } : photo) }));
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function render(options: { pagePublic?: boolean; profile?: ApplicantProfileResponse } = {}) {
  function Workspace() {
    const [current, setCurrent] = useState(options.profile ?? profile);
    return <ProfilePhotoLibrary profile={current} onSaved={setCurrent} pagePublic={options.pagePublic} onContinue={vi.fn()} />;
  }
  await act(async () => root.render(<Workspace />));
}
function labelled(label: string) { return container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!; }
function ids() { return [...container.querySelectorAll<HTMLImageElement>("article img")].map((image) => image.alt); }

it("페이지 대표를 같은 화면의 첫 공개 사진 위치로 옮기며 비공개 사진을 공개하지 않는다", async () => {
  await render();
  expect(labelled("사진1 페이지 대표로 지정")).toBeNull();
  await act(async () => labelled("사진3 페이지 대표로 지정").click());
  expect(moveApplicantProfilePhoto).toHaveBeenCalledExactlyOnceWith(expect.anything(), 2, 1);
  expect(ids()).toEqual(["사진1", "사진3", "사진2"]);
  expect(changeApplicantProfilePhotoVisibility).not.toHaveBeenCalled();
  expect(container.querySelector('article:has(img[alt="사진3"])')!.textContent).toContain("페이지 대표");
});

it("앞뒤 이동은 경계에서 막고 요청 중 연속 조작을 막은 뒤 성공 응답을 반영한다", async () => {
  let complete!: (value: ApplicantProfileResponse) => void;
  vi.mocked(moveApplicantProfilePhoto).mockImplementationOnce(() => new Promise((resolve) => { complete = resolve; }));
  await render();
  expect(labelled("사진1 앞으로 이동").disabled).toBe(true);
  expect(labelled("사진3 뒤로 이동").disabled).toBe(true);
  const move = labelled("사진3 앞으로 이동");
  await act(async () => { move.click(); move.click(); });
  expect(moveApplicantProfilePhoto).toHaveBeenCalledOnce();
  expect(labelled("사진2 앞으로 이동").disabled).toBe(true);
  await act(async () => complete({ ...profile, photoLibrary: [profile.photoLibrary[0], profile.photoLibrary[2], profile.photoLibrary[1]] }));
  expect(ids()).toEqual(["사진1", "사진3", "사진2"]);
});

it("이동 실패 시 순서·대표를 유지하고 다시 시도할 수 있다", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(moveApplicantProfilePhoto).mockRejectedValueOnce(new Error("다시 시도해 주세요."));
  await render();
  await act(async () => labelled("사진3 앞으로 이동").click());
  expect(ids()).toEqual(["사진1", "사진2", "사진3"]);
  expect(container.textContent).toContain("다시 시도해 주세요.");
  await act(async () => labelled("사진3 앞으로 이동").click());
  expect(ids()).toEqual(["사진1", "사진3", "사진2"]);
});

it("공개 중인데 사본 생성에 실패한 사진은 대표로 지정할 수 없고 기존 실제 대표를 표시한다", async () => {
  const current = { ...profile, photoLibrary: profile.photoLibrary.map((photo) => photo.id === "2" ? { ...photo, publicCopyUrl: null } : photo) };
  await render({ pagePublic: true, profile: current });
  expect(labelled("사진2 페이지 대표로 지정").disabled).toBe(true);
  expect(container.querySelector('article:has(img[alt="사진3"])')!.textContent).toContain("페이지 대표");
});

it("공개 중 사진 사본 생성 실패에도 저장된 공개 범위를 유지하고 재시도로 복구한다", async () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(prepareApplicantPhotoPublicCopies).mockImplementationOnce(async (current) => ({ profile: current, failedPhotoIds: ["1"] }));
  await render({ pagePublic: true });
  await act(async () => labelled("사진1 페이지 공개").click());
  expect(labelled("사진1 페이지 공개").getAttribute("aria-checked")).toBe("true");
  expect(container.textContent).toContain("사진을 페이지에 올리지 못했어요");
  vi.mocked(prepareApplicantPhotoPublicCopies).mockImplementationOnce(async (current) => ({ profile: { ...current, photoLibrary: current.photoLibrary.map((photo) => ({ ...photo, publicCopyUrl: photo.url })) }, failedPhotoIds: [] }));
  const retry = [...container.querySelectorAll("button")].find((button) => button.textContent === "다시 시도")!;
  await act(async () => retry.click());
  expect(prepareApplicantPhotoPublicCopies).toHaveBeenCalledTimes(2);
  expect(container.textContent).not.toContain("페이지에 아직 올라가지 않았어요");
});
it("비공개 사진만 있으면 다음을 막고 공개 선택 후 이동을 허용한다", async () => {
  await render({ profile: { ...profile, photoLibrary: [profile.photoLibrary[0]] } });
  const next = () => [...container.querySelectorAll("button")].find((button) => button.textContent === "다음: 페이지 공개")!;
  expect(next().disabled).toBe(true);
  await act(async () => labelled("사진1 페이지 공개").click());
  expect(next().disabled).toBe(false);
  expect(prepareApplicantPhotoPublicCopies).not.toHaveBeenCalled();
});
