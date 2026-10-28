import { delay, http, HttpResponse } from "msw";
import type {
  ActorHandleAvailability,
  ActorPageAutoHiddenReason,
  ActorPageField,
  ActorPageMissingField,
  ActorPageSettings,
  ActorPageVisibility,
} from "@/features/actor-pages/settings";
import {
  isActorHandleAddress,
  normalizeActorHandle,
  type ActorCareerGroup,
  type ActorGender,
  type ActorPageContent,
  type PublicActorPage,
} from "@/features/actor-pages/types";
import { PROFILE_CAREER_GENRES } from "@/features/applicants/career-genre";
import { isEducationInformation } from "@/features/applicants/education";
import type { ApplicantAnswerValue, CareerEntry } from "@/features/applicants/types";
import { applicantProfile, clearApplicantPhotoPublicCopies, seedApplicantPhotoVisibility } from "./applicants/store";

/**
 * 목 배우(김하린)의 배우 페이지 설정. 프로필·사진·영상은 지원자 목 저장소를 그대로 읽는다. 목에는 공개 사본이 없어
 * 원본 주소를 사본 대신 붙인다. 시작 상태는 `?mockActorPage=public|locked|unlocked|auto-hidden`으로 고른다.
 */
const CONSENT_VERSION = "actor-page-publish-v1.0";
const RESERVED = new Set(["admin", "administrator", "yesulin", "official", "support", "help", "api", "www", "me", "root", "system", "null", "undefined"]);
const FIELDS: readonly ActorPageField[] = ["education", "careers", "coverLetter", "specialty", "hobbies", "nationality", "links"];
const SEED_PUBLISHED_AT = "2026-10-20T10:00:00+09:00";

type OwnerPage = {
  handle: string | null;
  status: "PRIVATE" | "PUBLIC";
  autoHiddenReason: ActorPageAutoHiddenReason | null;
  lockReason: string | null;
  unlockedAt: string | null;
  firstPublishedAt: string | null;
  publishedAt: string | null;
  fieldVisibilities: Record<ActorPageField, ActorPageVisibility>;
  publishPromptShown: boolean;
};

const visibilities = (value: ActorPageVisibility) =>
  Object.fromEntries(FIELDS.map((field) => [field, value])) as Record<ActorPageField, ActorPageVisibility>;

const fresh = (): OwnerPage => ({
  handle: null,
  status: "PRIVATE",
  autoHiddenReason: null,
  lockReason: null,
  unlockedAt: null,
  firstPublishedAt: null,
  publishedAt: null,
  fieldVisibilities: visibilities("PRIVATE"),
  publishPromptShown: false,
});

const published = (): OwnerPage => ({
  ...fresh(),
  handle: "harin.kim",
  firstPublishedAt: SEED_PUBLISHED_AT,
  publishedAt: SEED_PUBLISHED_AT,
  publishPromptShown: true,
});

const SEEDS: Readonly<Record<string, () => OwnerPage>> = {
  public: () => {
    seedApplicantPhotoVisibility(["seed-photo-1", "seed-photo-3"], true);
    return { ...published(), status: "PUBLIC", fieldVisibilities: { ...visibilities("PUBLIC"), hobbies: "PRIVATE" } };
  },
  locked: () => {
    seedApplicantPhotoVisibility(["seed-photo-1"], false);
    return { ...published(), lockReason: "다른 사람의 사진이라는 문의가 들어와 확인하고 있어요." };
  },
  unlocked: () => {
    seedApplicantPhotoVisibility(["seed-photo-1"], false);
    return { ...published(), unlockedAt: "2026-10-25T10:00:00+09:00" };
  },
  "auto-hidden": () => {
    seedApplicantPhotoVisibility([], false);
    return { ...published(), autoHiddenReason: "MISSING_REQUIRED" };
  },
};

let page: OwnerPage = fresh();
let appliedSeed: string | null = null;

/**
 * MSW 핸들러는 브라우저 페이지에서 실행되므로 지금 열린 주소의 시나리오 값을 읽는다. 프로필 조회와 동시에 나가는 요청이
 * 시드 전 사진 상태를 읽지 않도록 모든 API 요청 앞에서 맞춘다.
 */
function applySeed() {
  const seed = new URLSearchParams(globalThis.location?.search ?? "").get("mockActorPage");
  if (!seed || seed === appliedSeed || !SEEDS[seed]) return;
  page = SEEDS[seed]();
  appliedSeed = seed;
}

const answer = (key: string): ApplicantAnswerValue | undefined =>
  applicantProfile().answers.find((candidate) => candidate.key === key)?.value;
const text = (key: string) => {
  const value = answer(key);
  return typeof value === "string" ? value.trim() : "";
};

function ageOn(birth: string, today = new Date()) {
  const [year, month, day] = birth.split("-").map(Number);
  const beforeBirthday = today.getMonth() + 1 < month! || (today.getMonth() + 1 === month && today.getDate() < day!);
  return today.getFullYear() - year! - (beforeBirthday ? 1 : 0);
}

