import { applicationId, roleId, type ApplicationId } from "@/features/auditions/types";
import type {
  ApplicantAnswer,
  ApplicantApplicationDetail,
  ApplicantApplicationSummary,
  ApplicantProfileResponse,
  ApplicantProfilePhoto,
  ApplicantProfileVideo,
  LookupApplicationResponse,
  RecommendedPosting,
  UpdateApplicationRequest,
  UpdateProfileRequest,
} from "@/features/applicants/types";
import { CATALOG } from "@/mocks/auditions/catalog";
import { screeningFlowApplicationFixture } from "@/mocks/auditions/application-field-fixtures";
import { producerProfile } from "@/mocks/auditions/producer-profile";
import { isRoundClosed, readReview, roundNumbersForRole } from "@/mocks/auditions/store";

const seededAnswers: ApplicantAnswer[] = [
  { key: "NAME", label: "이름", value: "김하린" },
  { key: "PHONE", label: "연락처", value: "010-2468-1357" },
  { key: "EMAIL", label: "이메일", value: "harin.kim@example.com" },
  { key: "ADDRESS", label: "거주지", value: "서울특별시 마포구" },
  { key: "BIRTH", label: "생년월일", value: "1999-04-18" },
  { key: "GENDER", label: "성별", value: "여성" },
  { key: "BODY", label: "키·몸무게", value: { height: 166, weight: 52 } },
  { key: "SCHOOL", label: "학력", value: "한국예술종합학교 연극원 연기과" },
  { key: "CAREER", label: "경력", value: [{ year: 2025, title: "푸른 방", part: "윤서" }] },
  { key: "LINK", label: "SNS / 외부 링크", value: "https://example.com/harin" },
  { key: "NATIONALITY", label: "국적", value: "대한민국" },
  { key: "COVER_LETTER", label: "자기소개", value: "인물의 작은 선택이 장면 전체의 온도를 바꾼다고 믿습니다. 상대 배우의 호흡을 세심하게 듣고 반복되는 연습에서도 새로운 반응을 발견하는 배우 김하린입니다." },
  { key: "SPECIALTY", label: "특기", value: "현대무용, 검술" },
  { key: "HOBBIES", label: "취미", value: "러닝, 독립영화 감상" },
  { key: "MILITARY", label: "군필 여부", value: "해당 없음" },
  { key: "PHOTOS", label: "프로필 사진", value: ["seed-photo-1", "seed-photo-2", "seed-photo-3", "seed-photo-4"], previewUrls: ["/images/applicants/kim-harin-profile.png", "/images/applicants/kim-harin-full-body.png", "/images/applicants/kim-harin-acting-1.png", "/images/applicants/kim-harin-acting-2.png"] },
  { key: "VIDEO", label: "영상 링크", value: ["https://youtu.be/aqz-KE-bpKQ"] },
  { key: "MOTIVATION", label: "이 작품에 지원한 동기를 적어 주세요.", value: "달빛 아래 우리가 다루는 관계의 회복과 성장에 깊이 공감해 지원했습니다." },
];
const reusableKeys = new Set(["NAME", "BODY", "BIRTH", "GENDER", "PHONE", "EMAIL", "ADDRESS", "SCHOOL", "CAREER", "LINK", "NATIONALITY", "COVER_LETTER", "SPECIALTY", "HOBBIES", "MILITARY"]);
let profileAnswers: ApplicantAnswer[] = seededAnswers.filter((answer) => reusableKeys.has(answer.key));
let photoLibrary: ApplicantProfilePhoto[] = [{ id: "seed-photo-1", name: "김하린 프로필.jpg", url: "/images/applicants/kim-harin-profile.png", representative: true }];
let videoLibrary: ApplicantProfileVideo[] = [{ id: "seed-video-1", url: "https://youtu.be/aqz-KE-bpKQ", youtubeId: "aqz-KE-bpKQ" }];
let applications: ApplicantApplicationDetail[] = [{
  id: applicationId(26081201), postingId: "seed_posting_1", performanceTitle: "달빛 아래 우리", postingTitle: "2026 하반기 주·조연 배우 모집",
  posterUrl: "/images/performances/moonlight.jpg", companyName: "예술in 스테이지", roleId: "seed_role_seoyeon", roleIds: ["seed_role_seoyeon", "seed_role_jiwoo"], roleName: "서연 · 지우",
  lookupCode: "YS-20260812-SEED01", submittedAt: "2026-08-12T10:30:00+09:00", updatedAt: "2026-08-12T10:30:00+09:00",
  editable: false, recruitmentEnd: "2026-09-30", editableUntil: "", roleProgress: [], answers: seededAnswers, applicationFields: screeningFlowApplicationFixture(),
}];
const ownedApplicationIds = new Set<ApplicationId>(applications.map((application) => application.id));
const claims = new Map<string, { readonly applicationId: ApplicationId; readonly expiresAt: string; used: boolean }>();

