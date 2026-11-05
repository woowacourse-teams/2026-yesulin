import { mockCurrentSession } from "./auth-handlers";
import type { SessionResponse } from "@/features/auth/session-api";
import type { CommunityProfile, CommunityAuthorMode } from "@/features/community/types";
import { http, HttpResponse } from "msw";
import { normalizeComment, normalizePost } from "@/features/community/draft";
import { reportReasons, type CommunityEntry, type CommunityPage } from "@/features/community/types";

type StoredEntry = { value: CommunityEntry; owner: string; parent: number | null; deleted: boolean; requestId: string; original: string };
type Payload = { replyToId?: number | null; authorMode?: CommunityAuthorMode; expectedMemberId?: number; requestId?: string; title?: string; body?: string; reason?: string; detail?: string };

class MockFailure extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

class CommunityStore {
  private entries = new Map<number, StoredEntry>();
  private reports = new Map<string, string>();
  private sequence = 0;
  private notices = new Map<number, { recipient: string; seen: boolean }>();

  inbox(owner: string) {
    return [...this.notices.entries()].reverse().flatMap(([id, notice]) => {
      const comment = this.entries.get(id);
      const post = this.entries.get(comment?.parent ?? -1);
      if (notice.recipient !== owner || !comment || comment.deleted || !post || post.deleted) return [];
      return [{ commentId: id, postId: post.value.id, title: post.value.title, replyToId: comment.value.replyToId, seen: notice.seen }];
    }).slice(0, 20);
  }

  readNotice(owner: string, id: number) {
    const notice = this.notices.get(id);
    if (notice?.recipient === owner) notice.seen = true;
  }

  private likes = new Map<number, Set<string>>();

  constructor(private readonly profile: (member: number) => CommunityProfile | null) {}

  private publicProfile(entry: StoredEntry) {
    if (entry.value.authorMode !== "PROFILE") return {};
    const profile = this.profile(Number(entry.owner.slice(7)));
    if (!profile?.path) return { author: "프로필 비공개", authorPhotoUrl: null, authorPath: null };
    return { author: profile.name, authorPhotoUrl: profile.photoUrl, authorPath: profile.path };
  }

  find(id: number): StoredEntry {
    const entry = this.entries.get(id);
    if (!entry || entry.deleted) throw new MockFailure(404, "COMMUNITY_NOT_FOUND", "글이나 댓글을 찾을 수 없어요.");
    if (entry.parent !== null) this.find(entry.parent);
    return entry;
  }

  post(id: number) {
    const entry = this.find(id);
    if (entry.parent !== null) throw new MockFailure(404, "COMMUNITY_NOT_FOUND", "글을 찾을 수 없어요.");
    return entry;
  }

  comment(postId: number, id: number) {
    this.post(postId);
    const entry = this.find(id);
    if (entry.parent !== postId) throw new MockFailure(404, "COMMUNITY_NOT_FOUND", "댓글을 찾을 수 없어요.");
    return entry;
  }

  view(entry: StoredEntry, owner: string, browser = owner): CommunityEntry {
    const likes = this.likes.get(entry.value.id) ?? new Set<string>();
    const editable = entry.owner === owner || (!entry.owner.startsWith("member:") && entry.owner === browser);
    const profile = this.publicProfile(entry);
    return { ...entry.value, ...profile, editable, likeCount: likes.size, liked: likes.has(browser) };
  }

  react(id: number, owner: string, liked: boolean) {
    this.post(id);
    const likes = this.likes.get(id) ?? new Set<string>();
    this.likes.set(id, likes);
    if (liked) likes.add(owner);
    if (!liked) likes.delete(owner);
    return { likeCount: likes.size, liked: likes.has(owner) };
  }

  private author(parent: number | null, owner: string, mode: CommunityAuthorMode) {
    if (parent === null) return "익명1";
    const post = this.post(parent);
    const owners = new Set([`${post.owner}:${post.value.authorMode}`]);
    for (const entry of this.entries.values()) {
      if (entry.parent === parent) owners.add(`${entry.owner}:${entry.value.authorMode}`);
    }
    const participant = `${owner}:${mode}`;
    owners.add(participant);
    return `익명${[...owners].indexOf(participant) + 1}`;
  }

