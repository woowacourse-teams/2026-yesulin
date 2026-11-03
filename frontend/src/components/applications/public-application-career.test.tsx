// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { PublicApplicationCareer } from "./public-application-career";

const { data } = vi.hoisted(() => ({ data: { state: { noCareer: false, careers: [] as { id: string; year: string; title: string; part: string }[], fieldErrors: {} as Record<string, string> }, actions: { updateCareers: vi.fn(), updateNoCareer: vi.fn() }, meta: { profileCareers: undefined as undefined | { year: number; title: string; part: string }[] } } }));
vi.mock("./public-application-context", () => ({ usePublicApplication: () => data }));
const field = { id: "CAREER", required: false } as ApplicationFieldInput;
beforeEach(() => { data.state.careers = []; data.state.fieldErrors = {}; data.meta.profileCareers = undefined; });

describe("프로필 교체 목록 표시", () => {
  it("저장된 지원서 경력만 있고 prefill이 없으면 교체 목록을 숨긴다", () => {
    data.state.careers = [{ id: "restored", year: "2026", title: "저장된 작품", part: "배역" }];
    expect(renderToStaticMarkup(<PublicApplicationCareer field={field} />)).not.toContain("프로필 경력에서 추가");
  });

  it("숫자 연도로 같은 경력을 제외하고 10개일 때 추가 버튼을 비활성화한다", () => {
    data.state.careers = Array.from({ length: 10 }, (_, index) => ({ id: String(index), year: "2026", title: `작품 ${index}`, part: "배역" }));
    data.meta.profileCareers = [{ year: 2026, title: " 작품 0 ", part: "배역" }, { year: 2025, title: "선택 후보", part: "주연" }];
    const html = renderToStaticMarkup(<PublicApplicationCareer field={field} />);
    expect(html).toContain("프로필 경력에서 추가");
    expect(html).not.toContain(" 작품 0 ");
    expect(html).toContain("선택 후보");
    expect(html).toMatch(/<button[^>]*disabled=""/);
  });
});

it.each([
  ["title", { title: "", part: "주연", year: "2026" }, "작품명을 입력해 주세요."],
  ["part", { title: "작품", part: "", year: "2026" }, "맡은 배역을 입력해 주세요."],
  ["year", { title: "작품", part: "주연", year: "26" }, "연도를 네 자리로 입력해 주세요."],
  ["month", { title: "작품", part: "주연", year: "2026" }, "월을 선택해 주세요."],
])("경력 오류는 삭제 버튼 대신 잘못된 %s 입력칸을 표시한다", (fieldName, career, message) => {
  data.state.careers = [{ id: "invalid", ...career }];
  data.state.fieldErrors = { "CAREER-invalid": "경력을 확인해 주세요." };
  const root = document.createElement("div");
  root.innerHTML = renderToStaticMarkup(<PublicApplicationCareer field={field} />);
  const card = root.querySelector("#application-field-CAREER-invalid")!;
  const invalidControls = card.querySelectorAll('[aria-invalid="true"]');
  expect(invalidControls).toHaveLength(1);
  expect(invalidControls[0]!.id).toBe(`CAREER-invalid-${fieldName}`);
  const descriptionId = invalidControls[0]!.getAttribute("aria-describedby")!;
  expect(root.querySelector(`#${descriptionId}`)?.textContent).toContain(message);
});
