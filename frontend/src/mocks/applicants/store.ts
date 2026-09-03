import { submissionId, type SubmissionId } from "@/features/auditions/types";
import type {
  ApplicantAnswer,
  ApplicantSubmissionDetail,
  ApplicantSubmissionSummary,
  ApplicantProfileResponse,
  ApplicantProfilePhoto,
  ApplicantProfileVideo,
  LookupSubmissionResponse,
  RecommendedPosting,
  UpdateProfileRequest,
} from "@/features/applicants/types";
import { CATALOG } from "@/mocks/auditions/catalog";
import { screeningFlowApplicationFixture } from "@/mocks/auditions/application-field-fixtures";
import { producerProfile } from "@/mocks/auditions/producer-profile";
import { MAX_ACTOR_PHOTO_COUNT } from "@/features/files/photo-policy";

const seededAnswers: ApplicantAnswer[] = [
  { key: "NAME", label: "이름", value: "김하린" },
  { key: "PHONE", label: "연락처", value: "010-2468-1357" },
  { key: "EMAIL", label: "이메일", value: "harin.kim@example.com" },
  { key: "ADDRESS", label: "거주지", value: "서울특별시 마포구" },
  { key: "BIRTH", label: "생년월일", value: "1999-04-18" },
  { key: "GENDER", label: "성별", value: "여성" },
  { key: "HEIGHT", label: "키", value: 166 },
  { key: "WEIGHT", label: "몸무게", value: 52 },
  { key: "SCHOOL", label: "학력", value: { level: "UNIVERSITY", school: "한국예술종합학교", major: "연극원 연기과" } },
  { key: "CAREER", label: "경력", value: [{ year: 2025, title: "푸른 방", part: "윤서" }] },
  { key: "LINK", label: "SNS / 외부 링크", value: "https://example.com/harin" },
  { key: "NATIONALITY", label: "국적", value: "대한민국" },
  { key: "COVER_LETTER", label: "자기소개", value: "인물의 작은 선택이 장면 전체의 온도를 바꾼다고 믿습니다. 상대 배우의 호흡을 세심하게 듣고 반복되는 연습에서도 새로운 반응을 발견하는 배우 김하린입니다." },
  { key: "SPECIALTY", label: "특기", value: "현대무용, 검술" },
  { key: "HOBBIES", label: "취미", value: "러닝, 독립영화 감상" },
  { key: "MILITARY", label: "군필 여부", value: "해당 없음" },
  { key: "PHOTOS", label: "프로필 사진", value: ["seed-photo-1", "seed-photo-2", "seed-photo-3"], previewUrls: ["/images/applicants/kim-harin-profile.png", "/images/applicants/kim-harin-full-body.png", "/images/applicants/kim-harin-acting-1.png"] },
  { key: "VIDEO", label: "영상 링크", value: [
    "https://youtu.be/aqz-KE-bpKQ",
    "https://youtu.be/M7lc1UVf-VE",
    "https://youtu.be/ysz5S6PUM-U",
    "https://youtu.be/ScMzIvxBSi4",
    "https://youtu.be/eRsGyueVLvQ",
  ] },
  { key: "MOTIVATION", label: "이 작품에 지원한 동기를 적어 주세요.", value: "달빛 아래 우리가 다루는 관계의 회복과 성장에 깊이 공감해 지원했습니다." },
];
const reusableKeys = new Set(["NAME", "HEIGHT", "WEIGHT", "BIRTH", "GENDER", "PHONE", "EMAIL", "ADDRESS", "SCHOOL", "CAREER", "LINK", "NATIONALITY", "COVER_LETTER", "SPECIALTY", "HOBBIES", "MILITARY"]);
let profileAnswers: ApplicantAnswer[] = seededAnswers.filter((answer) => reusableKeys.has(answer.key));
let photoLibrary: ApplicantProfilePhoto[] = [
  { id: "seed-photo-1", name: "김하린 프로필.jpg", url: "/images/applicants/kim-harin-profile.png", representative: true },
  { id: "seed-photo-2", name: "김하린 전신.jpg", url: "/images/applicants/kim-harin-full-body.png", representative: false },
  { id: "seed-photo-3", name: "김하린 연기 이미지 1.jpg", url: "/images/applicants/kim-harin-acting-1.png", representative: false },
];
let videoLibrary: ApplicantProfileVideo[] = [{ id: "seed-video-1", url: "https://youtu.be/aqz-KE-bpKQ", youtubeId: "aqz-KE-bpKQ" }];
let submissions: ApplicantSubmissionDetail[] = [{
  id: submissionId("00000000-0000-4000-8000-000026081201"), postingId: "seed_posting_1", performanceTitle: "달빛 아래 우리", postingTitle: "2026 하반기 주·조연 배우 모집",
  posterUrl: "/images/performances/moonlight.jpg", companyName: "예술in 스테이지",
  selectedRoles: [{ roleId: "seed_role_seoyeon", roleName: "서연" }, { roleId: "seed_role_jiwoo", roleName: "지우" }],
  submittedAt: "2026-08-12T10:30:00+09:00", answers: seededAnswers, applicationFields: screeningFlowApplicationFixture(),
}];
const ownedSubmissionIds = new Set<SubmissionId>(submissions.map((submission) => submission.id));
const lookupCodes = new Map<SubmissionId, string>([[submissions[0]!.id, "YS-20260812-SEED01"]]);
const claims = new Map<string, { readonly submissionId: SubmissionId; readonly expiresAt: string; used: boolean }>();

