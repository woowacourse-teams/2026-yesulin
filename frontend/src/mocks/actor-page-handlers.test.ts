import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import type { ActorBookmarkList } from "@/features/actor-pages/bookmark-api";
import type { PublicActorPageList } from "@/features/actor-pages/types";
import {
  actorPageHandlers,
  changeMockActorHandle,
  listMockAdminActorPages,
  lockMockActorPage,
  mockAdminActorPage,
  unlockMockActorPage,
} from "./actor-page-handlers";

const server = setupServer(...actorPageHandlers);
const base = "http://localhost/api/v1/producers/me";

beforeAll(() => {
  vi.stubGlobal("location", new URL("http://localhost"));
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

const bookmarkIds = async () => (await (await fetch(`${base}/actor-bookmark-ids`)).json() as { publicIds: string[] }).publicIds;
const bookmarkList = async () => await (await fetch(`${base}/actor-bookmarks?page=0&size=12`)).json() as ActorBookmarkList;

describe("관심 배우 목", () => {
  it("비공개가 된 배우의 저장은 목록에서 숨기고 한도에는 센다", async () => {
    const list = await bookmarkList();

    expect(list.actorPages.map((actor) => actor.handle)).toEqual(["min.zzun_", "actor3"]);
    expect(list.savedCount).toBe(3);
    expect(list.hiddenCount).toBe(1);
    expect(list.limit).toBe(300);
  });

  it("같은 저장·해제를 반복해도 결과가 같고, 새로 저장한 배우가 맨 앞에 온다", async () => {
    const actors = await (await fetch("http://localhost/api/v1/public/actor-pages?page=0&size=12&sort=recent")).json() as PublicActorPageList;
    const target = actors.actorPages.find((actor) => actor.handle === "actor4")!;

    expect((await fetch(`${base}/actor-bookmarks/${target.publicId}`, { method: "PUT" })).status).toBe(204);
    expect((await fetch(`${base}/actor-bookmarks/${target.publicId}`, { method: "PUT" })).status).toBe(204);
    expect((await bookmarkIds())[0]).toBe(target.publicId);
    expect((await bookmarkList()).savedCount).toBe(4);

    await fetch(`${base}/actor-bookmarks/${target.publicId}`, { method: "DELETE" });
    await fetch(`${base}/actor-bookmarks/${target.publicId}`, { method: "DELETE" });
    expect(await bookmarkIds()).not.toContain(target.publicId);
  });

  it("목록에 없는 배우는 찾을 수 없음으로 답한다", async () => {
    const response = await fetch(`${base}/actor-bookmarks/00000000-0000-4000-8000-999999999999`, { method: "PUT" });

    expect(response.status).toBe(404);
  });
});

describe("운영자 배우 페이지 목", () => {
  const publicPage = async (handle: string) => (await fetch(`http://localhost/api/v1/public/actor-pages/by-handle/${handle}`)).status;

  it("잠그면 공개 페이지에서 빠지고, 풀어도 비공개로 남는다", async () => {
    const actor = listMockAdminActorPages("actor5")[0]!;

    expect(lockMockActorPage(actor.publicId, "확인 중")?.locked).toBe(true);
    expect(await publicPage("actor5")).toBe(404);

    const unlocked = unlockMockActorPage(actor.publicId)!;
    expect(unlocked.changed).toBe(true);
    expect(unlocked.actorPage.locked).toBe(false);
    expect(unlocked.actorPage.status).toBe("PRIVATE");
    expect(unlockMockActorPage(actor.publicId)!.changed).toBe(false);
  });

  it("아이디를 바꾸면 옛 아이디는 바로 풀리고 규칙은 서버와 같다", async () => {
    const actor = listMockAdminActorPages("actor6")[0]!;

    expect(changeMockActorHandle(actor.publicId, "New.Actor")).toMatchObject({ kind: "changed", previous: "actor6" });
    expect(await publicPage("new.actor")).toBe(200);
    expect(await publicPage("actor6")).toBe(404);
    expect(changeMockActorHandle(actor.publicId, "min.zzun_")).toMatchObject({ kind: "error", code: "ACTOR_HANDLE_TAKEN" });
    expect(changeMockActorHandle(actor.publicId, "admin")).toMatchObject({ kind: "error", code: "ACTOR_HANDLE_RESERVED" });
    expect(changeMockActorHandle(actor.publicId, "a..b")).toMatchObject({ kind: "error", code: "ACTOR_HANDLE_INVALID" });
  });

  it("상세는 '공연사만' 영상과 연락처를 담고, 비공개 배우는 사진이 없다", () => {
    const featured = mockAdminActorPage(listMockAdminActorPages("min.zzun_")[0]!.publicId)!;
    const hidden = mockAdminActorPage(listMockAdminActorPages("hidden.actor")[0]!.publicId)!;

    expect(featured.producerOnlyVideos).toHaveLength(1);
    expect(featured.email).toBe("min.zzun_@example.com");
    expect(hidden.status).toBe("PRIVATE");
    expect(hidden.content.photos).toEqual([]);
  });
});