const clone = <T>(value: T): T => structuredClone(value);

export function applicantProfile(): ApplicantProfileResponse {
  const answer = (key: string) => profileAnswers.find((candidate) => candidate.key === key)?.value;
  const body = answer("BODY");
  const basicValues = [answer("NAME"), typeof body === "object" && body !== null && "height" in body ? body.height : undefined, typeof body === "object" && body !== null && "weight" in body ? body.weight : undefined, answer("BIRTH"), answer("GENDER"), answer("PHONE"), answer("EMAIL"), answer("ADDRESS")];
  const filled = basicValues.filter((value) => typeof value === "number" ? value > 0 : typeof value === "string" && value.trim().length > 0).length;
  return { answers: clone(profileAnswers), photoLibrary: clone(photoLibrary), videoLibrary: clone(videoLibrary), completeness: { filled, standardTotal: 8 } };
}

export function patchApplicantProfile(body: UpdateProfileRequest): ApplicantProfileResponse {
  const remove = new Set(body.removeKeys ?? []);
  profileAnswers = profileAnswers.filter((answer) => !remove.has(answer.key));
  for (const next of body.answers ?? []) {
    if (!reusableKeys.has(next.key)) continue;
    const current = profileAnswers.find((answer) => answer.key === next.key);
    const answer: ApplicantAnswer = { ...current, ...next, label: next.label ?? current?.label ?? next.key, updatedAt: new Date().toISOString() };
    profileAnswers = current
      ? profileAnswers.map((candidate) => candidate.key === next.key ? answer : candidate)
      : [...profileAnswers, answer];
  }
  if (body.photoLibrary) photoLibrary = clone(body.photoLibrary).slice(0, 20);
  if (body.videoLibrary) videoLibrary = clone(body.videoLibrary).slice(0, 10);
  return applicantProfile();
}

function toSummary(detail: ApplicantApplicationDetail): ApplicantApplicationSummary {
  return {
    id: detail.id,
    postingId: detail.postingId,
    performanceTitle: detail.performanceTitle,
    postingTitle: detail.postingTitle,
    posterUrl: detail.posterUrl,
    companyName: detail.companyName,
    roleName: detail.roleName,
    lookupCode: detail.lookupCode,
    submittedAt: detail.submittedAt,
    editable: detail.editable,
    recruitmentEnd: detail.recruitmentEnd,
    roleProgress: roleProgressOf(detail),
  };
}

function roleProgressOf(detail: ApplicantApplicationDetail): ApplicantApplicationSummary["roleProgress"] {
  const posting = CATALOG.flatMap((performance) => performance.postings).find((candidate) => candidate.id === detail.postingId);
  return detail.roleIds.map((id) => {
    const typedRoleId = roleId(id);
    const roleName = posting?.roles.find((role) => role.id === id)?.name ?? id;
    if (!posting || posting.status !== "CLOSED") return { roleId: id, roleName, state: "RECEIVED" as const, round: null, roundName: null };
    const rounds = roundNumbersForRole(typedRoleId);
    for (const round of rounds) {
      if (!isRoundClosed(typedRoleId, round)) return { roleId: id, roleName, state: "IN_REVIEW" as const, round, roundName: posting.rounds?.find((item) => item.round === round)?.name ?? `${round}차 전형` };
      if (readReview(detail.id, typedRoleId, round).status !== "PASS") return { roleId: id, roleName, state: "NOT_SELECTED" as const, round, roundName: posting.rounds?.find((item) => item.round === round)?.name ?? `${round}차 전형` };
    }
    const finalRound = rounds.at(-1) ?? null;
    return { roleId: id, roleName, state: "FINAL_PASS" as const, round: finalRound, roundName: posting.rounds?.find((item) => item.round === finalRound)?.name ?? (finalRound ? `${finalRound}차 전형` : null) };
  });
}

