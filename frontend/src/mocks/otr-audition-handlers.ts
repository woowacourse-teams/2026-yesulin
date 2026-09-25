import { http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import { otrAuditionLink, type CreateOtrAudition, type OtrAudition } from "@/features/otr-auditions/types";

const auditions: OtrAudition[] = [];
const submitted = new Set<string>();
type MockOtrSubmission = {
  readonly id: string;
  readonly auditionId: string;
  readonly selectedRole: string;
  readonly basicInformation: Record<string, unknown>;
  readonly additionalInformation: Record<string, unknown>;
  readonly photoFileIds: readonly number[];
  readonly videoUrls: readonly string[];
  readonly submittedAt: string;
  status: "PENDING" | "PASS" | "FAIL" | "ETC";
  memo: string;
  note: string;
};
const mockSubmissions: MockOtrSubmission[] = [];
const completedRoles = new Set<string>();
const path = "/api/v1/otr-auditions";
const screeningPath = `${path}/:id/roles/:roleOrder/screening-rounds/:round`;
const koreaToday = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

function screeningContext(id: string | undefined, rawOrder: string | undefined, rawRound: string | undefined) {
  const audition = auditions.find((item) => item.id === id);
  const roleOrder = Number(rawOrder);
  const roleName = audition?.roles[roleOrder - 1];
  if (!audition || !roleName || rawRound !== "1") return null;
  return { audition, roleOrder, roleName, key: `${audition.id}:${roleOrder}` };
}

function mockBoard(context: NonNullable<ReturnType<typeof screeningContext>>, search = new URLSearchParams()) {
  const all = mockSubmissions.filter((submission) => submission.auditionId === context.audition.id
    && submission.selectedRole === context.roleName);
  const pending = all.filter((submission) => submission.status === "PENDING").length;
  const pass = all.filter((submission) => submission.status === "PASS").length;
  const fail = all.filter((submission) => submission.status === "FAIL").length;
  const etc = all.filter((submission) => submission.status === "ETC").length;
  const counts = { all: all.length, pending, done: all.length - pending, pass, fail, etc };
  const progress = { done: counts.done, total: counts.all, percent: counts.all ? Math.round(counts.done * 100 / counts.all) : 0 };
  const closed = completedRoles.has(context.key);
  const keyword = search.get("keyword")?.toLowerCase() ?? "";
  const filtered = all.filter((submission) => {
    if (search.get("work") === "PENDING" && submission.status !== "PENDING") return false;
    if (search.get("work") === "DONE" && submission.status === "PENDING") return false;
    if (search.get("status") && search.get("status") !== submission.status) return false;
    return !keyword || String(submission.basicInformation.name ?? "").toLowerCase().includes(keyword);
  });
  return {
    performance: { id: 0, posterUrl: "", title: `OTR #${context.audition.otrId}` },
    posting: { id: context.audition.id, title: context.audition.title, openCall: false },
    role: { id: context.roleOrder, postingId: context.audition.id, name: context.roleName, description: "",
      quota: 0, gender: "ANY", ageMin: 0, ageMax: 999, applicantCount: all.length, activeRound: 1,
      allRoundsClosed: closed, canComplete: koreaToday() > context.audition.deadline,
      progress, counts },
    round: 1,
    rounds: [{ round: 1, name: "1차 서류 심사", closed, counts, progress }],
    submissions: filtered.map((submission) => ({
      id: submission.id, name: submission.basicInformation.name, gender: submission.basicInformation.gender,
      age: Math.max(0, new Date(context.audition.deadline).getUTCFullYear()
        - new Date(String(submission.basicInformation.birthDate)).getUTCFullYear()),
      height: submission.basicInformation.height, weight: submission.basicInformation.weight,
      roleId: context.roleOrder, roleName: context.roleName, birth: submission.basicInformation.birthDate,
      phone: submission.basicInformation.phone, email: submission.basicInformation.email,
      address: submission.basicInformation.address,
      educationLevel: submission.additionalInformation.educationLevel ?? null,
      school: submission.additionalInformation.school ?? null,
      major: submission.additionalInformation.major ?? null,
      links: submission.additionalInformation.links ?? [],
      nationality: submission.additionalInformation.nationality ?? null,
      specialty: submission.additionalInformation.specialty ?? null,
      hobbies: submission.additionalInformation.hobbies ?? null,
      militaryServiceStatus: submission.additionalInformation.militaryServiceStatus ?? null,
      submittedAt: submission.submittedAt,
      career: Array.isArray(submission.additionalInformation.careers)
        ? submission.additionalInformation.careers.map((career) => {
          const item = career as { year: number; title: string; roleName: string };
          return { year: item.year, title: item.title, part: item.roleName };
        }) : [],
      coverLetter: submission.additionalInformation.coverLetter ?? null, questions: [],
      photos: submission.photoFileIds.map((id) => ({ label: "사진", url: `/api/v1/files/${id}/content` })),
      videos: submission.videoUrls.map((url) => ({ label: "영상", url })),
      review: { status: submission.status, memo: submission.memo, note: submission.note },
      reviewHistory: { 1: { status: submission.status, memo: submission.memo, note: submission.note } },
      mismatchReasons: [],
    })),
  };
}

export const otrAuditionHandlers = [
  http.get(path, () => {
    if (frontendEnvironment.producerApiEnabled) return passthrough();
    return HttpResponse.json({ auditions });
  }),
  http.post(path, async ({ request }) => {
    if (frontendEnvironment.producerApiEnabled) return passthrough();
    const input = await request.json() as CreateOtrAudition;
    const otrId = input.otrId?.trim();
    const title = input.title?.trim();
    const roles = input.roles?.map((role) => role.trim());
    if (!otrId || !/^[0-9]{1,30}$/.test(otrId) || !title || title.length > 200 || !input.deadline
      || !Array.isArray(roles) || roles.length === 0 || roles.length > 20
      || roles.some((role) => !role || role.length > 100) || new Set(roles).size !== roles.length) {
      return HttpResponse.json({ code: "OTR_AUDITION_INVALID_INPUT", message: "공고 입력값을 확인해 주세요." }, { status: 400 });
    }
    if (auditions.some((audition) => audition.otrId === otrId)) {
      return HttpResponse.json({ code: "OTR_AUDITION_DUPLICATE_OTR_ID", message: "이미 등록한 OTR 공고 번호입니다." }, { status: 409 });
    }
    const id = crypto.randomUUID();
    const created: OtrAudition = {
      id,
      otrId,
      title,
      otrLink: otrAuditionLink(otrId),
      applicationPath: `/apply/standard/${id}`,
      roles,
      deadline: input.deadline,
      createdAt: new Date().toISOString(),
    };
    auditions.unshift(created);
    return HttpResponse.json(created, { status: 201, headers: { Location: `${path}/${created.id}` } });
  }),
  http.get("/api/v1/public/otr-auditions/:id", ({ params }) => {
    if (frontendEnvironment.producerApiEnabled) return passthrough();
    const audition = auditions.find((item) => item.id === params.id);
    if (!audition) return HttpResponse.json({ code: "OTR_AUDITION_NOT_FOUND", message: "OTR 공고를 찾을 수 없습니다." }, { status: 404 });
    const today = koreaToday();
    return HttpResponse.json({ ...audition, producerName: "테스트 공연사",
      postingSnapshotVersion: `${audition.id}:테스트 공연사`, open: today <= audition.deadline });
  }),
  http.post("/api/v1/otr-auditions/:id/submissions", async ({ params, request }) => {
    if (frontendEnvironment.producerApiEnabled) return passthrough();
    const audition = auditions.find((item) => item.id === params.id);
    if (!audition) return HttpResponse.json({ code: "OTR_AUDITION_NOT_FOUND", message: "OTR 공고를 찾을 수 없습니다." }, { status: 404 });
    const today = koreaToday();
    if (today > audition.deadline) return HttpResponse.json({ code: "OTR_AUDITION_CLOSED", message: "OTR 공고의 지원 마감일이 지났습니다." }, { status: 409 });
    if (submitted.has(audition.id)) return HttpResponse.json({ code: "OTR_AUDITION_DUPLICATE_SUBMISSION", message: "이미 지원한 OTR 공고입니다." }, { status: 409 });
    const input = await request.json() as {
      postingSnapshotVersion?: string; selectedRole?: string; basicInformation?: Record<string, unknown>;
      additionalInformation?: Record<string, unknown>;
      photoFileIds?: number[]; videoUrls?: string[];
      privacyCollectionAndUseAgreed?: boolean; thirdPartyProvisionAgreed?: boolean;
    };
    if (input.postingSnapshotVersion !== `${audition.id}:테스트 공연사`) {
      return HttpResponse.json({ code: "OTR_AUDITION_STALE_POSTING_SNAPSHOT", message: "공연사 정보가 변경되었습니다. 지원 페이지를 새로고침해 주세요." }, { status: 409 });
    }
    const photoFileIds = input.photoFileIds ?? [];
    const videoUrls = input.videoUrls ?? [];
    if (!input.selectedRole || !audition.roles.includes(input.selectedRole)
      || !input.basicInformation || ["name", "height", "weight", "birthDate", "gender", "phone", "email", "address"].some((key) => !input.basicInformation?.[key])
      || photoFileIds.length > 3 || new Set(photoFileIds).size !== photoFileIds.length
      || videoUrls.length > 3 || new Set(videoUrls).size !== videoUrls.length
      || videoUrls.some((url) => !/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(url))
      || !input.privacyCollectionAndUseAgreed || !input.thirdPartyProvisionAgreed) {
      return HttpResponse.json({ code: "OTR_AUDITION_INVALID_INPUT", message: "지원 정보를 확인해 주세요." }, { status: 400 });
    }
    submitted.add(audition.id);
    mockSubmissions.push({ id: crypto.randomUUID(), auditionId: audition.id, selectedRole: input.selectedRole,
      basicInformation: input.basicInformation, additionalInformation: input.additionalInformation ?? {},
      photoFileIds, videoUrls, submittedAt: new Date().toISOString(),
      status: "PENDING", memo: "", note: "" });
    return HttpResponse.json({ submissionId: submitted.size, submittedAt: new Date().toISOString() }, { status: 201 });
  }),
  http.get(`${screeningPath}/submissions`, ({ params, request }) => {
    if (frontendEnvironment.producerApiEnabled) return passthrough();
    const context = screeningContext(String(params.id), String(params.roleOrder), String(params.round));
    if (!context) return HttpResponse.json({ code: "SCREENING_REVIEW_NOT_FOUND" }, { status: 404 });
    return HttpResponse.json(mockBoard(context, new URL(request.url).searchParams));
  }),
  http.get(`${screeningPath}/submissions/:submissionId`, ({ params }) => {
    if (frontendEnvironment.producerApiEnabled) return passthrough();
    const context = screeningContext(String(params.id), String(params.roleOrder), String(params.round));
    if (!context) return HttpResponse.json({ code: "SCREENING_REVIEW_NOT_FOUND" }, { status: 404 });
    const board = mockBoard(context);
    const submission = board.submissions.find((item) => item.id === params.submissionId);
    if (!submission) return HttpResponse.json({ code: "SCREENING_REVIEW_NOT_FOUND" }, { status: 404 });
    const { submissions: ignored, ...detail } = board;
    void ignored;
    return HttpResponse.json({ ...detail, submission });
  }),
  http.patch(`${screeningPath}/reviews`, async ({ params, request }) => {
    if (frontendEnvironment.producerApiEnabled) return passthrough();
    const context = screeningContext(String(params.id), String(params.roleOrder), String(params.round));
    if (!context) return HttpResponse.json({ code: "SCREENING_REVIEW_NOT_FOUND" }, { status: 404 });
    if (completedRoles.has(context.key)) return HttpResponse.json({ code: "INVALID_SCREENING_REVIEW" }, { status: 400 });
    const input = await request.json() as { submissionIds?: string[]; status?: MockOtrSubmission["status"]; memo?: string; note?: string };
    const targets = mockSubmissions.filter((item) => input.submissionIds?.includes(item.id)
      && item.auditionId === context.audition.id && item.selectedRole === context.roleName);
    if (!input.submissionIds?.length || targets.length !== input.submissionIds.length) {
      return HttpResponse.json({ code: "SCREENING_REVIEW_NOT_FOUND" }, { status: 404 });
    }
    targets.forEach((item) => { if (input.status) item.status = input.status;
      if (input.memo !== undefined) item.memo = input.memo;
      if (input.note !== undefined) item.note = input.note; });
    return HttpResponse.json({ roleId: context.roleOrder, round: 1, reviews: targets.map((item) => ({
      submissionId: item.id, roleId: context.roleOrder, round: 1, status: item.status, memo: item.memo, note: item.note,
    })) });
  }),
  http.patch(`${screeningPath}/completion`, ({ params }) => {
    if (frontendEnvironment.producerApiEnabled) return passthrough();
    const context = screeningContext(String(params.id), String(params.roleOrder), String(params.round));
    if (!context) return HttpResponse.json({ code: "SCREENING_REVIEW_NOT_FOUND" }, { status: 404 });
    if (koreaToday() <= context.audition.deadline) {
      return HttpResponse.json({ code: "SCREENING_ROUND_NOT_READY" }, { status: 409 });
    }
    const counts = mockBoard(context).role.counts;
    completedRoles.add(context.key);
    return HttpResponse.json({ round: 1, acceptedCount: counts.pass, unselectedCount: counts.pending,
      promotedCount: 0, nextRound: null, allRoundsClosed: true });
  }),
];
