import { delay, http, HttpResponse } from "msw";
import { ACTOR_CHEER_MAX_LENGTH, type ActorPageCheer, type ActorPageCheers } from "@/features/actor-pages/cheer-api";
import { mockCurrentSession } from "./auth-handlers";

/**
 * 배우 페이지 응원 글 목. 페이지를 처음 열면 다른 팬 둘의 응원 글을 시드로 두고, 목 세션이 쓴 글은 메모리에만 남는다.
 * 서버처럼 팬 번호는 그 페이지에서 처음 응원한 순서(지운 글 포함)이고, 로그인하지 않았으면 401, 일반 회원이 아니면 403,
 * 내 페이지에는 403, 남의 글 수정·삭제는 403, 목록에 없는 페이지는 404로 답한다.
 */
type StoredCheer = {
  readonly id: number;
  readonly authorMemberId: number;
  body: string;
  readonly createdAt: string;
  updatedAt: string;
  deleted: boolean;
};

type ListedPage = { readonly publicId: string };

const SEEDS = [
  { authorMemberId: 101, body: "공연 정말 잘 봤어요! 다음 작품도 기대할게요.", hoursAgo: 30 },
  { authorMemberId: 102, body: "무대 위 모습이 오래 기억에 남아요.\n앞으로도 응원합니다.", hoursAgo: 5 },
  { authorMemberId: 101, body: "목소리가 정말 좋아요.", hoursAgo: 1 },
] as const;

const store = new Map<string, StoredCheer[]>();
let nextId = 1;

function cheersOf(publicId: string): StoredCheer[] {
  const existing = store.get(publicId);
  if (existing) return existing;
  const now = Date.now();
  const seeded = SEEDS.map((seed) => {
    const at = new Date(now - seed.hoursAgo * 3_600_000).toISOString();
    return { id: nextId++, authorMemberId: seed.authorMemberId, body: seed.body, createdAt: at, updatedAt: at, deleted: false };
  });
  store.set(publicId, seeded);
  return seeded;
}

function fanNumberOf(cheers: readonly StoredCheer[], memberId: number): number {
  const order = [...new Set(cheers.map((cheer) => cheer.authorMemberId))];
  return order.indexOf(memberId) + 1;
}

function toResult(cheers: readonly StoredCheer[], cheer: StoredCheer, memberId: number | null): ActorPageCheer {
  return {
    id: cheer.id,
    fanNumber: fanNumberOf(cheers, cheer.authorMemberId),
    body: cheer.body,
    mine: memberId !== null && cheer.authorMemberId === memberId,
    createdAt: cheer.createdAt,
    edited: cheer.updatedAt !== cheer.createdAt,
  };
}

const error = (status: number, code: string, message: string) => HttpResponse.json({ code, message }, { status });
const notFound = () => error(404, "ACTOR_PAGE_NOT_FOUND", "배우 페이지를 찾을 수 없습니다.");

function invalidBody(body: unknown): string | null {
  if (typeof body !== "string" || body.trim() === "") return "응원 글 내용을 입력해 주세요.";
  if (body.trim().length > ACTOR_CHEER_MAX_LENGTH) return `응원 글은 최대 ${ACTOR_CHEER_MAX_LENGTH}자까지 쓸 수 있어요.`;
  return null;
}

