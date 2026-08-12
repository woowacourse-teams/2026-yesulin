import { delay, http, HttpResponse } from "msw";
import type { LookupApplicationRequest, SubmitApplicationRequest, UpdateApplicationRequest, UpdateProfileRequest } from "@/features/applicants/types";
import { publicPostingById } from "@/features/applications/public-posting";
import { applicationId, postingId } from "@/features/auditions/types";
import { findPerformance, findPosting } from "../auditions/aggregate";
import { addScreeningApplicant } from "../auditions/store";
import { applicantApplication, applicantApplications, applicantProfile, addApplicantApplication, lookupApplicantApplication, patchApplicantApplication, patchApplicantProfile, recommendedPostings, registerProfileClaim } from "./store";
import { toScreeningApplicant } from "./to-screening-applicant";
import { mergeApplicationAnswers, validateApplicationAnswers } from "./validation";
import { producerProfile } from "../auditions/producer-profile";

const apiPath = "/api";
const apiError = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status });

export const applicantHandlers = [
  http.get(`${apiPath}/me/profile`, async () => { await delay(220); return HttpResponse.json(applicantProfile()); }),
  http.patch(`${apiPath}/me/profile`, async ({ request }) => {
    await delay(240);
    const body = (await request.json()) as UpdateProfileRequest;
    if (!(body.answers?.length || body.removeKeys?.length)) return apiError(400, "NOTHING_TO_UPDATE", "변경할 프로필 항목이 없습니다.");
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
  http.get(`${apiPath}/me/applications`, async () => { await delay(260); return HttpResponse.json(applicantApplications()); }),
  http.get(`${apiPath}/me/applications/:applicationId`, async ({ params }) => {
    await delay(260);
    const application = applicantApplication(applicationId(Number(params.applicationId)));
    return application ? HttpResponse.json(application) : apiError(404, "NOT_FOUND", "지원서를 찾을 수 없습니다.");
  }),
  http.patch(`${apiPath}/me/applications/:applicationId`, async ({ params, request }) => {
    await delay(260);
    const id = applicationId(Number(params.applicationId));
    const current = applicantApplication(id);
    if (!current) return apiError(404, "NOT_FOUND", "지원서를 찾을 수 없습니다.");
    if (!current.editable) return apiError(409, "NOT_EDITABLE", "접수가 마감되어 수정할 수 없습니다.");
    const body = (await request.json()) as UpdateApplicationRequest;
    if (!body.answers?.length) return apiError(400, "NOTHING_TO_UPDATE", "변경할 지원서 항목이 없습니다.");
    const validation = validateApplicationAnswers(current.applicationFields, mergeApplicationAnswers(current.answers, body.answers));
    if (validation) return apiError(400, validation.code, validation.message);
    return HttpResponse.json(patchApplicantApplication(id, body));
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
  http.post(`${apiPath}/public/applications/lookup`, async ({ request }) => {
    await delay(320);
    const body = (await request.json()) as LookupApplicationRequest;
    if (!/^YS-?\d{8}-?[A-Fa-f0-9]{6}$/.test(body.code?.trim() ?? "")) return apiError(400, "INVALID_CODE_FORMAT", "조회 코드 형식을 확인해 주세요.");
    const application = lookupApplicantApplication(body.code, body.phone);
    return application ? HttpResponse.json(application) : apiError(404, "APPLICATION_NOT_FOUND", "지원 내역을 찾을 수 없습니다. 코드와 연락처를 다시 확인해 주세요.");
  }),
  http.post(`${apiPath}/public/applications`, async ({ request }) => {
    await delay(520);
    const body = (await request.json()) as SubmitApplicationRequest;
    const posting = findPosting(postingId(body.postingId));
    if (!posting) return apiError(404, "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
    if (posting.status !== "OPEN") return apiError(409, "RECRUITMENT_CLOSED", "현재 접수할 수 없는 공고입니다.");
    const performance = findPerformance(posting.performanceId);
    if (!performance) return apiError(404, "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
    const role = posting.roles.find((candidate) => candidate.id === body.roleId);
    if (!role) return apiError(400, "ROLE_NOT_IN_POSTING", "지원할 배역을 다시 선택해 주세요.");
    if (!body.privacyAgreed) return apiError(400, "PRIVACY_AGREEMENT_REQUIRED", "개인정보 수집·이용 동의가 필요합니다.");
    const fields = (posting.applicationFields ?? []).filter((field) => field.enabled);
    const validation = validateApplicationAnswers(fields, body.answers);
    if (validation) return apiError(400, validation.code, validation.message);
    const submittedAt = new Date().toISOString();
    const receiptNumber = `YS-${submittedAt.slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    const createdApplicationId = applicationId(Date.now());
    const profileClaimToken = `pc_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
    const profileClaimExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const application = { id: createdApplicationId, postingId: posting.id, performanceTitle: performance.title, postingTitle: posting.title, posterUrl: performance.posterUrl, companyName: producerProfile().companyName || "공연사", roleId: role.id, roleName: role.name, lookupCode: receiptNumber, submittedAt, updatedAt: submittedAt, editable: true, recruitmentEnd: posting.recruitmentEnd ?? "", editableUntil: `${posting.recruitmentEnd}T23:59:59+09:00`, answers: body.answers.map((answer) => ({ ...answer, label: answer.label ?? fields.find((field) => field.id === answer.key)?.label ?? answer.key })), applicationFields: fields };
    addApplicantApplication(application);
    addScreeningApplicant(toScreeningApplicant(application, performance.id));
    registerProfileClaim(profileClaimToken, createdApplicationId, profileClaimExpiresAt);
    return HttpResponse.json({ applicationId: createdApplicationId, receiptNumber, submittedAt, profileClaimToken, profileClaimExpiresAt }, { status: 201 });
  }),
];
