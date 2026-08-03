import type { Performance } from "@/features/performance/types";

export const MOCK_PRODUCER_ID = "producer-ninejin";

export const performances: Performance[] = [
  {
    id: "performance-high-life",
    producerId: MOCK_PRODUCER_ID,
    title: "연극 HIGH LIFE",
    description:
      "Lee MacDougall의 희곡 〈HIGH LIFE〉를 정구진 연출로 선보이는 2026년 10월 공연입니다. 전과자와 모르핀 중독자들의 삶에서 영감을 받은 작품으로, 나인진홀 3관에서 한 달간 공연합니다.",
    category: "PLAY",
    thumbnailUrl: "/images/performances/high-life-audition-2026.jpg",
    visibility: "DISPLAYED",
    roles: [
      {
        id: "male-actor",
        name: "남자 배우",
        description: "연극 HIGH LIFE 남자 배역",
        gender: "MALE",
        birthYearMin: 1994,
        birthYearMax: 2004,
        heightMin: null,
        heightMax: null,
        weightMin: null,
        weightMax: null,
        mbti: null,
        qualification: "더블 캐스팅",
      },
      {
        id: "female-actor",
        name: "여자 배우",
        description: "연극 HIGH LIFE 여자 배역",
        gender: "FEMALE",
        birthYearMin: 1994,
        birthYearMax: 2004,
        heightMin: null,
        heightMax: null,
        weightMin: null,
        weightMax: null,
        mbti: null,
        qualification: "더블 캐스팅",
      },
    ],
    statistics: {
      totalRecruitmentCount: 1,
      openRecruitmentCount: 1,
      totalApplicantCount: 1,
    },
    latestRecruitment: {
      id: "show-high-life-2026",
      title: "2026년 10월 공연 배우 오디션",
      status: "OPEN",
      closesAt: "2026-08-09T13:00:00.000Z",
    },
    updatedAt: "2026-07-28T02:00:19.000Z",
  },
  {
    id: "performance-hangover",
    producerId: MOCK_PRODUCER_ID,
    title: "연극 행오버",
    description:
      "코믹 추리 스릴러 연극 〈행오버〉의 2026년 하반기 공연을 함께할 배우를 모집합니다. 이벤트 회사 대표, 변호사, 살인 사건의 피해자, 기억을 읽는 유리병과 방화범까지 다섯 인물의 얽힌 기억과 진실을 다루는 작품입니다.",
    category: "PLAY",
    thumbnailUrl: "/images/performances/hangover-audition-2026.jpg",
    visibility: "DISPLAYED",
    roles: [
      createHangoverRole("jang-taemin", "장태민", "이벤트 회사를 운영하는 장기 매매범", "MALE"),
      createHangoverRole("kang-cheolsu", "강철수", "아내 살해 용의자로 몰린 변호사", "MALE"),
      createHangoverRole("yoo-jiyeon", "유지연", "완벽해 보였던 이벤트의 끝에서 살해된 여자", "FEMALE"),
      createHangoverRole("kay", "케이", "타인의 기억을 읽는 유리병", "MALE"),
      createHangoverRole("emma", "엠마", "자살 시도를 실패한 방화범", "FEMALE"),
    ],
    statistics: {
      totalRecruitmentCount: 1,
      openRecruitmentCount: 1,
      totalApplicantCount: 1,
    },
    latestRecruitment: {
      id: "show-hangover-2026-second-half",
      title: "2026 하반기 배우 오디션",
      status: "OPEN",
      closesAt: "2026-08-03T13:00:00.000Z",
    },
    updatedAt: "2026-04-07T07:03:00.000Z",
  },
];

function createHangoverRole(
  id: string,
  name: string,
  description: string,
  gender: "MALE" | "FEMALE",
) {
  return {
    id,
    name,
    description,
    gender,
    birthYearMin: null,
    birthYearMax: null,
    heightMin: null,
    heightMax: null,
    weightMin: null,
    weightMax: null,
    mbti: null,
    qualification: "20~30대 · 복수 배역 지원 가능",
  };
}
