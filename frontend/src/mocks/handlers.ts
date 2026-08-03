import { delay, http, HttpResponse } from "msw";
import type {
  Performance,
  PerformanceCategory,
  PerformanceSummary,
  PerformanceVisibility,
  SavePerformanceRequest,
  ThumbnailUploadRequest,
} from "@/features/performance/types";
import { MOCK_PRODUCER_ID, performances } from "./performance-data";

const apiPath = "/api/performance";

function findOwnedPerformance(performanceId: string) {
  return performances.find(
    (performance) =>
      performance.id === performanceId && performance.producerId === MOCK_PRODUCER_ID,
  );
}

function isSavePerformanceRequest(body: SavePerformanceRequest) {
  return Boolean(
    body.title?.trim() &&
      body.description?.trim() &&
      body.thumbnailUrl?.trim() &&
      (body.category === "PLAY" || body.category === "MUSICAL") &&
      body.roles?.length > 0 &&
      body.roles.every(
        (role) => role.name.trim() && role.description.trim() && role.gender,
      ),
  );
}

function toPerformanceSummary(performance: Performance): PerformanceSummary {
  const { roles, ...summary } = performance;

  return {
    ...summary,
    roleCount: roles.length,
  };
}

export const handlers = [
  http.get(apiPath, async ({ request }) => {
    await delay(320);

    const url = new URL(request.url);
    const query = url.searchParams.get("query")?.trim().toLocaleLowerCase("ko-KR");
    const category = url.searchParams.get("category") as PerformanceCategory | null;
    const recruiting = url.searchParams.get("recruiting") === "true";

    const ownedPerformances = performances.filter(
      (performance) => performance.producerId === MOCK_PRODUCER_ID,
    );
    const filteredPerformances = ownedPerformances
      .filter((performance) => !query || performance.title.toLocaleLowerCase("ko-KR").includes(query))
      .filter((performance) => !category || performance.category === category)
      .filter((performance) => !recruiting || performance.statistics.openRecruitmentCount > 0)
      .toSorted((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));

    return HttpResponse.json({
      performances: filteredPerformances.map(toPerformanceSummary),
      totalCount: ownedPerformances.length,
    });
  }),

  http.post(`${apiPath}/thumbnail`, async ({ request }) => {
    await delay(280);
    const body = (await request.json()) as ThumbnailUploadRequest;

    if (!body.fileName?.trim() || !body.dataUrl?.startsWith("data:image/")) {
      return HttpResponse.json({ message: "올바른 썸네일 이미지를 선택해주세요." }, { status: 400 });
    }

    return HttpResponse.json({ thumbnailUrl: body.dataUrl }, { status: 201 });
  }),

  http.get(`${apiPath}/:performanceId`, async ({ params }) => {
    await delay(260);
    const performance = findOwnedPerformance(String(params.performanceId));

    if (!performance) {
      return HttpResponse.json({ message: "공연을 찾을 수 없습니다." }, { status: 404 });
    }

    return HttpResponse.json(performance);
  }),

  http.post(apiPath, async ({ request }) => {
    await delay(420);
    const body = (await request.json()) as SavePerformanceRequest;

    if (!isSavePerformanceRequest(body)) {
      return HttpResponse.json({ message: "필수 공연 정보를 모두 입력해주세요." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const performance: Performance = {
      ...body,
      id: crypto.randomUUID(),
      producerId: MOCK_PRODUCER_ID,
      visibility: "HIDDEN",
      statistics: {
        totalRecruitmentCount: 0,
        openRecruitmentCount: 0,
        totalApplicantCount: 0,
      },
      latestRecruitment: null,
      updatedAt: now,
    };

    performances.unshift(performance);
    return HttpResponse.json(performance, { status: 201 });
  }),

  http.put(`${apiPath}/:performanceId`, async ({ params, request }) => {
    await delay(420);
    const performance = findOwnedPerformance(String(params.performanceId));
    const body = (await request.json()) as SavePerformanceRequest;

    if (!performance) {
      return HttpResponse.json({ message: "공연을 찾을 수 없습니다." }, { status: 404 });
    }
    if (!isSavePerformanceRequest(body)) {
      return HttpResponse.json({ message: "필수 공연 정보를 모두 입력해주세요." }, { status: 400 });
    }

    Object.assign(performance, body, { updatedAt: new Date().toISOString() });
    return HttpResponse.json(performance);
  }),

  http.patch(`${apiPath}/:performanceId/visibility`, async ({ params, request }) => {
    await delay(240);
    const performance = findOwnedPerformance(String(params.performanceId));
    const body = (await request.json()) as { visibility: PerformanceVisibility };

    if (!performance) {
      return HttpResponse.json({ message: "공연을 찾을 수 없습니다." }, { status: 404 });
    }
    if (body.visibility !== "DISPLAYED" && body.visibility !== "HIDDEN") {
      return HttpResponse.json({ message: "올바른 전시 상태가 아닙니다." }, { status: 400 });
    }

    performance.visibility = body.visibility;
    performance.updatedAt = new Date().toISOString();
    return HttpResponse.json(performance);
  }),
];