function readiness(): ActorPageSettings["readiness"] {
  const missing: ActorPageMissingField[] = [];
  if (!page.handle) missing.push("HANDLE");
  if (!text("NAME")) missing.push("NAME");
  if (!text("GENDER")) missing.push("GENDER");
  if (!text("BIRTH")) missing.push("BIRTH_DATE");
  if (!applicantProfile().photoLibrary.some((photo) => photo.visibility === "PUBLIC" && photo.publicCopyUrl)) missing.push("PUBLIC_PHOTO");
  const underAge = Boolean(text("BIRTH")) && ageOn(text("BIRTH")) < 14;
  const locked = page.lockReason !== null;
  return { ready: !missing.length && !underAge && !locked, missing, underAge, locked };
}

/** 서버는 저장할 때 같은 트랜잭션에서 자동 비공개로 바꾸지만, 목은 다음에 읽을 때 맞춘다. */
function synchronize() {
  if (page.status !== "PUBLIC") return;
  const current = readiness();
  const reason = current.underAge ? "UNDER_14" : current.missing.length ? "MISSING_REQUIRED" : null;
  if (!reason) return;
  page = { ...page, status: "PRIVATE", autoHiddenReason: reason };
  clearApplicantPhotoPublicCopies();
}

function settings(): ActorPageSettings {
  synchronize();
  return {
    publicId: page.handle ? "00000000-0000-4000-8000-0000000000aa" : null,
    handle: page.handle,
    handleEditable: page.firstPublishedAt === null,
    status: page.status,
    autoHiddenReason: page.autoHiddenReason,
    locked: page.lockReason !== null,
    lockReason: page.lockReason,
    unlockedAt: page.unlockedAt,
    firstPublishedAt: page.firstPublishedAt,
    publishedAt: page.publishedAt,
    fieldVisibilities: { ...page.fieldVisibilities },
    readiness: readiness(),
    publishPromptShown: page.publishPromptShown,
    consentVersion: CONSENT_VERSION,
    pageRepresentativePhotoId: null,
  };
}

function careerGroups(value: ApplicantAnswerValue | undefined): ActorCareerGroup[] {
  const careers = Array.isArray(value) ? value as readonly CareerEntry[] : [];
  const genres = [...PROFILE_CAREER_GENRES.map((option) => option.value), null];
  return genres.flatMap((genre) => {
    const group = careers.filter((career) => (career.genre ?? null) === genre)
      .sort((left, right) => right.year - left.year)
      .map((career) => ({ year: career.year, title: career.title, roleName: career.part }));
    return group.length ? [{ genre, careers: group }] : [];
  });
}

