import { beforeEach, describe, expect, it, vi } from "vitest";
import { request } from "@/features/auditions/api-client";
import {
  readPublicApplicationSubmissionAttempt,
  savePublicApplicationSubmissionAttempt,
  type PublicApplicationSubmissionAttempt,
} from "./public-application-draft-store";
import { createV1Submission, type V1SubmissionInput } from "./submission-v1";

vi.mock("@/features/auditions/api-client", () => ({ request: vi.fn() }));
vi.mock("./public-application-draft-store", () => ({
  readPublicApplicationSubmissionAttempt: vi.fn(),
  savePublicApplicationSubmissionAttempt: vi.fn(),
}));

const input: V1SubmissionInput = {
  auditionId: "123e4567-e89b-12d3-a456-426614174000",
  fields: [],
  values: {},
  photos: [],
  videoUrl: "",
  careers: [],
  noCareer: false,
  roleIds: ["1"],
  privacyConsent: true,
  thirdPartyConsent: true,
};

describe("createV1Submission", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(request).mockResolvedValue({ submissionId: "123e4567-e89b-12d3-a456-426614174001" });
  });

  it("실패 후 같은 제출을 재시도하면 저장한 멱등 키와 요청 본문을 재사용한다", async () => {
    let savedAttempt: PublicApplicationSubmissionAttempt | undefined;
    vi.mocked(readPublicApplicationSubmissionAttempt).mockImplementation(async () => savedAttempt);
    vi.mocked(savePublicApplicationSubmissionAttempt).mockImplementation(async (attempt) => {
      savedAttempt = attempt;
    });

    await createV1Submission(input);
    await createV1Submission(input);

    expect(savePublicApplicationSubmissionAttempt).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledTimes(2);
    expect(savedAttempt?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
    const firstInit = vi.mocked(request).mock.calls[0]?.[1];
    const secondInit = vi.mocked(request).mock.calls[1]?.[1];
    expect(firstInit?.headers).toEqual(secondInit?.headers);
    expect(firstInit?.body).toBe(secondInit?.body);
  });

  it("지원서 내용이 바뀌면 새로운 멱등 키와 요청 본문을 저장한다", async () => {
    let savedAttempt: PublicApplicationSubmissionAttempt | undefined;
    vi.mocked(readPublicApplicationSubmissionAttempt).mockImplementation(async () => savedAttempt);
    vi.mocked(savePublicApplicationSubmissionAttempt).mockImplementation(async (attempt) => {
      savedAttempt = attempt;
    });

    await createV1Submission(input);
    const firstAttempt = savedAttempt;
    await createV1Submission({ ...input, roleIds: ["2"] });
    const secondAttempt = savedAttempt;

    expect(savePublicApplicationSubmissionAttempt).toHaveBeenCalledTimes(2);
    expect(firstAttempt?.idempotencyKey).not.toBe(secondAttempt?.idempotencyKey);
    expect(firstAttempt?.requestBody).not.toBe(secondAttempt?.requestBody);
  });
});
