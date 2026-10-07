import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import type { ProducerShow } from "@/features/shows/types";

vi.mock("@/config/environment", () => ({
  frontendEnvironment: { producerApiEnabled: false, producerLoginEnabled: false, socialLoginEnabled: false },
}));

let server: ReturnType<typeof setupServer>;
const base = "http://localhost/api/v1";

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("location", new URL("http://localhost"));
  const [{ showHandlers }, { adminHandlers }, { authHandlers }] = await Promise.all([
    import("./show-handlers"), import("./admin-handlers"), import("./auth-handlers"),
  ]);
  server = setupServer(...showHandlers, ...adminHandlers, ...authHandlers);
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  server.close();
  vi.unstubAllGlobals();
});

async function put(path: string, body: unknown) {
  return fetch(`${base}${path}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
}

async function adminLogin() {
  const response = await fetch(`${base}/sessions`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@local.test", password: "test-password" }),
  });
  expect(response.status).toBe(200);
}

describe("show management mock regressions", () => {
  it("keeps both session values when a producer capacity update is rejected", async () => {
    const path = "/shows/seed_show_moonlight";
    const before = await (await fetch(`${base}${path}`)).json() as ProducerShow;
    const original = before.sessions.find((session) => session.id === 102)!;
    const startsAt = new Date(Date.now() + 30 * 86400000).toISOString();

    const rejected = await put(`${path}/sessions/102`, { startsAt, capacity: 1 });

    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toMatchObject({ code: "SHOW_SESSION_CAPACITY_BELOW_RESERVED" });
    const after = await (await fetch(`${base}${path}`)).json() as ProducerShow;
    expect(after.sessions.find((session) => session.id === 102)).toEqual(original);
    const accepted = await put(`${path}/sessions/102`, { startsAt, capacity: 50 });
    expect(accepted.status).toBe(200);
    const updated = await accepted.json() as ProducerShow;
    expect(updated.sessions.find((session) => session.id === 102)).toMatchObject({ startsAt, capacity: 50 });
  });

  it("reschedules an external show without a capacity", async () => {
    await adminLogin();
    const startsAt = new Date(Date.now() + 30 * 86400000).toISOString();
    const response = await put("/admin/shows/seed_show_external/sessions/502", { startsAt });

    expect(response.status).toBe(200);
    const show = await response.json() as ProducerShow;
    expect(show.sessions.find((session) => session.id === 502)).toMatchObject({ startsAt, capacity: 0 });
  });

  it("requires an external show host but still allows clearing a producer show host", async () => {
    await adminLogin();
    for (const hostName of ["", "   "]) {
      const rejected = await put("/admin/shows/seed_show_external/host-name", { hostName });
      expect(rejected.status).toBe(400);
      expect(await rejected.json()).toMatchObject({ code: "SHOW_INVALID_INPUT" });
    }
    const unchanged = await (await fetch(`${base}/admin/shows/seed_show_external`)).json() as ProducerShow;
    expect(unchanged.hostName).toBe("서울숲 거리극 모임");
    const changed = await put("/admin/shows/seed_show_external/host-name", { hostName: " 새 주최 " });
    expect(changed.status).toBe(200);
    expect(await changed.json()).toMatchObject({ hostName: "새 주최" });
    const cleared = await put("/admin/shows/seed_show_hidden_seats/host-name", { hostName: "   " });
    expect(cleared.status).toBe(200);
    expect(await cleared.json()).toMatchObject({ hostName: "" });
    const publicShow = await (await fetch(`${base}/public/shows/seed_show_hidden_seats`)).json();
    expect(publicShow.hostName).not.toBe("");
  });
});
