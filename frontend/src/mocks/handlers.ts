import { delay, http, HttpResponse } from "msw";
import type {
  CloseRoundRequest,
  RoundNumber,
  SaveReviewRequest,
  ScreeningBoardResponse,
} from "@/features/screening/types";
import type {
  CreatePerformanceRequest,
  CreatePostingRequest,
} from "@/features/screening/creation-types";
import { performanceId, postingId, roleId, ROUND_NUMBERS } from "@/features/screening/types";
import { findPerformance, findPosting, findRole, roundStatesOf } from "./screening/aggregate";
import {
  toApplicant,
  toPerformanceRef,
  toPerformanceSummary,
  toPostingRef,
  toPostingListResponse,
  toPostingSummary,
  toRoleSummary,
  toScreeningTree,
} from "./screening/serialize";
import { CATALOG } from "./screening/catalog";
import { countsFor } from "./screening/aggregate";
import {
  activeRound,
  isRoundClosed,
  markRoundClosed,
  poolFor,
  reviewOf,
  roundNumbersForRole,
} from "./screening/store";
import { addPerformance, addPosting } from "./screening/create";

const apiPath = "/api/screening";

const notFound = (message: string) => HttpResponse.json({ message }, { status: 404 });
const badRequest = (message: string) => HttpResponse.json({ message }, { status: 400 });

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isRoundNumber = (value: number): value is RoundNumber =>
  ROUND_NUMBERS.some((round) => round === value);

function parseRound(raw: string): RoundNumber | null {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && isRoundNumber(parsed) ? parsed : null;
}

/** 심사 화면 한 벌. 상태를 바꾼 뒤에도 같은 모양으로 되돌려 클라이언트를 갱신한다. */
function buildBoard(rawRoleId: string, round: RoundNumber): ScreeningBoardResponse | null {
  const found = findRole(roleId(rawRoleId));
  if (!found) return null;

  const performance = CATALOG.find((candidate) =>
    candidate.postings.some((posting) => posting.id === found.posting.id),
  );
  if (!performance) return null;

  return {
    performance: toPerformanceRef(performance),
    posting: toPostingRef(found.posting),
    role: toRoleSummary(found.role, found.posting),
    round,
    rounds: roundStatesOf(found.role.id),
    applicants: poolFor(found.role.id, round).map((applicant) =>
      toApplicant(applicant, found.role, round),
    ),
  };
}