/** 미리보기는 사본이 없는 공개 사진도 원본으로 보이고, 공개 페이지는 사본이 있는 사진만 보인다. */
function content(previewPhotos: boolean): ActorPageContent {
  const profile = applicantProfile();
  const visible = (field: ActorPageField) => page.fieldVisibilities[field] === "PUBLIC";
  const optional = (field: ActorPageField, key: string) => visible(field) ? text(key) || null : null;
  const measurement = (key: string) => {
    const value = Number(answer(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const birth = text("BIRTH");
  const gender: ActorGender | null = text("GENDER") === "여성" ? "FEMALE" : text("GENDER") === "남성" ? "MALE" : null;
  const school = answer("SCHOOL");
  const links = answer("LINK");
  const photos = profile.photoLibrary
    .filter((photo) => photo.visibility === "PUBLIC" && (previewPhotos || photo.publicCopyUrl))
    .map((photo) => ({ url: photo.publicCopyUrl ?? photo.url }));
  return {
    publicId: page.handle ? "00000000-0000-4000-8000-0000000000aa" : null,
    handle: page.handle,
    name: text("NAME") || null,
    gender,
    birthYear: birth ? Number(birth.slice(0, 4)) : null,
    age: birth ? ageOn(birth) : null,
    height: measurement("HEIGHT"),
    weight: measurement("WEIGHT"),
    representativePhotoUrl: photos[0]?.url ?? null,
    photos,
    videos: profile.videoLibrary.filter((video) => video.visibility === "PUBLIC").map(({ url, youtubeId }) => ({ url, youtubeId })),
    careerGroups: visible("careers") ? careerGroups(answer("CAREER")) : [],
    coverLetter: optional("coverLetter", "COVER_LETTER"),
    specialty: optional("specialty", "SPECIALTY"),
    hobbies: optional("hobbies", "HOBBIES"),
    nationality: optional("nationality", "NATIONALITY"),
    education: visible("education") && isEducationInformation(school) && (school.level || school.school || school.major)
      ? { level: school.level, school: school.school || null, major: school.major || null }
      : null,
    links: visible("links")
      ? (Array.isArray(links) ? links : [links]).filter((url): url is string => typeof url === "string" && Boolean(url.trim())).map((url) => ({ url }))
      : [],
  };
}

/** 목 배우가 공개 중이면 공개 목록·페이지 목에 함께 보인다. */
export function ownerPublicActorPage(): PublicActorPage | null {
  if (settings().status !== "PUBLIC") return null;
  const owner = content(false);
  const { publicId, handle, name, gender, birthYear, age } = owner;
  if (!publicId || !handle || !name || !gender || birthYear === null || age === null) return null;
  return { ...owner, publicId, handle, name, gender, birthYear, age };
}

const apiError = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status });

function handleError(handle: string, isTaken: (handle: string) => boolean) {
  if (!isActorHandleAddress(handle)) return { status: 400, code: "ACTOR_HANDLE_INVALID", reason: "INVALID_FORMAT" } as const;
  if (RESERVED.has(handle)) return { status: 400, code: "ACTOR_HANDLE_RESERVED", reason: "RESERVED" } as const;
  if (isTaken(handle)) return { status: 409, code: "ACTOR_HANDLE_TAKEN", reason: "TAKEN" } as const;
  return null;
}

const BASE = "/api/v1/applicants/me/actor-page";

/** 다른 배우가 쓰는 아이디는 공개 배우 목이 알려 준다. */
export function actorPageOwnerHandlers(isTaken: (handle: string) => boolean) {
  return [
    http.all("/api/*", () => { applySeed(); }),

    http.get(BASE, async () => {
      await delay(160);
      return HttpResponse.json(settings());
    }),

    http.get(`${BASE}/preview`, async () => {
      await delay(180);
      synchronize();
      return HttpResponse.json(content(true));
    }),

    http.get(`${BASE}/handle-availability`, async ({ request }) => {
      await delay(140);
      const handle = normalizeActorHandle(new URL(request.url).searchParams.get("handle") ?? "");
      if (handle === page.handle) return HttpResponse.json({ handle, available: true, reason: null } satisfies ActorHandleAvailability);
      if (page.firstPublishedAt) return HttpResponse.json({ handle, available: false, reason: "LOCKED" } satisfies ActorHandleAvailability);
      const error = handleError(handle, isTaken);
      return HttpResponse.json({ handle, available: !error, reason: error?.reason ?? null } satisfies ActorHandleAvailability);
    }),

    http.put(`${BASE}/handle`, async ({ request }) => {
      await delay(200);
      const handle = normalizeActorHandle(((await request.json()) as { handle?: string }).handle ?? "");
      if (handle === page.handle) return HttpResponse.json(settings());
      const error = handleError(handle, isTaken);
      if (error) return apiError(error.status, error.code, "사용할 수 없는 아이디입니다.");
      if (page.firstPublishedAt) return apiError(409, "ACTOR_HANDLE_LOCKED", "처음 공개한 이후에는 아이디를 직접 변경할 수 없습니다.");
      page = { ...page, handle };
      return HttpResponse.json(settings());
    }),

    http.patch(`${BASE}/visibility`, async ({ request }) => {
      await delay(160);
      const body = (await request.json()) as Partial<Record<ActorPageField, ActorPageVisibility>>;
      const changes = Object.entries(body).filter(([field]) => FIELDS.includes(field as ActorPageField));
      if (changes.some(([, value]) => value !== "PUBLIC" && value !== "PRIVATE")) return apiError(400, "INVALID_REQUEST", "공개 범위가 올바르지 않습니다.");
      page = { ...page, fieldVisibilities: { ...page.fieldVisibilities, ...Object.fromEntries(changes) } };
      return HttpResponse.json(settings());
    }),

    http.put(`${BASE}/publication`, async ({ request }) => {
      await delay(260);
      const body = (await request.json()) as { agreed?: boolean; consentVersion?: string };
      if (!body.agreed || body.consentVersion !== CONSENT_VERSION) return apiError(400, "ACTOR_PAGE_CONSENT_REQUIRED", "현재 버전의 배우 페이지 공개 동의가 필요합니다.");
      const current = readiness();
      if (current.locked) return apiError(409, "ACTOR_PAGE_LOCKED", "운영자가 잠근 배우 페이지는 공개할 수 없습니다.");
      if (current.underAge) return apiError(409, "ACTOR_PAGE_NOT_READY", "만 14세 미만은 배우 페이지를 공개할 수 없습니다.");
      if (current.missing.length) {
        const labels = { HANDLE: "아이디", NAME: "이름", GENDER: "성별", BIRTH_DATE: "생년월일", PUBLIC_PHOTO: "공개 사진" } as const;
        return apiError(409, "ACTOR_PAGE_NOT_READY", `배우 페이지 공개에 필요한 항목을 입력해 주세요: ${current.missing.map((field) => labels[field]).join(", ")}`);
      }
      if (page.status !== "PUBLIC") {
        const now = new Date().toISOString();
        page = { ...page, status: "PUBLIC", autoHiddenReason: null, firstPublishedAt: page.firstPublishedAt ?? now, publishedAt: now };
      }
      return HttpResponse.json(settings());
    }),

    http.delete(`${BASE}/publication`, async () => {
      await delay(200);
      if (page.status === "PUBLIC") clearApplicantPhotoPublicCopies();
      page = { ...page, status: "PRIVATE", autoHiddenReason: null };
      return HttpResponse.json(settings());
    }),

    http.post(`${BASE}/publish-prompt`, async () => {
      await delay(120);
      page = { ...page, publishPromptShown: true };
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}
