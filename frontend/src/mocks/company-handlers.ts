import { delay, http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import type { AdminCompany, AdminCompanyStatus, AdminCompanyWrite } from "@/features/admin/types";
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
    homepage: "https://www.example.com/unbekannt",
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
    homepage: null,
    foundedOn: null,
    address: null,
    addressPublic: false,
    region: "서울",
    phone: null,
    description: null,
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
    homepage: "https://www.example.com/summer-night",
    foundedOn: null,
    address: null,
    addressPublic: false,
    region: null,
    phone: null,
    description: null,
    sourceNote: null,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
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
    homepage: company.homepage,
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
  if (write.homepage?.trim() && !/^https?:\/\/[^/\s]+/i.test(write.homepage.trim())) {
    return "홈페이지는 http:// 또는 https://로 시작하는 주소여야 합니다.";
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
  target.homepage = blankToNull(write.homepage);
  target.foundedOn = write.foundedOn || null;
  target.address = write.address?.roadAddress.trim() ? write.address : null;
  target.addressPublic = write.addressPublic;
  target.region = blankToNull(write.region);
  target.phone = blankToNull(write.phone);
  target.description = blankToNull(write.description);
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
    http.get("/api/v1/admin/audition-post-company-links", () => passthrough()),
    http.post("/api/v1/admin/audition-post-company-links", () => passthrough()),
    http.post("/api/v1/admin/audition-post-company-links/companies", () => passthrough()),
    http.post("/api/v1/admin/audition-post-company-links/companies/bulk", () => passthrough()),
    http.delete("/api/v1/admin/audition-post-company-links/:linkId", () => passthrough()),
  ];
}