  list(parent: number | null, cursor: number, owner: string, browser = owner): CommunityPage {
    if (parent !== null) this.post(parent);
    const entries = [...this.entries.values()].filter(entry => eligible(entry, parent, cursor));
    entries.sort((left, right) => compareEntries(left, right, parent));
    let size = 20;
    if (parent === null) size = 5;
    const items = entries.slice(0, size).map(entry => this.view(entry, owner, browser));
    let nextCursor: number | null = null;
    if (entries.length > size) nextCursor = items[size - 1].id;
    return { items, nextCursor };
  }

  create(parent: number | null, owner: string, input: Payload) {
    requireRequestId(input.requestId);
    if (parent !== null) this.post(parent);
    if (input.authorMode !== "ANONYMOUS" && input.authorMode !== "PROFILE") throw new Error("작성 방식을 선택해 주세요.");
    if (input.authorMode === "PROFILE" && !this.profile(Number(owner.slice(7)))?.path) throw new MockFailure(409, "COMMUNITY_PROFILE_REQUIRED", "공개된 배우 페이지가 필요해요.");
    const content = { ...normalized(parent, input), authorMode: input.authorMode };
    const replyToId = replyTarget(parent, input);
    const original = JSON.stringify({ parent, ...content, replyToId });
    const retry = [...this.entries.values()].find(entry => entry.requestId === input.requestId);
    if (retry) return this.replay(retry, owner, original);
    if (parent !== null && replyToId !== null && this.comment(parent, replyToId).value.replyToId != null) {
      throw new MockFailure(404, "COMMUNITY_NOT_FOUND", "원댓글을 찾을 수 없어요.");
    }
    return this.insert(parent, owner, input.requestId!, { ...content, replyToId }, original);
  }

  edit(entry: StoredEntry, owner: string, input: Payload) {
    requireOwner(entry, owner);
    entry.value = { ...entry.value, ...normalized(entry.parent, input), updatedAt: new Date().toISOString() };
    return this.view(entry, owner);
  }

  remove(entry: StoredEntry, owner: string) {
    requireOwner(entry, owner);
    entry.deleted = true;
    if (entry.parent !== null) this.changeCount(entry.parent, -1);
  }

  report(id: number, owner: string, input: Payload) {
    this.find(id);
    requireRequestId(input.requestId);
    if (!input.reason || !Object.hasOwn(reportReasons, input.reason)) throw new Error("신고 사유를 선택해 주세요.");
    if ((input.detail?.length ?? 0) > 1000) throw new Error("상세 설명은 1,000자 이내로 적어 주세요.");
    const content = JSON.stringify({ id, owner, reason: input.reason, detail: (input.detail ?? "").trim() });
    const previous = this.reports.get(input.requestId!);
    if (previous && previous !== content) throw conflict();
    this.reports.set(input.requestId!, content);
  }

  private insert(parent: number | null, owner: string, requestId: string, content: { replyToId: number | null; title: string | null; body: string; authorMode: CommunityAuthorMode }, original: string) {
    const id = ++this.sequence;
    const createdAt = new Date().toISOString();
    const value = { id, ...content, memberOwned: true, authorPhotoUrl: null, authorPath: null, postAuthor: parent === null || (this.post(parent).owner === owner && this.post(parent).value.authorMode === content.authorMode), author: this.author(parent, owner, content.authorMode), createdAt, updatedAt: createdAt, commentCount: 0, editable: false, likeCount: 0, liked: false };
    const entry = { value, owner, parent, deleted: false, requestId, original };
    this.entries.set(id, entry);
    const target = content.replyToId ?? parent;
    const recipient = this.entries.get(target ?? -1)?.owner;
    if (recipient?.startsWith("member:") && recipient !== owner) this.notices.set(id, { recipient, seen: false });
    if (parent !== null) this.changeCount(parent, 1);
    return this.view(entry, owner);
  }

  private replay(entry: StoredEntry, owner: string, original: string) {
    if (entry.owner !== owner || entry.original !== original) throw conflict();
    return this.view(this.find(entry.value.id), owner);
  }

  private changeCount(id: number, change: number) {
    const entry = this.post(id);
    entry.value = { ...entry.value, commentCount: entry.value.commentCount + change };
  }


}

function replyTarget(postId: number | null, input: Payload) {
  if (postId === null || input.replyToId == null) return null;
  if (!Number.isSafeInteger(input.replyToId) || input.replyToId < 1) throw new Error("답글 대상을 확인해 주세요.");
  return input.replyToId;
}

