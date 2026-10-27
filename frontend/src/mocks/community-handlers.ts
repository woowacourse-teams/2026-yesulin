import { http, HttpResponse } from "msw";
import { normalizeComment, normalizePost } from "@/features/community/draft";
import { reportReasons, type CommunityEntry, type CommunityPage } from "@/features/community/types";

type StoredEntry = { value: CommunityEntry; owner: string; parent: number | null; deleted: boolean; requestId: string; original: string };
type Payload = { requestId?: string; title?: string; body?: string; reason?: string; detail?: string };

class MockFailure extends Error {
  constructor(readonly status: number, readonly code: string, message: string) { super(message); }
}

class CommunityStore {
  private entries = new Map<number, StoredEntry>();
  private reports = new Map<string, string>();
  private sequence = 0;

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

  view(entry: StoredEntry, owner: string): CommunityEntry {
    return { ...entry.value, editable: entry.owner === owner };
  }

  list(parent: number | null, cursor: number, owner: string): CommunityPage {
    if (parent !== null) this.post(parent);
    const entries = [...this.entries.values()].filter(entry => eligible(entry, parent, cursor));
    entries.sort((left, right) => compareEntries(left, right, parent));
    const items = entries.slice(0, 20).map(entry => this.listView(entry, owner, parent));
    let nextCursor: number | null = null;
    if (entries.length > 20) nextCursor = items[19].id;
    return { items, nextCursor };
  }

  create(parent: number | null, owner: string, input: Payload) {
    requireRequestId(input.requestId);
    if (parent !== null) this.post(parent);
    const content = normalized(parent, input);
    const original = JSON.stringify({ parent, ...content });
    const retry = [...this.entries.values()].find(entry => entry.requestId === input.requestId);
    if (retry) return this.replay(retry, owner, original);
    return this.insert(parent, owner, input.requestId!, content, original);
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

  private insert(parent: number | null, owner: string, requestId: string, content: { title: string | null; body: string }, original: string) {
    const id = ++this.sequence;
    const createdAt = new Date().toISOString();
    const value = { id, ...content, author: "익명", createdAt, updatedAt: createdAt, commentCount: 0, editable: false };
    const entry = { value, owner, parent, deleted: false, requestId, original };
    this.entries.set(id, entry);
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

  private listView(entry: StoredEntry, owner: string, parent: number | null) {
    if (parent === null) return { ...entry.value, editable: false };
    return this.view(entry, owner);
  }
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

function ownerOf(request: Request) {
  const value = request.headers.get("X-Community-Key") ?? "";
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

export function createCommunityHandlers() {
  const store = new CommunityStore();
  const base = "*/api/v1/public/community/posts";
  return [
    http.get(base, ({ request }) => respond(() => store.list(null, cursorOf(request, "before", Number.MAX_SAFE_INTEGER, 1), ownerOf(request)))),
    http.get(`${base}/:id`, ({ request, params }) => respond(() => store.view(store.post(Number(params.id)), ownerOf(request)))),
    http.post(base, ({ request }) => respond(async () => store.create(null, ownerOf(request), await request.json() as Payload), 201)),
    http.put(`${base}/:id`, ({ request, params }) => respond(async () => store.edit(store.post(Number(params.id)), ownerOf(request), await request.json() as Payload))),
    http.delete(`${base}/:id`, ({ request, params }) => respond(() => store.remove(store.post(Number(params.id)), ownerOf(request)))),
    http.get(`${base}/:postId/comments`, ({ request, params }) => respond(() => store.list(Number(params.postId), cursorOf(request, "after", 0, 0), ownerOf(request)))),
    http.post(`${base}/:postId/comments`, ({ request, params }) => respond(async () => store.create(Number(params.postId), ownerOf(request), await request.json() as Payload), 201)),
    http.put(`${base}/:postId/comments/:id`, ({ request, params }) => respond(async () => store.edit(store.comment(Number(params.postId), Number(params.id)), ownerOf(request), await request.json() as Payload))),
    http.delete(`${base}/:postId/comments/:id`, ({ request, params }) => respond(() => store.remove(store.comment(Number(params.postId), Number(params.id)), ownerOf(request)))),
    http.post("*/api/v1/public/community/entries/:id/reports", ({ request, params }) => respond(async () => store.report(Number(params.id), ownerOf(request), await request.json() as Payload))),
  ];
}

export const communityHandlers = createCommunityHandlers();