const clone = <T>(value: T): T => structuredClone(value);

export function applicantProfile(): ApplicantProfileResponse {
  const answer = (key: string) => profileAnswers.find((candidate) => candidate.key === key)?.value;
  const basicValues = [answer("NAME"), answer("HEIGHT"), answer("WEIGHT"), answer("BIRTH"), answer("GENDER"), answer("PHONE"), answer("EMAIL"), answer("ADDRESS")];
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
  if (body.photoLibrary) photoLibrary = clone(body.photoLibrary).slice(0, MAX_ACTOR_PHOTO_COUNT);
  if (body.videoLibrary) videoLibrary = clone(body.videoLibrary).slice(0, 10);
  return applicantProfile();
}

function toSummary(detail: ApplicantSubmissionDetail): ApplicantSubmissionSummary {
  return {
    id: detail.id,
    postingId: detail.postingId,
    performanceTitle: detail.performanceTitle,
    postingTitle: detail.postingTitle,
    posterUrl: detail.posterUrl,
    companyName: detail.companyName,
    submittedAt: detail.submittedAt,
    selectedRoles: detail.selectedRoles,
  };
}

export const applicantSubmissions = () => ({ submissions: clone(submissions.filter((submission) => ownedSubmissionIds.has(submission.id)).map(toSummary)) });

export const applicantSubmission = (id: SubmissionId) => {
  const detail = ownedSubmissionIds.has(id) ? submissions.find((submission) => submission.id === id) : undefined;
  return detail ? clone(detail) : null;
};

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

export function lookupApplicantSubmission(code: string, phone: string): LookupSubmissionResponse | null {
  const normalized = code.replaceAll("-", "").toUpperCase();
  const found = submissions.find((submission) => lookupCodes.get(submission.id)?.replaceAll("-", "").toUpperCase() === normalized);
  const savedPhone = found?.answers.find((answer) => answer.key === "PHONE")?.value;
  if (!found || typeof savedPhone !== "string" || savedPhone.replace(/\D/g, "") !== phone.replace(/\D/g, "")) return null;
  return clone({
    lookupCode: lookupCodes.get(found.id)!,
    performanceTitle: found.performanceTitle,
    postingTitle: found.postingTitle,
    companyName: found.companyName,
    roleName: found.selectedRoles.map((role) => role.roleName).join(" · "),
    submittedAt: found.submittedAt,
    postingStatus: "CLOSED",
    editable: false,
    editableUntil: "",
    answers: found.answers,
  });
}

export function addApplicantSubmission(detail: ApplicantSubmissionDetail, lookupCode?: string) {
  submissions = [detail, ...submissions];
  ownedSubmissionIds.add(detail.id);
  if (lookupCode) lookupCodes.set(detail.id, lookupCode);
}

export const hasSubmissionForPosting = (postingId: string) =>
  submissions.some((submission) => ownedSubmissionIds.has(submission.id) && submission.postingId === postingId);

export function registerProfileClaim(token: string, submissionId: SubmissionId, expiresAt: string) {
  claims.set(token, { submissionId, expiresAt, used: false });
}

/** 유효한 1회용 토큰이면 지원서 소유권과 표준 프로필 스냅샷을 함께 귀속한다. */
export function claimApplicantSubmission(token?: string): SubmissionId | null {
  if (!token) return null;
  const claim = claims.get(token);
  if (!claim || claim.used || Date.parse(claim.expiresAt) <= Date.now()) return null;
  const submission = submissions.find((candidate) => candidate.id === claim.submissionId);
  if (!submission) return null;
  claim.used = true;
  ownedSubmissionIds.add(submission.id);
  const standard = submission.answers.filter((answer) => reusableKeys.has(answer.key));
  for (const answer of standard) {
    const current = profileAnswers.find((candidate) => candidate.key === answer.key);
    const next = { ...answer, updatedAt: new Date().toISOString() };
    profileAnswers = current
      ? profileAnswers.map((candidate) => candidate.key === answer.key ? next : candidate)
      : [...profileAnswers, next];
  }
  return submission.id;
}