function requireOwner(entry: StoredEntry, owner: string) {
  if (entry.owner !== owner) throw new MockFailure(403, "COMMUNITY_NOT_OWNER", "작성한 브라우저에서만 수정·삭제할 수 있어요.");
}

function conflict() {
  return new MockFailure(409, "COMMUNITY_REQUEST_CONFLICT", "이미 사용한 요청 번호예요.");
}

function requireRequestId(value: string | undefined) {
  if (!value || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error("요청 번호가 올바르지 않아요.");
}

function normalized(parent: number | null, input: Payload) {
  if (parent !== null) return { title: null, ...normalizeComment(input.body ?? "") };
  return normalizePost(input.title ?? "", input.body ?? "");
}

function eligible(entry: StoredEntry, parent: number | null, cursor: number) {
  if (entry.deleted || entry.parent !== parent) return false;
  if (parent === null) return entry.value.id < cursor;
  return entry.value.id > cursor;
}

function compareEntries(left: StoredEntry, right: StoredEntry, parent: number | null) {
  if (parent === null) return right.value.id - left.value.id;
  return left.value.id - right.value.id;
}

function ownerOf(request: Request, cookies: Record<string, string>) {
  const value = cookies["yesulin-community-owner"] ?? "";
  if (request.method === "GET" && !value) return "";
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error("작성한 브라우저 정보를 확인할 수 없어요.");
  return value;
}

async function respond(operation: () => unknown | Promise<unknown>, status = 200) {
  try {
    const result = await operation();
    if (result === undefined) return new HttpResponse(null, { status: 204 });
    return HttpResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failureResponse(error); }
}

function failureResponse(error: unknown) {
  if (error instanceof MockFailure) return HttpResponse.json({ code: error.code, message: error.message }, { status: error.status });
  let message = "입력을 확인해 주세요.";
  if (error instanceof Error) message = error.message;
  return HttpResponse.json({ code: "INVALID_REQUEST", message }, { status: 400 });
}

function cursorOf(request: Request, name: string, fallback: number, minimum: number) {
  const value = new URL(request.url).searchParams.get(name);
  if (value === null) return fallback;
  const cursor = Number(value);
  if (!Number.isSafeInteger(cursor) || cursor < minimum) throw new Error("목록 위치가 올바르지 않아요.");
  return cursor;
}

type MockContext = {
  session: (request: Request) => SessionResponse | null;
  profile: (member: number) => CommunityProfile | null;
};

export function createCommunityHandlers(context: MockContext = { session: mockCurrentSession, profile: () => null }) {
  const store = new CommunityStore(context.profile);
  const base = "*/api/v1/public/community/posts";
  const memberKey = (request: Request) => {
    const session = context.session(request);
    if (!session || session.role !== "APPLICANT" || session.status !== "ACTIVE") return "";
    return `member:${session.memberId}`;
  };
  const manager = (entry: StoredEntry, request: Request, cookies: Record<string, string>) => {
    if (entry.owner.startsWith("member:")) return memberKey(request);
    return ownerOf(request, cookies);
  };
  const create = async (parent: number | null, request: Request) => {
    const session = context.session(request);
    if (!session) throw new MockFailure(401, "AUTH_UNAUTHENTICATED", "로그인이 필요합니다.");
    const owner = memberKey(request);
    if (!owner) throw new MockFailure(403, "AUTH_FORBIDDEN", "배우 계정으로 참여해 주세요.");
    const input = await request.json() as Payload;
    if (input.expectedMemberId !== session.memberId) throw conflict();
    return store.create(parent, owner, input);
  };
  const inboxOwner = (request: Request) => {
    const session = context.session(request);
    if (!session) throw new MockFailure(401, "AUTH_UNAUTHENTICATED", "로그인이 필요합니다.");
    return `member:${session.memberId}`;
  };
  return [
    http.get("*/api/v1/community/notifications", ({ request }) => respond(() => store.inbox(inboxOwner(request)))),
    http.put("*/api/v1/community/notifications/:id/read", ({ request, params }) => respond(() => store.readNotice(inboxOwner(request), Number(params.id)))),
    http.get("*/api/v1/public/community/identity", ({ request, cookies }) => identityResponse(request, cookies, false)),
    http.post("*/api/v1/public/community/identity", ({ request, cookies }) => identityResponse(request, cookies, true)),
    http.get(`${base}/participation`, ({ request }) => respond(() => {
      const session = context.session(request);
      const postId = new URL(request.url).searchParams.get("postId");
      if (postId && memberKey(request)) store.post(Number(postId));
      return { memberId: session?.memberId ?? null, canWrite: Boolean(memberKey(request)),
        fixedMode: null, profile: context.profile(session?.memberId ?? 0) };
    })),
    http.get(base, ({ request, cookies }) => respond(() => {
      const cursor = cursorOf(request, "before", Number.MAX_SAFE_INTEGER, 1);
      if (cursor !== Number.MAX_SAFE_INTEGER && !context.session(request)) throw new MockFailure(401, "AUTH_UNAUTHENTICATED", "이전 글을 보려면 로그인해 주세요.");
      return store.list(null, cursor, memberKey(request), ownerOf(request, cookies));
    })),
    http.put(`${base}/:id/likes`, ({ request, params, cookies }) => respond(() => store.react(Number(params.id), ownerOf(request, cookies), true))),
    http.delete(`${base}/:id/likes`, ({ request, params, cookies }) => respond(() => store.react(Number(params.id), ownerOf(request, cookies), false))),
    http.get(`${base}/:id`, ({ request, params, cookies }) => respond(() => store.view(store.post(Number(params.id)), memberKey(request), ownerOf(request, cookies)))),
    http.post(base, ({ request }) => respond(() => create(null, request), 201)),
    http.put(`${base}/:id`, ({ request, params, cookies }) => respond(async () => {
      const entry = store.post(Number(params.id));
      return store.edit(entry, manager(entry, request, cookies), await request.json() as Payload);
    })),
    http.delete(`${base}/:id`, ({ request, params, cookies }) => respond(() => {
      const entry = store.post(Number(params.id)); store.remove(entry, manager(entry, request, cookies));
    })),
    http.get(`${base}/:postId/comments`, ({ request, params, cookies }) => respond(() => store.list(Number(params.postId), cursorOf(request, "after", 0, 0), memberKey(request), ownerOf(request, cookies)))),
    http.post(`${base}/:postId/comments`, ({ request, params }) => respond(() => create(Number(params.postId), request), 201)),
    http.put(`${base}/:postId/comments/:id`, ({ request, params, cookies }) => respond(async () => {
      const entry = store.comment(Number(params.postId), Number(params.id));
      return store.edit(entry, manager(entry, request, cookies), await request.json() as Payload);
    })),
    http.delete(`${base}/:postId/comments/:id`, ({ request, params, cookies }) => respond(() => {
      const entry = store.comment(Number(params.postId), Number(params.id)); store.remove(entry, manager(entry, request, cookies));
    })),
    http.post("*/api/v1/public/community/entries/:id/reports", ({ request, params, cookies }) => respond(async () => store.report(Number(params.id), ownerOf(request, cookies), await request.json() as Payload))),
  ];
}

export const communityHandlers = createCommunityHandlers();

function identityResponse(request: Request, cookies: Record<string, string>, create: boolean): Response {
  try {
    const current = validatedIdentity(cookies["yesulin-community-owner"]);
    const legacy = validatedIdentity(request.headers.get("X-Community-Legacy-Key"));
    if (!create) return identityStatus(current, legacy);
    if (current && legacy && current !== legacy) throw new MockFailure(409, "COMMUNITY_IDENTITY_CONFLICT", "서로 다른 관리 정보가 있어요.");
    const identity = current || legacy || Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join("");
    return new HttpResponse(null, { status: 204, headers: identityHeaders(identity) });
  } catch (error) { return failureResponse(error); }
}

function validatedIdentity(value: string | null | undefined): string {
  if (value == null) return "";
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error("작성한 브라우저 정보를 확인할 수 없어요.");
  return value;
}

function identityStatus(current: string, legacy: string) {
  const ready = Boolean(current && (!legacy || current === legacy));
  if (ready) return HttpResponse.json({ ready }, { headers: identityHeaders(current) });
  return HttpResponse.json({ ready }, { headers: { "Cache-Control": "no-store" } });
}

function identityHeaders(value: string) {
  return { "Cache-Control": "no-store", "Set-Cookie": `yesulin-community-owner=${value}; Path=/api/v1/public/community; HttpOnly; SameSite=Lax; Max-Age=34560000` };
}
