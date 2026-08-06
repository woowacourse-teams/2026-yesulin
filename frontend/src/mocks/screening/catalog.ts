import type { PerformanceId } from "@/features/screening/types";
import { performanceId, postingId } from "@/features/screening/types";
import type { CatalogPerformance } from "./catalog-model";
import { role, template } from "./catalog-model";

export type { CatalogPerformance, CatalogPosting, CatalogRole } from "./catalog-model";

const HIGH_LIFE = performanceId("p1");
const HAMLET_LAWYER = performanceId("p2");
const HANGOVER = performanceId("p3");
const SPEED_SCANDAL = performanceId("p4");
const RUN_TO_FAMILY = performanceId("p5");

export const CATALOG: CatalogPerformance[] = [
  {
    id: HIGH_LIFE,
    posterUrl: "https://otr.co.kr/wp-content/uploads/mangboard/2026/07/27/F251470_%EC%98%A4%EB%94%94%EC%85%98.jpg",
    title: "연극 <HIGH LIFE>",
    venue: "나인진홀 3관",
    roleTemplates: [
      template("p1_t1", "남자 배우", "1994~2004년 출생", "MALE", 22, 32),
      template("p1_t2", "여자 배우", "1994~2004년 출생", "FEMALE", 22, 32),
    ],
    postings: [{
      id: postingId("po1"), performanceId: HIGH_LIFE,
      title: "HIGH LIFE - Audition", deadline: "08.09", status: "OPEN",
      isOpenCall: false, finished: false,
      recruitmentStart: "2026-07-27", recruitmentEnd: "2026-08-09",
      roles: [
        role("po1_r1", "남자 배우", "1994~2004년 출생 · 더블 캐스팅", 2, "MALE", 22, 32, 8),
        role("po1_r2", "여자 배우", "1994~2004년 출생 · 더블 캐스팅", 2, "FEMALE", 22, 32, 8),
      ],
      rounds: [
        { round: 1, name: "1차 서류", date: "2026-08-10", note: "이메일 서류 심사" },
        { round: 2, name: "2차 연기 오디션", date: "2026-08-12", note: "서류 합격자 개별 안내" },
      ],
      applicationGuide: "자유 양식 지원서를 ninejin6485@naver.com으로 제출",
    }],
  },
  {
    id: HAMLET_LAWYER,
    posterUrl: "https://otr.co.kr/wp-content/uploads/mangboard/2026/05/21/F247697_%ED%96%84%EB%A6%BF%EC%9D%98%EB%B3%80%ED%98%B8%EC%82%AC-%EC%98%A4%EB%94%94%EC%85%98-001.jpg",
    title: "연극 <햄릿의 변호사>",
    venue: "나인진홀 2관",
    roleTemplates: [template("p2_t1", "햄릿", "남 · 20대 후반~40대 초반", "MALE", 27, 43)],
    postings: [{
      id: postingId("po3"), performanceId: HAMLET_LAWYER,
      title: "햄릿 역 오디션", deadline: "2026.05.31", status: "CLOSED",
      isOpenCall: false, finished: true,
      recruitmentStart: "2026-05-21", recruitmentEnd: "2026-05-31",
      roles: [role("po3_r1", "햄릿", "남 · 20대 후반~40대 초반", 1, "MALE", 27, 43, 12)],
      rounds: [
        { round: 1, name: "1차 서류", date: "2026-06-01", note: "22시 이전 이메일 발표" },
        { round: 2, name: "2차 대면 오디션", date: "2026-06-04", note: "자유연기 및 지정연기" },
      ],
      applicationGuide: "지정 양식 지원서를 이메일로 제출",
    }],
  },
  {
    id: HANGOVER,
    posterUrl: "https://otr.co.kr/wp-content/uploads/mangboard/2026/04/07/F245141_KakaoTalk_20260407_155335541.jpg",
    title: "연극 <행오버>",
    venue: "대학로 정극장",
    roleTemplates: [template("p3_t1", "전체 지원자", "배역 구분 없이 지원", "ANY", 20, 55)],
    postings: [{
      id: postingId("po5"), performanceId: HANGOVER,
      title: "2026 하반기 팀 오디션", deadline: "09.19", status: "OPEN",
      isOpenCall: true, finished: false,
      recruitmentStart: "2026-08-07", recruitmentEnd: "2026-09-19",
      roles: [role("po5_r1", "전체 지원자", "배역 구분 없이 지원", 6, "ANY", 20, 55, 15)],
      rounds: [
        { round: 1, name: "1차 서류", date: "2026-09-20", note: "15시 이전 합격자 발표" },
        { round: 2, name: "2차 실기 오디션", date: "2026-09-23", note: "지정연기 및 1분 자유연기" },
      ],
      applicationGuide: "지정 지원서를 작성해 이메일로 온라인 지원",
    }],
  },
  {
    id: SPEED_SCANDAL,
    posterUrl: "https://otr.co.kr/wp-content/uploads/mangboard/2025/10/01/F234471_%EA%B3%BC%EC%86%8D%EC%8A%A4%EC%BA%94%EB%93%A4_%EC%98%A4%EB%94%94%EC%85%98_2026.jpg",
    title: "연극 <과속스캔들>",
    venue: "나인진홀 2관",
    roleTemplates: familyTemplates("p4"),
    postings: [familyPosting({ performanceId: SPEED_SCANDAL, posting: "po4", title: "2026년 상반기 팀 오디션", start: "2025-10-02", end: "2025-10-17", firstRound: "2025-10-19", secondRound: "2025-10-21", applicants: [3, 2, 3, 2, 2, 3] })],
  },
  {
    id: RUN_TO_FAMILY,
    posterUrl: "https://otr.co.kr/wp-content/uploads/mangboard/2025/04/02/F223131_KakaoTalk_20250402_105103959.jpg",
    title: "연극 <런투패밀리>",
    venue: "대학로 나인진홀 2관",
    roleTemplates: familyTemplates("p5"),
    postings: [familyPosting({ performanceId: RUN_TO_FAMILY, posting: "po2", title: "2025년 하반기 팀 오디션", start: "2025-04-01", end: "2025-04-17", firstRound: "2025-04-19", secondRound: "2025-04-22", applicants: [3, 2, 3, 2, 2, 3] })],
  },
];

