import { delay, http, HttpResponse } from "msw";
import type { SubmitApplicationRequest, UpdateProfileRequest } from "@/features/applicants/types";
import { publicPostingById } from "@/features/applications/public-posting";
import { applicationId, postingId } from "@/features/auditions/types";
import { findPerformance, findPosting } from "../auditions/aggregate";
import { addScreeningApplicant } from "../auditions/store";
import { applicantApplication, applicantApplications, applicantProfile, addApplicantApplication, hasApplicationForPosting, patchApplicantProfile, recommendedPostings } from "./store";
import { toScreeningApplicant } from "./to-screening-applicant";
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
    const photoField = fields.find((field) => field.id === "PHOTOS");
    const requestedPhotos = photoField?.config.photoRequirements?.reduce((sum, item) => sum + item.count, 0);
    const photoLimit = Math.min(10, Math.max(1, requestedPhotos ?? photoField?.config.maxCount ?? 10));
    const mediaAnswers = [
      ...(keys.has("PHOTOS") && profile.photoLibrary.length ? [{ key: "PHOTOS", label: photoField?.label ?? "프로필 사진", value: profile.photoLibrary.slice(0, photoLimit).map((photo) => photo.id), previewUrls: profile.photoLibrary.slice(0, photoLimit).map((photo) => photo.url) }] : []),
      ...(keys.has("VIDEO") && profile.videoLibrary[0] ? [{ key: "VIDEO", label: fields.find((field) => field.id === "VIDEO")?.label ?? "연기 영상", value: profile.videoLibrary[0].url }] : []),
    ];
    const answers = [...profile.answers.filter((answer) => keys.has(answer.key)), ...mediaAnswers];
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
    await request.json().catch(() => null);
    return apiError(409, "IMMUTABLE_APPLICATION", "제출한 지원서는 수정할 수 없습니다.");
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
  http.post(`${apiPath}/public/applications`, async ({ request }) => {
    await delay(520);
    const body = (await request.json()) as SubmitApplicationRequest;
    const posting = findPosting(postingId(body.postingId));
    if (!posting) return apiError(404, "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
    if (posting.status !== "OPEN") return apiError(409, "RECRUITMENT_CLOSED", "현재 접수할 수 없는 공고입니다.");
    const performance = findPerformance(posting.performanceId);
    if (!performance) return apiError(404, "POSTING_NOT_FOUND", "공고를 찾을 수 없습니다.");
    if (hasApplicationForPosting(posting.id)) return apiError(409, "DUPLICATE_APPLICATION", "같은 공고에는 지원서를 하나만 제출할 수 있습니다.");
    const roles = posting.roles.filter((candidate) => body.roleIds.includes(candidate.id));
    if (!roles.length || roles.length !== new Set(body.roleIds).size) return apiError(400, "ROLE_NOT_IN_POSTING", "지원할 배역을 다시 선택해 주세요.");
    if (!posting.allowsMultipleRoles && roles.length > 1) return apiError(400, "MULTIPLE_ROLES_NOT_ALLOWED", "이 공고는 한 배역만 선택할 수 있습니다.");
    if (!body.privacyAgreed) return apiError(400, "PRIVACY_AGREEMENT_REQUIRED", "개인정보 수집·이용 동의가 필요합니다.");
    const fields = (posting.applicationFields ?? []).filter((field) => field.enabled);
    const validation = validateApplicationAnswers(fields, body.answers);
    if (validation) return apiError(400, validation.code, validation.message);
    const submittedAt = new Date().toISOString();
    const receiptNumber = `YS-${submittedAt.slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`;
    const createdApplicationId = applicationId(Date.now());
    const answers = body.answers.map((answer) => ({ ...answer, label: answer.label ?? fields.find((field) => field.id === answer.key)?.label ?? answer.key }));
    const application = { id: createdApplicationId, postingId: posting.id, performanceTitle: performance.title, postingTitle: posting.title, posterUrl: posting.posterUrl, companyName: producerProfile().companyName || "기획사/제작사", roleId: roles[0]!.id, roleIds: roles.map((role) => role.id), roleName: roles.map((role) => role.name).join(" · "), lookupCode: receiptNumber, submittedAt, updatedAt: submittedAt, editable: false, recruitmentEnd: posting.recruitmentEnd ?? "", editableUntil: "", roleProgress: [], answers, applicationFields: fields };
    addApplicantApplication(application);
    addScreeningApplicant(toScreeningApplicant(application, performance.id));
    if (body.saveToProfile) patchApplicantProfile({ answers: answers.filter((answer) => !answer.key.startsWith("custom-") && !fields.find((field) => field.id === answer.key)?.custom) });
    return HttpResponse.json({ applicationId: createdApplicationId, receiptNumber, submittedAt, profileClaimToken: null, profileClaimExpiresAt: null }, { status: 201 });
  }),
];
