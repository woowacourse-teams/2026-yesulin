import type {
  ApplicantPhoto,
  ApplicationId,
  CareerEntry,
  Gender,
  PerformanceId,
  PostingId,
  RoleId,
  ReviewStatus,
  RoundNumber,
} from "@/features/auditions/types";
import { applicationId, performanceId, postingId, roleId } from "@/features/auditions/types";
import { fallbackPhoto } from "./photos";

/** MSW 저장소가 들고 있는 지원서 한 건. 심사 결과는 별도 저장소에서 관리한다. */
export type MockApplicant = {
  readonly id: ApplicationId;
  readonly name: string;
  readonly gender: Gender;
  readonly age: number;
  readonly height: number | null;
  readonly weight: number | null;
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
const PRIMARY_APPLICANT: MockApplicant = {
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
  photos: [
    { label: "프로필 사진", url: "/images/applicants/kim-harin-profile.png", fallbackUrl: "/images/applicants/kim-harin-profile.png" },
    { label: "전신 사진", url: "/images/applicants/kim-harin-full-body.png", fallbackUrl: "/images/applicants/kim-harin-full-body.png" },
    { label: "연기 이미지 1", url: "/images/applicants/kim-harin-acting-1.png", fallbackUrl: "/images/applicants/kim-harin-acting-1.png" },
    { label: "연기 이미지 2", url: "/images/applicants/kim-harin-acting-2.png", fallbackUrl: "/images/applicants/kim-harin-acting-2.png" },
  ],
  videoUrl: "https://youtu.be/aqz-KE-bpKQ",
};

function scenarioApplicant({ id, name, posting, role, index }: {
  readonly id: number;
  readonly name: string;
  readonly posting: string;
  readonly role: string;
  readonly index: number;
}): MockApplicant {
  const photo = fallbackPhoto(name, index);
  return {
    id: applicationId(id),
    name,
    gender: index % 2 === 0 ? "FEMALE" : "MALE",
    age: 23 + index,
    height: index === 3 ? null : 160 + index * 3,
    weight: 49 + index * 2,
    performanceId: performanceId("seed_performance_1"),
    postingId: postingId(posting),
    roleId: roleId(role),
    roleIds: [roleId(role)],
    roleName: role === "seed_role_round_2" ? "민재" : "하윤",
    birth: `200${index}.0${Math.min(index + 1, 9)}`,
    phone: `010-3000-${String(1000 + index).padStart(4, "0")}`,
    email: `scenario${id}@example.com`,
    school: index % 2 === 0 ? "한국예술종합학교 연극원" : "서울예술대학교 공연학부",
    submittedAt: `2026-08-${String(13 + index).padStart(2, "0")}T10:30:00+09:00`,
    career: [{ year: 2025, title: `시나리오 작품 ${index + 1}`, part: "앙상블" }],
    coverLetter: "여러 차수의 심사 흐름과 목록 상태를 검증하기 위한 시나리오 지원자입니다.",
    motivation: "작품과 배역의 방향에 공감해 지원했습니다.",
    photos: [{ label: "프로필 사진", url: photo, fallbackUrl: photo }],
    videoUrl: index % 2 === 0 ? "https://youtu.be/aqz-KE-bpKQ" : null,
  };
}

const ROUND_TWO_APPLICANTS = ["이도윤", "박서진", "최유나", "정현우"].map((name, index) =>
  scenarioApplicant({ id: 26082001 + index, name, posting: "seed_posting_round_2", role: "seed_role_round_2", index }),
);

const ROUND_THREE_APPLICANTS = ["한지민", "윤가은", "송도현", "임수아", "강태오"].map((name, index) =>
  scenarioApplicant({ id: 26083001 + index, name, posting: "seed_posting_round_3", role: "seed_role_round_3", index }),
);

export const APPLICANTS: readonly MockApplicant[] = [PRIMARY_APPLICANT, ...ROUND_TWO_APPLICANTS, ...ROUND_THREE_APPLICANTS];

export type ScreeningStateSeed = {
  readonly roleId: RoleId;
  readonly closedRounds: readonly RoundNumber[];
  readonly reviews: readonly {
    readonly applicationId: ApplicationId;
    readonly round: RoundNumber;
    readonly status: ReviewStatus;
    readonly note?: string;
  }[];
};

const reviewSeeds = (applicants: readonly MockApplicant[], round: RoundNumber, statuses: readonly ReviewStatus[]) =>
  applicants.map((applicant, index) => ({ applicationId: applicant.id, round, status: statuses[index] ?? "PENDING" }));

/** 새로고침 직후에도 2·3차 진행 화면으로 바로 진입하기 위한 결정적 초기 상태. */
export const SCREENING_STATE_SEEDS: readonly ScreeningStateSeed[] = [{
  roleId: roleId("seed_role_round_2"),
  closedRounds: [1],
  reviews: [
    ...reviewSeeds(ROUND_TWO_APPLICANTS, 1, ["PASS", "PASS", "PASS", "FAIL"]),
    ...reviewSeeds(ROUND_TWO_APPLICANTS.slice(0, 3), 2, ["PASS", "PENDING", "PENDING"]),
  ],
}, {
  roleId: roleId("seed_role_round_3"),
  closedRounds: [1, 2],
  reviews: [
    ...reviewSeeds(ROUND_THREE_APPLICANTS, 1, ["PASS", "PASS", "PASS", "PASS", "FAIL"]),
    ...reviewSeeds(ROUND_THREE_APPLICANTS.slice(0, 4), 2, ["PASS", "PASS", "FAIL", "PASS"]),
    ...reviewSeeds([ROUND_THREE_APPLICANTS[0]!, ROUND_THREE_APPLICANTS[1]!, ROUND_THREE_APPLICANTS[3]!], 3, ["PENDING", "PASS", "PENDING"]),
  ],
}];
