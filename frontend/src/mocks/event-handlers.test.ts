import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";

const flags = vi.hoisted(() => ({ producerLoginEnabled: false, socialLoginEnabled: false, applicantProfileApiEnabled: false }));
vi.mock("@/config/environment", () => ({ frontendEnvironment: flags }));
vi.mock("./auth-handlers", () => ({ mockSessionRole: () => "ADMIN" }));
let worker: ReturnType<typeof setupServer> | undefined;
let backend: Server;
let origin: string;
let seen: string[];

beforeEach(async () => {
  vi.resetModules();
  Object.assign(flags, { producerLoginEnabled: false, socialLoginEnabled: false, applicantProfileApiEnabled: false });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-29T09:00:00Z"));
  seen = [];
  backend = createServer((request, response) => {
    seen.push(`${request.method} ${request.url}`);
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ fromBackend: true }));
  });
  await new Promise<void>((resolve) => backend.listen(0, "127.0.0.1", resolve));
  const address = backend.address();
  if (!address || typeof address === "string") throw new Error("Missing test server address");
  origin = `http://127.0.0.1:${address.port}`;
  vi.stubGlobal("location", new URL(origin));
  vi.stubGlobal("window", { location: new URL(origin) });
});

afterEach(async () => {
  worker?.close();
  worker = undefined;
  backend.closeAllConnections();
  await new Promise<void>((resolve, reject) => backend.close((error) => error ? reject(error) : resolve()));
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function start() {
  const [{ eventHandlers }, { memberLinkCodeHandlers }] = await Promise.all([
    import("./event-handlers"), import("./member-link-codes"),
  ]);
  worker = setupServer(...eventHandlers, ...memberLinkCodeHandlers);
  worker.listen({ onUnhandledRequest: "error" });
}

function request(path: string, method = "GET", body?: unknown) {
  return fetch(`${origin}/api/v1${path}`, { method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

it.each(["producerLoginEnabled", "socialLoginEnabled", "applicantProfileApiEnabled"] as const)(
  "keeps event registrations and member codes on one backend with %s", async (flag) => {
    flags[flag] = true;
    await start();
    const routes = [
      ["/public/events", "GET"], ["/public/events/banners", "GET"], ["/public/events/2", "GET"],
      ["/public/events/2/registrations/photo-uploads", "POST"], ["/public/events/2/registrations", "POST"],
      ["/admin/events/2/registrations", "GET"], ["/public/business-cards/any-card", "GET"],
      ["/public/business-cards/any-card/visit", "GET"],
      ["/admin/events/2/registrations/1/business-card", "PUT"],
      ["/applicants/me/member-link-code", "POST"],
      ["/admin/events/2/registrations/1/business-card/member", "POST"],
      ["/admin/events/2/registrations/1/business-card/member", "DELETE"],
    ];
    for (const [path, method] of routes) {
      const response = await request(path, method);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ fromBackend: true });
    }
    expect(seen).toEqual(routes.map(([path, method]) => `${method} /api/v1${path}`));
  },
);

it("removes an event's registrations and QR destinations when the mock event is deleted", async () => {
  await start();
  const upload = await (await request("/public/events/2/registrations/photo-uploads", "POST", {
    contentType: "image/jpeg", size: 100,
  })).json();
  const registration = await request("/public/events/2/registrations", "POST", {
    participantType: "ACTOR", name: "테스트 배우", phone: "010-1234-5678", businessCardRequested: true,
    email: "actor@example.test", birthDate: "2000-01-01", photoUploadKey: upload.uploadKey,
    activityFields: ["THEATER"], noCareer: true, careers: [], privacyAgreed: true,
  });
  expect(registration.status).toBe(201);
  const { id } = await registration.json();
  const { registrations } = await (await request("/admin/events/2/registrations")).json();
  const key = registrations[0].businessCard.publicId;
  expect((await request(`/admin/events/2/registrations/${id}/business-card`, "PUT", {
    profileUrl: "https://example.test/actor",
  })).status).toBe(200);
  expect(await (await request(`/public/business-cards/${key}/visit`)).json()).toEqual({ profileUrl: "https://example.test/actor" });
  expect((await request("/admin/events/2", "DELETE")).status).toBe(204);
  expect((await request(`/public/business-cards/${key}`)).status).toBe(404);
  expect((await request(`/public/business-cards/${key}/visit`)).status).toBe(404);
});
