import { delay, http, HttpResponse } from "msw";
import type { CreateSubmissionRequest, UpdateProfileRequest } from "@/features/applicants/types";
import { publicPostingById } from "@/features/applications/public-posting";
import { submissionId, postingId } from "@/features/auditions/types";
import { findPerformance, findPosting } from "../auditions/aggregate";
import { addScreeningApplicant } from "../auditions/store";
import { applicantSubmission, applicantSubmissions, applicantProfile, addApplicantSubmission, hasSubmissionForPosting, patchApplicantProfile, recommendedPostings } from "./store";
import { toScreeningApplicant } from "./to-screening-applicant";
import { toBackendSubmissionDetail, toBackendSubmissionList } from "./submission-contract";
import { validateApplicationAnswers } from "./validation";
import { producerProfile } from "../auditions/producer-profile";

const apiPath = "/api";
const apiError = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status });

export const applicantHandlers = [
  http.get(`${apiPath}/me/profile`, async () => { await delay(220); return HttpResponse.json(applicantProfile()); }),
  http.patch(`${apiPath}/me/profile`, async ({ request }) => {
    await delay(240);
    const body = (await request.json()) as UpdateProfileRequest;
    if (!(body.answers?.length || body.removeKeys?.length || body.photoLibrary || body.videoLibrary)) return apiError(400, "NOTHING_TO_UPDATE", "변경할 프로필 항목이 없습니다.");
    return HttpResponse.json(patchApplicantProfile(body));
  }),
  http.get(`${apiPath}/me/profile/prefill`, async ({ request }) => {
    await delay(220);
    const posting = findPosting(postingId(new URL(request.url).searchParams.get("postingId") ?? ""));
    if (!posting) return apiError(404, "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
    const profile = applicantProfile();
    const fields = (posting.applicationFields ?? []).filter((field) => field.enabled);
    const keys = new Set(fields.map((field) => field.id));
    const answers = profile.answers.filter((answer) => keys.has(answer.key));
    const answered = new Set(answers.map((answer) => answer.key));
    const required = fields.filter((field) => field.required);
    return HttpResponse.json({ answers, filledCount: required.filter((field) => answered.has(field.id)).length, requiredCount: required.length, missingKeys: required.filter((field) => !answered.has(field.id)).map((field) => field.id) });
  }),
  http.get(`${apiPath}/v1/applicants/me/submissions`, async () => {
    await delay(260);
    return HttpResponse.json(toBackendSubmissionList(applicantSubmissions().submissions));
  }),
  http.get(`${apiPath}/v1/applicants/me/submissions/:submissionId`, async ({ params }) => {
    await delay(260);
    const submission = applicantSubmission(submissionId(String(params.submissionId)));
    return submission
      ? HttpResponse.json(toBackendSubmissionDetail(submission))
      : apiError(404, "NOT_FOUND", "지원서를 찾을 수 없습니다.");
  }),
  http.get(`${apiPath}/public/recommended-postings`, async ({ request }) => {
    await delay(180);
    const search = new URL(request.url).searchParams;
    const limit = Math.min(10, Math.max(1, Number(search.get("limit")) || 3));
    return HttpResponse.json({ postings: recommendedPostings(search.get("excludePostingId") ?? undefined, limit) });
  }),
  http.get(`${apiPath}/public/postings/:postingId`, async ({ params }) => {
    await delay(180);
    const posting = publicPostingById(String(params.postingId));
    return posting ? HttpResponse.json(posting) : apiError(404, "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
  }),
  http.post(`${apiPath}/public/submissions`, async ({ request }) => {
    await delay(520);
    const body = (await request.json()) as CreateSubmissionRequest;
    const posting = findPosting(postingId(body.postingId));
    if (!posting) return apiError(404, "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
    if (posting.status !== "OPEN") return apiError(409, "RECRUITMENT_CLOSED", "현재 접수할 수 없는 공고입니다.");
    const performance = findPerformance(posting.performanceId);
    if (!performance) return apiError(404, "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
    if (hasSubmissionForPosting(posting.id)) return apiError(409, "DUPLICATE_SUBMISSION", "같은 공고에는 지원서를 하나만 제출할 수 있습니다.");
    const roles = posting.roles.filter((candidate) => body.roleIds.includes(candidate.id));
    if (!roles.length || roles.length !== new Set(body.roleIds).size) return apiError(400, "ROLE_NOT_IN_POSTING", "지원할 배역을 다시 선택해 주세요.");
    if (!posting.allowsMultipleRoles && roles.length > 1) return apiError(400, "MULTIPLE_ROLES_NOT_ALLOWED", "이 공고는 한 배역만 선택할 수 있습니다.");
    if (!body.privacyAgreed) return apiError(400, "PRIVACY_AGREEMENT_REQUIRED", "개인정보 수집·이용 동의가 필요합니다.");
    const fields = (posting.applicationFields ?? []).filter((field) => field.enabled);
    const validation = validateApplicationAnswers(fields, body.answers);
    if (validation) return apiError(400, validation.code, validation.message);
    const submittedAt = new Date().toISOString();
    const receiptNumber = `YS-${submittedAt.slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    const createdSubmissionId = submissionId(crypto.randomUUID());
    const profilePhotos = new Map(applicantProfile().photoLibrary.map((photo) => [photo.id, photo.url]));
    const answers = body.answers.map((answer) => {
      const previewUrls = answer.key === "PHOTOS" && Array.isArray(answer.value)
        ? answer.value.flatMap((id) => typeof id === "string" && profilePhotos.get(id) ? [profilePhotos.get(id)!] : [])
        : undefined;
      return { ...answer, label: answer.label ?? fields.find((field) => field.id === answer.key)?.label ?? answer.key, ...(previewUrls?.length ? { previewUrls } : {}) };
    });
    const submission = {
      id: createdSubmissionId,
      postingId: posting.id,
      performanceTitle: performance.title,
      postingTitle: posting.title,
      posterUrl: posting.posterUrl,
      companyName: producerProfile().companyName || "기획사/제작사",
      selectedRoles: roles.map((role) => ({ roleId: role.id, roleName: role.name })),
      submittedAt,
      answers,
      applicationFields: fields,
    };
    addApplicantSubmission(submission, receiptNumber);
    addScreeningApplicant(toScreeningApplicant(submission, performance.id));
    if (body.saveToProfile) patchApplicantProfile({ answers: answers.filter((answer) => !answer.key.startsWith("custom-") && !fields.find((field) => field.id === answer.key)?.custom) });
    return HttpResponse.json({ submissionId: createdSubmissionId, receiptNumber, submittedAt, profileClaimToken: null, profileClaimExpiresAt: null }, { status: 201 });
  }),
];