export const handlers = [
  http.get(`${apiPath}/tree`, async () => {
    await delay(180);
    return HttpResponse.json(toScreeningTree());
  }),

  http.get(`${apiPath}/performance`, async () => {
    await delay(260);
    return HttpResponse.json({ performances: CATALOG.map(toPerformanceSummary) });
  }),

  http.get(`${apiPath}/performance/:performanceId`, async ({ params }) => {
    await delay(260);
    const performance = findPerformance(performanceId(String(params.performanceId)));
    if (!performance) return notFound("공연을 찾을 수 없습니다.");

    return HttpResponse.json(toPostingListResponse(performance));
  }),

  http.post(`${apiPath}/performance`, async ({ request }) => {
    await delay(240);
    const body = (await request.json()) as CreatePerformanceRequest;
    if (!hasText(body.posterUrl)) return badRequest("공연 포스터를 선택해 주세요.");
    if (!hasText(body.title)) return badRequest("공연 제목을 입력해 주세요.");
    if (!hasText(body.venue)) return badRequest("공연 장소를 입력해 주세요.");
    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      return badRequest("배역을 하나 이상 추가해 주세요.");
    }
    if (body.roles.some((role) => !hasText(role.name))) {
      return badRequest("모든 배역의 이름을 입력해 주세요.");
    }
    if (body.roles.some((role) => role.ageMin < 0 || role.ageMax < role.ageMin)) {
      return badRequest("배역의 나이 조건을 확인해 주세요.");
    }

    addPerformance(body);
    return HttpResponse.json({ performances: CATALOG.map(toPerformanceSummary) }, { status: 201 });
  }),

  http.get(`${apiPath}/posting/:postingId`, async ({ params }) => {
    await delay(260);
    const posting = findPosting(postingId(String(params.postingId)));
    if (!posting) return notFound("공고를 찾을 수 없습니다.");

    const performance = findPerformance(posting.performanceId);
    if (!performance) return notFound("공연을 찾을 수 없습니다.");

    return HttpResponse.json({
      performance: toPerformanceRef(performance),
      posting: toPostingSummary(posting),
      roles: posting.roles.map((role) => toRoleSummary(role, posting)),
    });
  }),

  http.post(`${apiPath}/posting`, async ({ request }) => {
    await delay(260);
    const body = (await request.json()) as CreatePostingRequest;
    const performance = findPerformance(body.performanceId);
    if (!performance) return notFound("공연을 찾을 수 없습니다.");
    if (!hasText(body.title)) return badRequest("공고 제목을 입력해 주세요.");
    if (!hasText(body.recruitmentStart) || !hasText(body.recruitmentEnd)) {
      return badRequest("모집 기간을 입력해 주세요.");
    }
    if (body.recruitmentStart > body.recruitmentEnd) {
      return badRequest("모집 종료일은 시작일보다 빠를 수 없습니다.");
    }
    if (!Array.isArray(body.roles) || body.roles.length === 0) {
      return badRequest("모집할 배역을 하나 이상 선택해 주세요.");
    }
    if (body.roles.some((role) => role.quota < 1)) {
      return badRequest("배역별 모집 인원은 1명 이상이어야 합니다.");
    }
    const templateIds = new Set(performance.roleTemplates.map((role) => role.id));
    if (body.roles.some((role) => !templateIds.has(role.templateId))) {
      return badRequest("공연에 등록되지 않은 배역이 포함되어 있습니다.");
    }
    if (!Array.isArray(body.rounds) || body.rounds.length < 2 || body.rounds.length > 3) {
      return badRequest("전형은 2개 이상 3개 이하로 설정해 주세요.");
    }
    if (body.rounds.some((round, index) => round.round !== index + 1 || !hasText(round.name))) {
      return badRequest("전형 이름과 차수 순서를 확인해 주세요.");
    }
    const dates = body.rounds.map((round) => round.date);
    if (
      dates.some((date) => !hasText(date)) ||
      dates[0]! < body.recruitmentEnd ||
      dates.some((date, index) => index > 0 && date < dates[index - 1]!)
    ) {
      return badRequest("전형 일정은 모집 종료 이후 차수 순서대로 입력해 주세요.");
    }
    if (
      !Array.isArray(body.applicationFields) ||
      body.applicationFields.filter((field) => field.enabled).some((field) => !hasText(field.label))
    ) {
      return badRequest("지원서 항목 이름을 확인해 주세요.");
    }

    addPosting(performance, body);
    return HttpResponse.json(toPostingListResponse(performance), { status: 201 });
  }),

  http.get(`${apiPath}/role/:roleId`, async ({ params, request }) => {
    await delay(300);
    const found = findRole(roleId(String(params.roleId)));
    if (!found) return notFound("배역을 찾을 수 없습니다.");

    const requested = new URL(request.url).searchParams.get("round");
    // 차수를 지정하지 않으면 아직 마감되지 않은 가장 이른 차수를 연다.
    const round = requested === null ? activeRound(found.role.id) : parseRound(requested);
    if (round === null) return badRequest("올바른 차수가 아닙니다.");

    const board = buildBoard(String(params.roleId), round);
    return board ? HttpResponse.json(board) : notFound("배역을 찾을 수 없습니다.");
  }),

  http.patch(`${apiPath}/review`, async ({ request }) => {
    await delay(200);
    const body = (await request.json()) as SaveReviewRequest;
    const found = findRole(body.roleId);
    if (!found) return notFound("배역을 찾을 수 없습니다.");
    if (!isRoundNumber(body.round)) return badRequest("올바른 차수가 아닙니다.");
    if (isRoundClosed(body.roleId, body.round)) {
      return badRequest("마감된 차수는 결과를 변경할 수 없습니다.");
    }

    const pool = poolFor(body.roleId, body.round);
    for (const applicationId of body.applicationIds) {
      if (!pool.some((applicant) => applicant.id === applicationId)) continue;

      const review = reviewOf(applicationId, body.round);
      if (body.status !== undefined) {
        review.status = body.status;
        if (body.status !== "ETC") review.memo = "";
      }
      if (body.memo !== undefined) review.memo = body.memo;
      if (body.note !== undefined) review.note = body.note;
    }

    const board = buildBoard(body.roleId, body.round);
    return board ? HttpResponse.json(board) : notFound("배역을 찾을 수 없습니다.");
  }),

  http.post(`${apiPath}/round/close`, async ({ request }) => {
    await delay(240);
    const body = (await request.json()) as CloseRoundRequest;
    const found = findRole(body.roleId);
    if (!found) return notFound("배역을 찾을 수 없습니다.");
    if (!isRoundNumber(body.round)) return badRequest("올바른 차수가 아닙니다.");
    if (isRoundClosed(body.roleId, body.round)) return badRequest("이미 마감된 차수입니다.");

    const counts = countsFor(body.roleId, body.round);
    if (counts.all === 0) return badRequest("심사할 지원자가 없어 마감할 수 없습니다.");
    if (counts.pending > 0) return badRequest("검토 대기 중인 지원자가 남아 마감할 수 없습니다.");

    markRoundClosed(body.roleId, body.round);
    const rounds = roundNumbersForRole(body.roleId);
    const currentIndex = rounds.indexOf(body.round);
    const nextRound = rounds[currentIndex + 1] ?? body.round;

    const board = buildBoard(body.roleId, nextRound);
    return board ? HttpResponse.json(board) : notFound("배역을 찾을 수 없습니다.");
  }),
];
