import type {
  ApplicantPhoto,
  ApplicationId,
  CareerEntry,
  Gender,
  PerformanceId,
  PostingId,
  RoleId,
} from "@/features/auditions/types";

/** MSW 저장소가 들고 있는 지원서 한 건. 심사 결과는 별도 저장소에서 관리한다. */
export type MockApplicant = {
  readonly id: ApplicationId;
  readonly name: string;
  readonly gender: Gender;
  readonly age: number;
  readonly height: number;
  readonly weight: number;
  readonly performanceId: PerformanceId;
  readonly postingId: PostingId;
  readonly roleId: RoleId;
  readonly roleName: string;
  readonly birth: string;
  readonly phone: string;
  readonly email: string;
  readonly school: string;
  readonly submittedAt: string;
  readonly career: readonly CareerEntry[];
  readonly coverLetter: string;
  readonly motivation: string;
  readonly photos: readonly ApplicantPhoto[];
  readonly videoUrl: string | null;
};

/** 초기 지원자는 없고, 현재 세션에서 제출된 지원서만 저장소에 추가된다. */
export const APPLICANTS: readonly MockApplicant[] = [];
