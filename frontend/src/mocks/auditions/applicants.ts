import type {
  ApplicantPhoto,
  ApplicationId,
  CareerEntry,
  Gender,
  PerformanceId,
  PostingId,
  RoleId,
} from "@/features/auditions/types";
import { applicationId } from "@/features/auditions/types";
import type { CatalogPerformance, CatalogPosting, CatalogRole } from "./catalog";
import { CATALOG } from "./catalog";
import { buildPhotos, SAMPLE_VIDEO_URL } from "./photos";
import { createRandom, AUDITION_SEED } from "./random";
import { buildCoverLetter, buildMotivation, NAMES, PARTS, SCHOOLS, WORKS } from "./text";

/** 목 저장소가 들고 있는 지원서 한 건. 심사 결과는 별도 저장소에서 관리한다. */
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

const random = createRandom(AUDITION_SEED);

/**
 * 실제로는 배역이 명시한 성별·나이 조건을 벗어난 지원자가 섞여 들어온다.
 * (20대 여성을 모집했는데 40대 남성이 지원하는 식). 목 데이터에도 일부러 섞는다.
 */
const MISMATCH_RATE = 0.13;

function drawGender(role: CatalogRole): Gender {
  if (role.gender === "ANY") return random.next() > 0.42 ? "FEMALE" : "MALE";
  if (random.next() < MISMATCH_RATE) return role.gender === "FEMALE" ? "MALE" : "FEMALE";
  return role.gender;
}

function drawAge(role: CatalogRole) {
  if (random.next() < MISMATCH_RATE) return Math.max(19, role.ageMax + 3 + random.int(14));
  return role.ageMin + random.int(role.ageMax - role.ageMin + 1);
}

function drawCareer(): readonly CareerEntry[] {
  return Array.from({ length: 1 + random.int(3) }, () => ({
    year: 2020 + random.int(6),
    title: random.pick(WORKS, WORKS[0]),
    part: random.pick(PARTS, PARTS[0]),
  })).sort((left, right) => right.year - left.year);
}

function buildApplicant(
  index: number,
  performance: CatalogPerformance,
  posting: CatalogPosting,
  role: CatalogRole,
): MockApplicant {
  const name = NAMES[index % NAMES.length] ?? "지원자";
  const gender = drawGender(role);
  const age = drawAge(role);
  const height = gender === "FEMALE" ? 157 + random.int(15) : 169 + random.int(16);
  const paragraphVars = {
    yr: 1 + random.int(9),
    school: random.pick(SCHOOLS, SCHOOLS[0]),
    part: random.pick(PARTS, PARTS[0]),
    roleName: role.name,
    title: performance.title,
  };

  return {
    id: applicationId(`A${101 + index}`),
    name,
    gender,
    age,
    height,
    weight: Math.round(height * 0.32 + random.next() * 9),
    performanceId: performance.id,
    postingId: posting.id,
    roleId: role.id,
    roleName: role.name,
    birth: `${2026 - age}.${String(1 + random.int(12)).padStart(2, "0")}`,
    phone: `010-${String(1000 + random.int(9000))}-${String(1000 + random.int(9000))}`,
    email: `actor${101 + index}@example.com`,
    school: random.pick(SCHOOLS, SCHOOLS[0]),
    submittedAt: `08.${String(11 + random.int(9)).padStart(2, "0")} ${String(9 + random.int(11)).padStart(2, "0")}:${random.pick(["05", "17", "23", "41", "58"] as const, "05")}`,
    career: drawCareer(),
    coverLetter: buildCoverLetter(random, paragraphVars),
    motivation: buildMotivation(random, paragraphVars),
    photos: buildPhotos(name, index, 1 + random.int(4)),
    videoUrl: random.next() > 0.22 ? SAMPLE_VIDEO_URL : null,
  };
}

function buildAll(): readonly MockApplicant[] {
  const result: MockApplicant[] = [];

  for (const performance of CATALOG) {
    for (const posting of performance.postings) {
      for (const role of posting.roles) {
        for (let slot = 0; slot < role.applicantCount; slot += 1) {
          result.push(buildApplicant(result.length, performance, posting, role));
        }
      }
    }
  }

  return result;
}

export const APPLICANTS = buildAll();