function familyTemplates(prefix: string) {
  return [
    template(`${prefix}_t1`, "이재준", "남 · 30대 중후반", "MALE", 34, 39),
    template(`${prefix}_t2`, "신혜선", "여 · 30대 초중반", "FEMALE", 30, 36),
    template(`${prefix}_t3`, "강미래", "여 · 20대 중후반", "FEMALE", 24, 29),
    template(`${prefix}_t4`, "정명수", "남 · 30대 중후반", "MALE", 34, 39),
    template(`${prefix}_t5`, "이기자", "남 · 30대", "MALE", 30, 39),
    template(`${prefix}_t6`, "맥스", "남 · 20대 초중반", "MALE", 20, 26),
  ];
}

function familyPosting({ performanceId, posting, title, start, end, firstRound, secondRound, applicants }: {
  performanceId: PerformanceId; posting: string; title: string;
  start: string; end: string; firstRound: string; secondRound: string; applicants: readonly number[];
}) {
  const names = ["이재준", "신혜선", "강미래", "정명수", "이기자", "맥스"] as const;
  const genders = ["MALE", "FEMALE", "FEMALE", "MALE", "MALE", "MALE"] as const;
  const ages = [[34, 39], [30, 36], [24, 29], [34, 39], [30, 39], [20, 26]] as const;
  return {
    id: postingId(posting), performanceId, title, deadline: end.replace("-", ".").replace("-", "."),
    status: "CLOSED" as const, isOpenCall: false, finished: true, recruitmentStart: start, recruitmentEnd: end,
    roles: names.map((name, index) => role(`${posting}_r${index + 1}`, name, `${genders[index] === "FEMALE" ? "여" : "남"} · 배우 모집`, 1, genders[index], ages[index][0], ages[index][1], applicants[index] ?? 2)),
    rounds: [
      { round: 1 as const, name: "1차 서류", date: firstRound, note: "이메일 서류 심사" },
      { round: 2 as const, name: "2차 연기 오디션", date: secondRound, note: "지정연기 및 자유연기" },
    ],
    applicationGuide: "지정 지원서와 최근 사진을 이메일로 제출",
  };
}

export const ROUND_NAMES = { 1: "1차 서류", 2: "2차 오디션", 3: "3차 최종" } as const;
