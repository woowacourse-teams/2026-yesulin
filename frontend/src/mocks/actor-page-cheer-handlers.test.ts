import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import type { ActorPageCheer, ActorPageCheers } from "@/features/actor-pages/cheer-api";
import { actorPageHandlers } from "./actor-page-handlers";
import { authHandlers, mockApplicantLogin } from "./auth-handlers";

const server = setupServer(...actorPageHandlers, ...authHandlers);
const page = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const list = async (id: string, query = "") => await (await fetch(`http://localhost/api/v1/public/actor-pages/${id}/cheers${query}`)).json() as ActorPageCheers;
const url = (id: string, cheerId?: number) => `http://localhost/api/v1/actor-pages/${id}/cheers${cheerId === undefined ? "" : `/${cheerId}`}`;
const send = (method: string, target: string, body?: string) => fetch(target, {
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify({ body }),
});

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

describe("배우 응원 글 목", () => {
  it("로그인하지 않으면 최신순으로 읽고 팬 번호는 처음 응원한 순서다", async () => {
    const result = await list(page(2));

    expect(result.totalCount).toBe(3);
    expect(result.cheers.map((cheer) => cheer.fanNumber)).toEqual([1, 2, 1]);
    expect(result.cheers.every((cheer) => !cheer.mine)).toBe(true);
    expect(result.me).toEqual({ loggedIn: false, owner: false, canWrite: false });
    expect((await send("POST", url(page(2)), "응원")).status).toBe(401);
  });

  it("회원은 쓰고 고치고 지우며 남의 글은 건드리지 못한다", async () => {
    mockApplicantLogin();
    const target = page(3);
    const seeded = (await list(target)).cheers[0];

    const written = await (await send("POST", url(target), "  새 응원  ")).json() as ActorPageCheer;
    expect(written).toMatchObject({ body: "새 응원", mine: true, fanNumber: 3, edited: false });
    expect((await list(target)).cheers[0].id).toBe(written.id);
    expect((await send("PATCH", url(target, seeded.id), "남의 글")).status).toBe(403);
    expect((await send("DELETE", url(target, seeded.id))).status).toBe(403);

    const edited = await (await send("PATCH", url(target, written.id), "고친 응원")).json() as ActorPageCheer;
    expect(edited).toMatchObject({ body: "고친 응원", edited: true });
    expect((await send("DELETE", url(target, written.id))).status).toBe(204);
    expect((await list(target)).totalCount).toBe(3);
    expect((await send("DELETE", url(target, written.id))).status).toBe(404);
  });

  it("빈 글과 너무 긴 글은 거절하고 목록에 없는 페이지는 404다", async () => {
    mockApplicantLogin();

    expect((await send("POST", url(page(4)), "   ")).status).toBe(400);
    expect((await send("POST", url(page(4)), "가".repeat(501))).status).toBe(400);
    expect((await send("POST", url(page(999)), "응원")).status).toBe(404);
    expect((await fetch(`http://localhost/api/v1/public/actor-pages/${page(999)}/cheers`)).status).toBe(404);
  });

  it("더 오래된 글은 nextBefore로 이어 읽는다", async () => {
    const first = await list(page(5), "?size=2");
    const second = await list(page(5), `?size=2&before=${first.nextBefore}`);

    expect(first.cheers).toHaveLength(2);
    expect(first.nextBefore).not.toBeNull();
    expect(second.cheers).toHaveLength(1);
    expect(second.nextBefore).toBeNull();
    expect((await fetch(`http://localhost/api/v1/public/actor-pages/${page(5)}/cheers?size=0`)).status).toBe(400);
    expect((await fetch(`http://localhost/api/v1/public/actor-pages/${page(5)}/cheers?before=0`)).status).toBe(400);
  });

  it("공연사 계정은 읽기만 하고 쓰면 403이다", async () => {
    await fetch("http://localhost/api/v1/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "producer@example.com", password: "password1!" }),
    });

    expect((await list(page(6))).me).toEqual({ loggedIn: true, owner: false, canWrite: false });
    expect((await send("POST", url(page(6)), "응원")).status).toBe(403);
  });
});
