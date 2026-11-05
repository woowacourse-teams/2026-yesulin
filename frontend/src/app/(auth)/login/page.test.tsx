import { afterEach, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage from "./page";

const state = vi.hoisted(() => ({ apiMockingEnabled: false, host: "localhost:3007" }));
vi.mock("@/config/environment", () => ({ frontendEnvironment: state }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: state.host }) }));
vi.mock("@/components/auth/auth-shell", () => ({ AuthShell: ({ children }: React.PropsWithChildren) => children }));
vi.mock("@/components/auth/login-form", () => ({ LoginForm: ({ localActorLogin }: { localActorLogin: boolean }) => String(localActorLogin) }));
vi.mock("@/features/auth/application-auth-context-server", () => ({ applicationAuthContextForServer: async () => null }));

afterEach(() => vi.unstubAllEnvs());

it.each([
  ["development", "true", false, "localhost:3007", "http://127.0.0.1:8087", "true"],
  ["development", "true", true, "localhost:3007", "http://127.0.0.1:8087", "false"],
  ["production", "true", false, "localhost:3007", "http://127.0.0.1:8087", "false"],
  ["development", "", false, "localhost:3007", "http://127.0.0.1:8087", "false"],
  ["development", "true", false, "dev.yesulin.art", "http://127.0.0.1:8087", "false"],
  ["development", "true", false, "localhost:3007", "https://dev-api.yesulin.art", "false"],
] as const)("테스트 폼 노출 범위 %s %s %s %s %s", async (mode, enabled, mock, host, api, expected) => {
  vi.stubEnv("NODE_ENV", mode);
  vi.stubEnv("LOCAL_COMMUNITY_ACTOR_LOGIN", enabled);
  vi.stubEnv("API_ORIGIN", api);
  Object.assign(state, { apiMockingEnabled: mock, host });
  expect(renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({}) }))).toBe(expected);
});
