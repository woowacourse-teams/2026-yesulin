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
  readonly roleIds: readonly RoleId[];
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

/** 정책 기반 심사 화면을 확인할 수 있는 제출 스냅샷 1건. */
export const APPLICANTS: readonly MockApplicant[] = [{
  id: 26081201 as ApplicationId,
  name: "김하린",
  gender: "FEMALE",
  age: 27,
  height: 166,
  weight: 52,
  performanceId: "seed_performance_1" as PerformanceId,
  postingId: "seed_posting_1" as PostingId,
  roleId: "seed_role_seoyeon" as RoleId,
  roleIds: ["seed_role_seoyeon" as RoleId, "seed_role_jiwoo" as RoleId],
  roleName: "서연 · 지우",
  birth: "1999.04",
  phone: "010-2468-1357",
  email: "harin.kim@example.com",
  school: "한국예술종합학교 연극원",
  submittedAt: "2026-08-12T10:30:00+09:00",
  career: [{ year: 2025, title: "푸른 방", part: "윤서" }],
  coverLetter: "인물의 작은 선택이 장면 전체의 온도를 바꾼다고 믿습니다. 상대 배우의 호흡을 세심하게 듣고, 반복되는 연습에서도 새로운 반응을 발견하는 배우 김하린입니다.",
  motivation: "달빛 아래 우리가 다루는 관계의 회복과 성장에 깊이 공감해 지원했습니다.",
  photos: [{ label: "프로필 사진", url: "/images/performances/high-life-audition-2026.jpg", fallbackUrl: "/images/performances/high-life-audition-2026.jpg" }],
  videoUrl: "https://youtu.be/dQw4w9WgXcQ",
}];
