import { delay, http, HttpResponse, passthrough } from "msw";
import type { Applicant, AuditionBoardResponse, RoundNumber, SaveReviewRequest } from "@/features/auditions/types";
import { roleId, ROUND_NUMBERS } from "@/features/auditions/types";
import { findRole, roundStatesOf } from "./aggregate";
import { CATALOG } from "./catalog";
import { toApplicant, toPerformanceRef, toPostingRef, toRoleSummary } from "./serialize";
import { activeRound, poolFor, reviewOf } from "./store";

const apiPath = "/api";
const notFound = (message: string, code = "ROLE_NOT_FOUND") => HttpResponse.json({ code, message }, { status: 404 });
const badRequest = (code: string, message: string) => HttpResponse.json({ code, message }, { status: 400 });
const isRoundNumber = (value: number): value is RoundNumber => ROUND_NUMBERS.some((round) => round === value);
const parseRound = (raw: string): RoundNumber | null => { const parsed = Number(raw); return Number.isInteger(parsed) && isRoundNumber(parsed) ? parsed : null; };

function buildBoard(rawRoleId: string, round: RoundNumber, url?: URL): AuditionBoardResponse | null {
  const found = findRole(roleId(rawRoleId));
  if (!found) return null;
  const performance = CATALOG.find((candidate) => candidate.postings.some((posting) => posting.id === found.posting.id));
  if (!performance) return null;
  const applicants = poolFor(found.role.id, round).map((applicant) => toApplicant(applicant, found.role, round));
  return { performance: toPerformanceRef(performance), posting: toPostingRef(found.posting), role: toRoleSummary(found.role, found.posting), round, rounds: roundStatesOf(found.role.id), applicants: url ? applicants.filter((applicant) => matchesSearch(applicant, url)) : applicants };
}

function matchesSearch(applicant: Applicant, url: URL) {
  const work = url.searchParams.get("work");
  const status = url.searchParams.get("status");
  if (work === "PENDING" && applicant.review.status !== "PENDING") return false;
  if (work === "DONE" && applicant.review.status === "PENDING") return false;
  if (status && applicant.review.status !== status) return false;
  const keyword = url.searchParams.get("keyword")?.trim().toLocaleLowerCase("ko-KR");
  if (keyword && ![applicant.name, applicant.school, applicant.phone, applicant.email, applicant.roleName]
    .some((value) => value.toLocaleLowerCase("ko-KR").includes(keyword))) return false;
  const genders = url.searchParams.getAll("gender");
  if (genders.length > 0 && (applicant.gender === null || !genders.includes(applicant.gender))) return false;
  if (!matchesNumeric(applicant.age, url, "age")) return false;
  if (!matchesNumeric(applicant.height, url, "height")) return false;
  if (!matchesNumeric(applicant.weight, url, "weight")) return false;
  return url.searchParams.get("mismatchOnly") !== "true" || applicant.mismatchReasons.length > 0;
}

function matchesNumeric(value: number | null, url: URL, field: "age" | "height" | "weight") {
  const expected = url.searchParams.get(field);
  if (expected === null) return true;
  if (value === null) return false;
  const threshold = Number(expected);
  return url.searchParams.get(`${field}Operator`) === "LTE" ? value <= threshold : value >= threshold;
}

export const screeningHandlers = [
  http.get(`${apiPath}/screenings/roles/:roleId`, async ({ params, request }) => {
    await delay(300);
    const found = findRole(roleId(String(params.roleId)));
    if (!found) return notFound("배역을 찾을 수 없습니다.");
    const url = new URL(request.url);
    const requested = url.searchParams.get("round");
    const round = requested === null ? activeRound(found.role.id) : parseRound(requested);
    if (round === null) return badRequest("INVALID_ROUND_NUMBER", "올바른 차수가 아닙니다.");
    const board = buildBoard(String(params.roleId), round, url);
    return board ? HttpResponse.json(board) : notFound("배역을 찾을 수 없습니다.");
  }),
  http.patch(`${apiPath}/v1/audition-roles/:roleId/screening-rounds/:round/reviews`, async ({ params, request }) => {
    if (/^[1-9]\d*$/.test(String(params.roleId))) return passthrough();
    await delay(200);
    const body = (await request.json()) as Omit<SaveReviewRequest, "roleId" | "round">;
    const targetRoleId = roleId(String(params.roleId));
    const round = parseRound(String(params.round));
    if (!findRole(targetRoleId)) return notFound("배역을 찾을 수 없습니다.");
    if (round === null) return badRequest("INVALID_ROUND_NUMBER", "올바른 차수가 아닙니다.");
    if (body.submissionIds.length === 0) return badRequest("SUBMISSION_REQUIRED", "배우를 한 명 이상 선택해 주세요.");
    if (body.status === "ETC" && !body.memo?.trim()) return badRequest("MEMO_REQUIRED", "기타 사유를 입력해 주세요.");
    const pool = poolFor(targetRoleId, round);
    const targets = body.submissionIds.filter((submissionId) => pool.some((applicant) => applicant.id === submissionId));
    if (targets.length !== body.submissionIds.length) return notFound("지원서를 찾을 수 없습니다.", "SUBMISSION_NOT_FOUND");
    if (body.status === undefined && body.memo !== undefined && targets.some((submissionId) => reviewOf(submissionId, targetRoleId, round).status === "ETC") && !body.memo.trim()) return badRequest("MEMO_REQUIRED", "기타 사유를 입력해 주세요.");
    for (const submissionId of targets) {
      const review = reviewOf(submissionId, targetRoleId, round);
      if (body.status !== undefined) {
        review.status = body.status;
        review.memo = body.status === "ETC" ? body.memo?.trim() ?? "" : "";
      } else if (body.memo !== undefined && review.status === "ETC") {
        review.memo = body.memo.trim();
      }
      if (body.note !== undefined) review.note = body.note;
    }
    const board = buildBoard(targetRoleId, round);
    return board ? HttpResponse.json(board) : notFound("배역을 찾을 수 없습니다.");
  }),
];
