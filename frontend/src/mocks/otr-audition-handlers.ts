import { http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import { otrAuditionLink, type CreateOtrAudition, type OtrAudition } from "@/features/otr-auditions/types";

const auditions: OtrAudition[] = [];
const submitted = new Set<string>();
const path = "/api/v1/otr-auditions";

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
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    return HttpResponse.json({ ...audition, producerName: "테스트 공연사",
      postingSnapshotVersion: `${audition.id}:테스트 공연사`, open: today <= audition.deadline });
  }),
  http.post("/api/v1/otr-auditions/:id/submissions", async ({ params, request }) => {
    if (frontendEnvironment.producerApiEnabled) return passthrough();
    const audition = auditions.find((item) => item.id === params.id);
    if (!audition) return HttpResponse.json({ code: "OTR_AUDITION_NOT_FOUND", message: "OTR 공고를 찾을 수 없습니다." }, { status: 404 });
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    if (today > audition.deadline) return HttpResponse.json({ code: "OTR_AUDITION_CLOSED", message: "OTR 공고의 지원 마감일이 지났습니다." }, { status: 409 });
    if (submitted.has(audition.id)) return HttpResponse.json({ code: "OTR_AUDITION_DUPLICATE_SUBMISSION", message: "이미 지원한 OTR 공고입니다." }, { status: 409 });
    const input = await request.json() as {
      postingSnapshotVersion?: string; selectedRole?: string; basicInformation?: Record<string, unknown>;
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
    return HttpResponse.json({ submissionId: submitted.size, submittedAt: new Date().toISOString() }, { status: 201 });
  }),
];