export const applicantApplications = () => ({ applications: clone(applications.filter((application) => ownedApplicationIds.has(application.id)).map(toSummary)) });

export const applicantApplication = (id: ApplicationId) => {
  const detail = ownedApplicationIds.has(id) ? applications.find((application) => application.id === id) : undefined;
  return detail ? { ...clone(detail), roleProgress: roleProgressOf(detail) } : null;
};

export function patchApplicantApplication(id: ApplicationId, body: UpdateApplicationRequest) {
  const current = applications.find((application) => application.id === id);
  if (!current) return null;
  const changed = new Map(body.answers.map((answer) => [answer.key, answer.value]));
  const currentKeys = new Set(current.answers.map((answer) => answer.key));
  const answers = [
    ...current.answers.map((answer) => changed.has(answer.key) ? { ...answer, value: changed.get(answer.key)! } : answer),
    ...body.answers.filter((answer) => !currentKeys.has(answer.key)).map((answer) => ({
      key: answer.key,
      label: current.applicationFields.find((field) => field.id === answer.key)?.label ?? answer.key,
      value: answer.value,
    })),
  ];
  applications = applications.map((application) => application.id === id ? { ...application, answers, updatedAt: new Date().toISOString() } : application);
  return applicantApplication(id);
}

export function recommendedPostings(exclude?: string, limit = 3): readonly RecommendedPosting[] {
  const companyName = producerProfile().companyName || "기획사/제작사";
  return CATALOG.flatMap((performance) => performance.postings.flatMap((posting) => posting.status === "DRAFT" ? [] : [{
    id: posting.id,
    performanceTitle: performance.title,
    title: posting.title,
    companyName,
    status: posting.status,
    recruitmentStart: posting.recruitmentStart ?? "",
    recruitmentEnd: posting.recruitmentEnd ?? "",
  }]))
    .filter((posting) => posting.id !== exclude)
    .slice(0, limit);
}

export function lookupApplicantApplication(code: string, phone: string): LookupApplicationResponse | null {
  const normalized = code.replaceAll("-", "").toUpperCase();
  const found = applications.find((application) => application.lookupCode.replaceAll("-", "").toUpperCase() === normalized);
  const savedPhone = found?.answers.find((answer) => answer.key === "PHONE")?.value;
  if (!found || typeof savedPhone !== "string" || savedPhone.replace(/\D/g, "") !== phone.replace(/\D/g, "")) return null;
  return clone({
    lookupCode: found.lookupCode,
    performanceTitle: found.performanceTitle,
    postingTitle: found.postingTitle,
    companyName: found.companyName,
    roleName: found.roleName,
    submittedAt: found.submittedAt,
    postingStatus: found.editable ? "OPEN" : "CLOSED",
    editable: found.editable,
    editableUntil: found.editableUntil,
    answers: found.answers,
  });
}

export function addApplicantApplication(detail: ApplicantApplicationDetail) {
  applications = [detail, ...applications];
  ownedApplicationIds.add(detail.id);
}

export const hasApplicationForPosting = (postingId: string) =>
  applications.some((application) => ownedApplicationIds.has(application.id) && application.postingId === postingId);

export function registerProfileClaim(token: string, applicationId: ApplicationId, expiresAt: string) {
  claims.set(token, { applicationId, expiresAt, used: false });
}

/** 유효한 1회용 토큰이면 지원서 소유권과 표준 프로필 스냅샷을 함께 귀속한다. */
export function claimApplicantApplication(token?: string): ApplicationId | null {
  if (!token) return null;
  const claim = claims.get(token);
  if (!claim || claim.used || Date.parse(claim.expiresAt) <= Date.now()) return null;
  const application = applications.find((candidate) => candidate.id === claim.applicationId);
  if (!application) return null;
  claim.used = true;
  ownedApplicationIds.add(application.id);
  const standard = application.answers.filter((answer) => reusableKeys.has(answer.key));
  for (const answer of standard) {
    const current = profileAnswers.find((candidate) => candidate.key === answer.key);
    const next = { ...answer, updatedAt: new Date().toISOString() };
    profileAnswers = current
      ? profileAnswers.map((candidate) => candidate.key === answer.key ? next : candidate)
      : [...profileAnswers, next];
  }
  return application.id;
}
