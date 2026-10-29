import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicSubmissionReceipt } from "./public-submission-receipt";

const { data } = vi.hoisted(() => ({ data: { state: { values: {}, receipt: { submissionId: "sample", submittedAt: "2026-10-27T00:00:00Z", profileSaved: true, profileCareerOverflowCount: 2 } }, actions: { requestBack: () => undefined }, meta: { applicationType: "OTR", performanceTitle: "작품", postingTitle: "공고", roleName: "주연" } } }));
vi.mock("./public-application-context", () => ({ usePublicApplication: () => data }));
beforeEach(() => { data.state.receipt.profileSaved = true; data.state.receipt.profileCareerOverflowCount = 2; });

describe("프로필 경력 초과 안내", () => {
  it("프로필 저장이 성공하고 초과한 경력이 있을 때만 수를 안내한다", () => {
    expect(renderToStaticMarkup(<PublicSubmissionReceipt />)).toContain("프로필 경력이 30개라 경력 2개는 프로필에 저장하지 않았어요.");
    data.state.receipt.profileCareerOverflowCount = 0;
    expect(renderToStaticMarkup(<PublicSubmissionReceipt />)).not.toContain("프로필 경력이 30개라");
    data.state.receipt.profileCareerOverflowCount = 2;
    data.state.receipt.profileSaved = false;
    expect(renderToStaticMarkup(<PublicSubmissionReceipt />)).not.toContain("프로필 경력이 30개라");
  });
});
