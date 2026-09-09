import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "@/features/auditions/api-client";
import type { PublicAuditionResource } from "@/features/auditions/backend-resources";
import { getV1PublicPosting } from "./public-audition-v1";

vi.mock("@/features/auditions/api-client", () => ({ request: vi.fn() }));

const resource: PublicAuditionResource = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  postingSnapshotVersion: "v1.server-issued-snapshot",
  performanceTitle: "햄릿",
  title: "햄릿 오디션",
  posterUrl: "https://example.com/poster.jpg",
  roadAddress: "",
  rehearsalVenue: null,
  rehearsalVenueAddress: null,
  producer: { companyName: "테스트 극단", description: null },
  performanceStartDate: "2026-10-01",
  performanceEndDate: "2026-10-31",
  recruitmentStartAt: "2026-09-01T00:00:00Z",
  recruitmentEndAt: "2026-09-30T00:00:00Z",
  multipleRoleApplicationsAllowed: false,
  roles: [],
  stages: [],
  applicationForm: {
    auditionId: "123e4567-e89b-12d3-a456-426614174000",
    basicFields: [],
    additionalFields: [],
    photoRequirements: [],
    videoRequirements: [],
    additionalQuestions: [],
  },
};

describe("getV1PublicPosting", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("백엔드가 반환한 기획사/제작사명을 사용한다", async () => {
    vi.mocked(request).mockResolvedValue(resource);

    const posting = await getV1PublicPosting(resource.id);

    expect(posting.companyName).toBe("테스트 극단");
    expect(posting.postingSnapshotVersion).toBe("v1.server-issued-snapshot");
  });

  it("기획사/제작사명이 비어 있으면 동의 화면을 만들지 않는다", async () => {
    vi.mocked(request).mockResolvedValue({
      ...resource,
      producer: { ...resource.producer, companyName: "   " },
    });

    await expect(getV1PublicPosting(resource.id)).rejects.toThrow(
      "공고의 기획사/제작사 정보가 비어 있습니다.",
    );
  });
});
