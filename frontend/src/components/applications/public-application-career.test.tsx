import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { PublicApplicationCareer } from "./public-application-career";

const { data } = vi.hoisted(() => ({ data: { state: { noCareer: false, careers: [] as { id: string; year: string; title: string; part: string }[], fieldErrors: {} }, actions: { updateCareers: vi.fn(), updateNoCareer: vi.fn() }, meta: { profileCareers: undefined as undefined | { year: number; title: string; part: string }[] } } }));
vi.mock("./public-application-context", () => ({ usePublicApplication: () => data }));
const field = { id: "CAREER", required: false } as ApplicationFieldInput;
beforeEach(() => { data.state.careers = []; data.meta.profileCareers = undefined; });

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
