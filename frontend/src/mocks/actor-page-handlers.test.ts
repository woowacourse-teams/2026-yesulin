import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import type { ActorBookmarkList } from "@/features/actor-pages/bookmark-api";
import type { PublicActorPageList } from "@/features/actor-pages/types";
import { actorPageHandlers } from "./actor-page-handlers";

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
