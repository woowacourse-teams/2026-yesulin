import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import type { ActorPageLikes } from "@/features/actor-pages/like-api";
import { actorPageHandlers } from "./actor-page-handlers";
import { authHandlers, mockApplicantLogin } from "./auth-handlers";

const server = setupServer(...actorPageHandlers, ...authHandlers);
const FEATURED = "00000000-0000-4000-8000-000000000001";
const likes = (id = FEATURED) => `http://localhost/api/v1/public/actor-pages/${id}/likes`;
const write = (method: "PUT" | "DELETE", id = FEATURED) => fetch(`http://localhost/api/v1/actor-pages/${id}/likes`, { method });
const current = async () => await (await fetch(likes())).json() as ActorPageLikes;

beforeAll(() => {
  vi.stubGlobal("location", new URL("http://localhost"));
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(async () => {
  await fetch("http://localhost/api/v1/sessions/current", { method: "DELETE" });
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

describe("배우 좋아요 목", () => {
  it("로그인하지 않으면 수만 보이고 누르면 401이다", async () => {
    const result = await current();

    expect(result.viewer).toEqual({ loggedIn: false, owner: false, canLike: false, liked: false });
    expect((await write("PUT")).status).toBe(401);
  });

  it("배우 계정은 누르고 취소할 수 있고 반복해도 한 번만 센다", async () => {
    mockApplicantLogin();
    const before = (await current()).count;

    const first = await (await write("PUT")).json() as ActorPageLikes;
    const again = await (await write("PUT")).json() as ActorPageLikes;

    expect(first.viewer).toEqual({ loggedIn: true, owner: false, canLike: true, liked: true });
    expect(first.count).toBe(before + 1);
    expect(again.count).toBe(before + 1);
    const canceled = await (await write("DELETE")).json() as ActorPageLikes;
    expect(canceled.count).toBe(before);
    expect(canceled.viewer.liked).toBe(false);
  });

  it("배우 계정이 아니면 누를 수 없고 목록에 없는 페이지는 404다", async () => {
    await fetch("http://localhost/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "producer@example.com", password: "password1!" }),
    });

    expect((await current()).viewer).toEqual({ loggedIn: true, owner: false, canLike: false, liked: false });
    expect((await write("PUT")).status).toBe(403);
    mockApplicantLogin();
    expect((await write("PUT", "00000000-0000-4000-8000-999999999999")).status).toBe(404);
    expect((await fetch(likes("00000000-0000-4000-8000-999999999999"))).status).toBe(404);
  });
});