/** @param ownerPublicId 목 배우 본인의 공개 페이지 ID다. */
export function actorPageCheerHandlers(
  findListed: (publicId: string) => ListedPage | undefined,
  ownerPublicId: () => string | null,
) {
  const GUARD = (publicId: string) => {
    const session = mockCurrentSession();
    if (!session) return { response: error(401, "AUTH_UNAUTHENTICATED", "로그인이 필요합니다.") };
    if (session.role !== "APPLICANT" || session.status !== "ACTIVE") {
      return { response: error(403, "AUTH_FORBIDDEN", "일반 회원 계정으로 참여해 주세요.") };
    }
    if (!findListed(publicId)) return { response: notFound() };
    return { memberId: session.memberId };
  };

  return [
    http.get("/api/v1/public/actor-pages/:publicId/cheers", async ({ params, request }) => {
      await delay(100);
      const publicId = String(params.publicId);
      if (!findListed(publicId)) return notFound();
      const query = new URL(request.url).searchParams;
      const before = query.get("before") === null ? Number.MAX_SAFE_INTEGER : Number(query.get("before"));
      const size = Number(query.get("size") ?? 10);
      if (!Number.isInteger(size) || size < 1 || size > 30 || Number.isNaN(before) || before < 1) {
        return error(400, "INVALID_REQUEST", "목록 조회 조건이 올바르지 않습니다.");
      }
      const session = mockCurrentSession();
      const memberId = session?.memberId ?? null;
      const cheers = cheersOf(publicId);
      const visible = cheers.filter((cheer) => !cheer.deleted && cheer.id < before).sort((a, b) => b.id - a.id);
      const page = visible.slice(0, size);
      const applicant = session?.role === "APPLICANT" && session.status === "ACTIVE";
      const owner = applicant && ownerPublicId() === publicId;
      const body: ActorPageCheers = {
        totalCount: cheers.filter((cheer) => !cheer.deleted).length,
        cheers: page.map((cheer) => toResult(cheers, cheer, memberId)),
        nextBefore: visible.length > size ? page[page.length - 1].id : null,
        me: { loggedIn: session !== null, owner, canWrite: applicant && !owner },
      };
      return HttpResponse.json(body);
    }),

    http.post("/api/v1/actor-pages/:publicId/cheers", async ({ params, request }) => {
      await delay(140);
      const publicId = String(params.publicId);
      const guard = GUARD(publicId);
      if ("response" in guard) return guard.response;
      if (ownerPublicId() === publicId) return error(403, "ACTOR_PAGE_SELF_CHEER", "내 배우 페이지에는 응원 글을 쓸 수 없어요.");
      const { body } = await request.json() as { body?: unknown };
      const invalid = invalidBody(body);
      if (invalid) return error(400, "INVALID_REQUEST", invalid);
      const cheers = cheersOf(publicId);
      const now = new Date().toISOString();
      const created: StoredCheer = { id: nextId++, authorMemberId: guard.memberId, body: String(body).trim(), createdAt: now, updatedAt: now, deleted: false };
      cheers.push(created);
      return HttpResponse.json(toResult(cheers, created, guard.memberId), { status: 201 });
    }),

    http.patch("/api/v1/actor-pages/:publicId/cheers/:cheerId", async ({ params, request }) => {
      await delay(140);
      const publicId = String(params.publicId);
      const guard = GUARD(publicId);
      if ("response" in guard) return guard.response;
      const cheers = cheersOf(publicId);
      const target = cheers.find((cheer) => cheer.id === Number(params.cheerId) && !cheer.deleted);
      if (!target) return error(404, "ACTOR_CHEER_NOT_FOUND", "응원 글을 찾을 수 없어요.");
      if (target.authorMemberId !== guard.memberId) return error(403, "ACTOR_CHEER_NOT_AUTHOR", "작성자만 수정·삭제할 수 있어요.");
      const { body } = await request.json() as { body?: unknown };
      const invalid = invalidBody(body);
      if (invalid) return error(400, "INVALID_REQUEST", invalid);
      target.body = String(body).trim();
      target.updatedAt = new Date().toISOString();
      return HttpResponse.json(toResult(cheers, target, guard.memberId));
    }),

    http.delete("/api/v1/actor-pages/:publicId/cheers/:cheerId", async ({ params }) => {
      await delay(120);
      const publicId = String(params.publicId);
      const guard = GUARD(publicId);
      if ("response" in guard) return guard.response;
      const target = cheersOf(publicId).find((cheer) => cheer.id === Number(params.cheerId) && !cheer.deleted);
      if (!target) return error(404, "ACTOR_CHEER_NOT_FOUND", "응원 글을 찾을 수 없어요.");
      if (target.authorMemberId !== guard.memberId) return error(403, "ACTOR_CHEER_NOT_AUTHOR", "작성자만 수정·삭제할 수 있어요.");
      target.deleted = true;
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}
