import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackendProfileResponse } from "@/features/applicants/profile-contract";
import type { ApplicantInformation } from "./submission-v1";
import { saveSubmissionInformationToProfile } from "./submission-profile-save";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/features/applicants/request", () => ({ applicantRequest: request }));
const current: BackendProfileResponse = {
  basicInformation: { name: "배우", height: null, weight: null, birthDate: "2000-01-01", gender: "FEMALE", phone: null, email: null, address: null },
  additionalInformation: { educationLevel: null, school: null, major: null, links: [], nationality: null, coverLetter: null, specialty: null, hobbies: null, militaryServiceStatus: null,
    careers: Array.from({ length: 30 }, (_, index) => ({ year: 2026, title: `작품 ${index}`, roleName: "주연", genre: "THEATER" as const })) },
  completeness: { filled: 3, total: 8 },
};

beforeEach(() => request.mockReset());

describe("프로필 저장 요청", () => {
  it("지원서의 10개를 저장해도 프로필 30개와 장르를 보존하고 새 경력 초과 수를 반환한다", async () => {
    request.mockResolvedValue(current);
    const submitted: ApplicantInformation = { basicInformation: current.basicInformation, additionalInformation: { ...current.additionalInformation,
      careers: [...current.additionalInformation.careers.slice(0, 9).map(({ year, title, roleName }) => ({ year, title, roleName })), { year: 2025, title: "새 작품", roleName: "조연" }] } };
    expect(await saveSubmissionInformationToProfile(submitted)).toEqual({ skippedCareerCount: 1 });
    const body = JSON.parse(request.mock.calls[1]![1].body);
    expect(body.additionalInformation.careers).toEqual(current.additionalInformation.careers);
    expect(body.additionalInformation.careers).toHaveLength(30);
  });

  it("비어 있는 지원서 경력 때문에 기존 프로필 경력을 지우지 않는다", async () => {
    request.mockResolvedValue(current);
    await saveSubmissionInformationToProfile({ basicInformation: current.basicInformation, additionalInformation: { ...current.additionalInformation, careers: [] } });
    expect(JSON.parse(request.mock.calls[1]![1].body).additionalInformation.careers).toEqual(current.additionalInformation.careers);
  });
});
