import { delay, http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import type { AdminCompany, AdminCompanyEditRequest, AdminCompanyStatus, AdminCompanyWrite } from "@/features/admin/types";
import type { CompanyEditRequestWrite } from "@/features/companies/api";
import type { AuditionPostSummary } from "@/features/audition-posts/types";
import type { Company, CompanySummary } from "@/features/companies/types";
import { mockSessionRole } from "./auth-handlers";

/**
 * 공연사 화면과 운영자 공연사 관리 확인용 메모리 목. 운영자가 공개한 공연사만 공고 상세와 공연사 화면에 보인다.
 * 공고와 공연사 연결은 실제 운영 공고 API가 다루므로 목에서는 고정된 연결만 둔다. 새로고침하면 초기화된다.
 */
type Mutable<T> = { -readonly [K in keyof T]: T[K] };

const realLoginEnabled = frontendEnvironment.producerLoginEnabled;
const now = new Date().toISOString();

const companies: Mutable<AdminCompany>[] = [
  {
    id: 1,
    name: "프로젝트 운베칸트",
    representativeName: "김운베",
    representativeNamePublic: true,
    links: ["https://www.example.com/unbekannt", "https://www.instagram.com/example_unbekannt"],
    foundedOn: "2019-04-12",
    address: {
      roadAddress: "서울 종로구 대학로 116",
      detailAddress: "3층 연습실",
      zonecode: "03086",
      latitude: 37.5826,
      longitude: 127.0018,
    },
    addressPublic: true,
    region: null,
    phone: "02-765-4321",
    description: "대학로 소극장에서 낭독극과 창작극을 올리는 프로젝트 극단입니다.\n배우와 함께 오래 가는 작업을 지향합니다.",
    history: "2019 창단\n2021 낭독극 <체크 포인트> 초연\n2024 대학로 정기공연 시작",
    sourceNote: "공식 홈페이지 연혁, 공연사 전화 확인",
    status: "PUBLISHED",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 2,
    name: "팀플레이예술기획",
    representativeName: "박팀플",
    representativeNamePublic: false,
    links: [],
    foundedOn: null,
    address: null,
    addressPublic: false,
    region: "서울",
    phone: null,
    description: null,
    history: null,
    sourceNote: "OTR 작성자 닉네임",
    status: "PUBLISHED",
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 3,
    name: "여름밤 컴퍼니",
    representativeName: null,
    representativeNamePublic: false,
    links: ["https://www.example.com/summer-night"],
    foundedOn: null,
    address: null,
    addressPublic: false,
    region: null,
    phone: null,
    description: null,
    history: null,
    sourceNote: null,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
  },
];

/** 공개 화면에서 보낸 수정 요청 중 처리하지 않은 것. 연혁·링크를 고쳐 달라는 요청 하나로 시작한다. */
const editRequests: AdminCompanyEditRequest[] = [
  {
    id: 1,
    company: companies[1],
    proposal: {
      ...companies[1],
      representativeName: null,
      links: ["https://www.instagram.com/example_teamplay"],
      history: "2020 창단\n2023 대학로 첫 정기공연",
    },
    changedFields: ["LINKS", "HISTORY"],
    reason: "팀플레이예술기획 기획팀입니다. 공식 인스타그램과 연혁을 넣어 주세요.",
    contact: "teamplay@example.com",
    createdAt: now,
  },
];

/** 목 공고 번호 → 공연사 번호. */
const POST_COMPANIES: Readonly<Record<number, number>> = { 1: 1, 2: 2, 4: 3 };

const apiError = (status: number, code: string, message: string) =>
  HttpResponse.json({ code, message }, { status });

function rejectNonAdmin() {
  const role = mockSessionRole();
  if (!role) return apiError(401, "AUTH_UNAUTHENTICATED", "로그인이 필요합니다.");
  if (role !== "ADMIN") return apiError(403, "AUTH_FORBIDDEN", "접근 권한이 없습니다.");
  return null;
}

function publishedCompany(companyId: number): AdminCompany | undefined {
  return companies.find((company) => company.id === companyId && company.status === "PUBLISHED");
}

function location(company: AdminCompany): string | null {
  if (company.address) return company.address.roadAddress.split(/\s+/).slice(0, 2).join(" ");
  return company.region;
}

function toSummary(company: AdminCompany): CompanySummary {
  return {
    id: company.id,
    name: company.name,
    representativeName: company.representativeNamePublic ? company.representativeName : null,
    links: company.links,
    foundedOn: company.foundedOn,
    location: location(company),
  };
}

function toPublic(company: AdminCompany): Company {
  return {
    ...toSummary(company),
    address: company.addressPublic ? company.address : null,
    phone: company.phone,
    description: company.description,
    history: company.history,
    updatedAt: company.updatedAt,
  };
}

/** 목 공고 상세에 붙일 공연사 요약. 연결이 없거나 공개 전이면 null이다. */
export function mockCompanyOfPost(postId: number): CompanySummary | null {
  const companyId = POST_COMPANIES[postId];
  const company = companyId === undefined ? undefined : publishedCompany(companyId);
  return company ? toSummary(company) : null;
}

const blankToNull = (value: string | null | undefined) => value?.trim() ? value.trim() : null;

/** 서버와 같은 규칙만 간단히 검사한다. 오류면 메시지를 돌려준다. */
function validate(write: AdminCompanyWrite): string | null {
  if (!write.name?.trim()) return "공연사 이름은 필수입니다.";
  if (write.name.trim().length > 100) return "공연사 이름은 100자 이내여야 합니다.";
  const links = write.links.map((link) => link.trim()).filter(Boolean);
  if (links.length > 3) return "링크는 3개까지 넣을 수 있습니다.";
  if (links.some((link) => !/^https?:\/\/[^/\s]+/i.test(link))) {
    return "링크는 http:// 또는 https://로 시작하는 주소여야 합니다.";
  }
  if (write.foundedOn && write.foundedOn > new Date().toISOString().slice(0, 10)) return "설립일이 올바르지 않습니다.";
  if (write.phone?.trim() && !/^[0-9][0-9 ()+-]{6,29}$/.test(write.phone.trim())) {
    return "연락처는 숫자와 하이픈으로 적어 주세요.";
  }
  return null;
}

function apply(target: Mutable<AdminCompany>, write: AdminCompanyWrite) {
  target.name = write.name.trim();
  target.representativeName = blankToNull(write.representativeName);
  target.representativeNamePublic = write.representativeNamePublic;
  target.links = write.links.map((link) => link.trim()).filter(Boolean);
  target.foundedOn = write.foundedOn || null;
  target.address = write.address?.roadAddress.trim() ? write.address : null;
  target.addressPublic = write.addressPublic;
  target.region = blankToNull(write.region);
  target.phone = blankToNull(write.phone);
  target.description = blankToNull(write.description);
  target.history = blankToNull(write.history);
  target.sourceNote = blankToNull(write.sourceNote);
  target.updatedAt = new Date().toISOString();
}

/** 공연사 화면 목록용. 공고 목은 공고 handler가 가지고 있어 연결된 공고 번호만 알려 준다. */
export function mockCompanyPostIds(companyId: number): readonly number[] {
  return Object.entries(POST_COMPANIES)
    .filter(([, linked]) => linked === companyId)
    .map(([postId]) => Number(postId));
}

export function companyHandlers(postsOf: (postIds: readonly number[]) => readonly AuditionPostSummary[]) {
  return [
    http.get("/api/v1/public/companies/:companyId", async ({ params }) => {
      await delay(150);
      const company = publishedCompany(Number(params.companyId));
      return company ? HttpResponse.json(toPublic(company)) : apiError(404, "COMPANY_NOT_FOUND", "공연사를 찾을 수 없습니다.");
    }),

    http.get("/api/v1/public/companies/:companyId/audition-posts", async ({ params }) => {
      await delay(150);
      const companyId = Number(params.companyId);
      if (!publishedCompany(companyId)) return apiError(404, "COMPANY_NOT_FOUND", "공연사를 찾을 수 없습니다.");
      return HttpResponse.json({ posts: postsOf(mockCompanyPostIds(companyId)) });
    }),

    http.post("/api/v1/public/companies/:companyId/edit-requests", async ({ params, request }) => {
      await delay(150);
      const company = publishedCompany(Number(params.companyId));
      if (!company) return apiError(404, "COMPANY_NOT_FOUND", "공연사를 찾을 수 없습니다.");
      const write = await request.json() as CompanyEditRequestWrite;
      const invalid = validate(write.company);
      if (invalid) return apiError(400, "COMPANY_INVALID_INPUT", invalid);
      if (!write.changedFields.length) return apiError(400, "COMPANY_INVALID_INPUT", "바뀐 항목이 없습니다.");
      if (!write.reason.trim()) return apiError(400, "COMPANY_INVALID_INPUT", "요청 사유는 필수입니다.");
      const proposal: Mutable<AdminCompany> = { ...company };
      apply(proposal, write.company);
      const id = Math.max(0, ...editRequests.map((item) => item.id)) + 1;
      editRequests.unshift({
        id,
        company: { ...company },
        proposal: {
          name: proposal.name,
          representativeName: proposal.representativeName,
          representativeNamePublic: proposal.representativeNamePublic,
          links: proposal.links,
          foundedOn: proposal.foundedOn,
          address: proposal.address,
          addressPublic: proposal.addressPublic,
          region: proposal.region,
          phone: proposal.phone,
          description: proposal.description,
          history: proposal.history,
        },
        changedFields: write.changedFields,
        reason: write.reason.trim(),
        contact: blankToNull(write.contact),
        createdAt: new Date().toISOString(),
      });
      return HttpResponse.json({ id }, { status: 201 });
    }),

    http.get("/api/v1/admin/company-edit-requests", async () => {
      if (realLoginEnabled) return passthrough();
      await delay(120);
      return rejectNonAdmin() ?? HttpResponse.json({
        requests: editRequests.map((item) => ({
          ...item, company: companies.find((company) => company.id === item.company.id) ?? item.company,
        })),
      });
    }),

    http.post("/api/v1/admin/company-edit-requests/:requestId/apply", async ({ params, request }) => {
      if (realLoginEnabled) return passthrough();
      await delay(150);
      const rejected = rejectNonAdmin();
      if (rejected) return rejected;
      const index = editRequests.findIndex((item) => item.id === Number(params.requestId));
      if (index < 0) return apiError(404, "COMPANY_EDIT_REQUEST_NOT_FOUND", "수정 요청을 찾을 수 없습니다.");
      const company = companies.find((candidate) => candidate.id === editRequests[index].company.id);
      if (!company) return apiError(404, "COMPANY_NOT_FOUND", "공연사를 찾을 수 없습니다.");
      const write = await request.json() as AdminCompanyWrite;
      const invalid = validate(write);
      if (invalid) return apiError(400, "COMPANY_INVALID_INPUT", invalid);
      apply(company, write);
      editRequests.splice(index, 1);
      return HttpResponse.json(company);
    }),

    http.post("/api/v1/admin/company-edit-requests/:requestId/reject", async ({ params }) => {
      if (realLoginEnabled) return passthrough();
      await delay(120);
      const rejected = rejectNonAdmin();
      if (rejected) return rejected;
      const index = editRequests.findIndex((item) => item.id === Number(params.requestId));
      if (index < 0) return apiError(404, "COMPANY_EDIT_REQUEST_NOT_FOUND", "수정 요청을 찾을 수 없습니다.");
      editRequests.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
    }),

    http.get("/api/v1/admin/companies", async () => {
      if (realLoginEnabled) return passthrough();
      await delay(120);
      return rejectNonAdmin() ?? HttpResponse.json({ companies: [...companies].sort((a, b) => b.id - a.id) });
    }),

    http.post("/api/v1/admin/companies", async ({ request }) => {
      if (realLoginEnabled) return passthrough();
      await delay(150);
      const rejected = rejectNonAdmin();
      if (rejected) return rejected;
      const write = await request.json() as AdminCompanyWrite;
      const invalid = validate(write);
      if (invalid) return apiError(400, "COMPANY_INVALID_INPUT", invalid);
      const created: Mutable<AdminCompany> = {
        ...companies[0], id: Math.max(...companies.map((company) => company.id)) + 1, status: "PENDING",
        createdAt: new Date().toISOString(),
      };
      apply(created, write);
      companies.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),

    http.put("/api/v1/admin/companies/:companyId", async ({ params, request }) => {
      if (realLoginEnabled) return passthrough();
      await delay(150);
      const rejected = rejectNonAdmin();
      if (rejected) return rejected;
      const company = companies.find((candidate) => candidate.id === Number(params.companyId));
      if (!company) return apiError(404, "COMPANY_NOT_FOUND", "공연사를 찾을 수 없습니다.");
      const write = await request.json() as AdminCompanyWrite;
      const invalid = validate(write);
      if (invalid) return apiError(400, "COMPANY_INVALID_INPUT", invalid);
      apply(company, write);
      return HttpResponse.json(company);
    }),

    http.patch("/api/v1/admin/companies/:companyId/status", async ({ params, request }) => {
      if (realLoginEnabled) return passthrough();
      await delay(120);
      const rejected = rejectNonAdmin();
      if (rejected) return rejected;
      const company = companies.find((candidate) => candidate.id === Number(params.companyId));
      if (!company) return apiError(404, "COMPANY_NOT_FOUND", "공연사를 찾을 수 없습니다.");
      const { status } = await request.json() as { readonly status: AdminCompanyStatus };
      if (status === "PENDING" && company.status !== "PENDING") {
        return apiError(400, "COMPANY_INVALID_INPUT", "공개 여부를 정한 공연사는 검토 전으로 돌릴 수 없습니다.");
      }
      if (company.status !== status) {
        company.status = status;
        company.updatedAt = new Date().toISOString();
      }
      return HttpResponse.json(company);
    }),

    http.patch("/api/v1/admin/audition-posts/:postId/company", () => passthrough()),
    http.get("/api/v1/admin/audition-posts/:postId/company-profile", () => passthrough()),
    http.put("/api/v1/admin/audition-posts/:postId/company-profile", () => passthrough()),
    http.get("/api/v1/admin/audition-post-company-links", () => passthrough()),
    http.post("/api/v1/admin/audition-post-company-links", () => passthrough()),
    http.post("/api/v1/admin/audition-post-company-links/companies", () => passthrough()),
    http.post("/api/v1/admin/audition-post-company-links/companies/bulk", () => passthrough()),
    http.delete("/api/v1/admin/audition-post-company-links/:linkId", () => passthrough()),
  ];
}
