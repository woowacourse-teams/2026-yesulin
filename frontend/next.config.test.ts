import type { NextConfig } from "next";
import {
  getRewrittenUrl,
  unstable_getResponseFromNextConfig,
} from "next/experimental/testing/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
  withSentryConfig: (config: NextConfig) => config,
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("OTR notice API rewrite", () => {
  it.each([
    ["https://api.yesulin.art", "https://yesulin.art"],
    ["https://dev-api.yesulin.art", "https://dev.yesulin.art"],
  ])("forwards vid from our link to %s", async (apiOrigin, frontendOrigin) => {
    vi.stubEnv("API_ORIGIN", apiOrigin);
    const { default: nextConfig } = await import("./next.config");
    const response = await unstable_getResponseFromNextConfig({
      url: `${frontendOrigin}/api/v1/otr?vid=22310`,
      nextConfig,
    });

    expect(getRewrittenUrl(response)).toBe(`${apiOrigin}/api/v1/otr?vid=22310`);
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps the local backend port in the rewrite destination", async () => {
    vi.stubEnv("API_ORIGIN", "http://localhost:8080");
    const { default: nextConfig } = await import("./next.config");
    const rewrites = await nextConfig.rewrites!();

    expect(rewrites).toContainEqual({
      source: "/api/v1/:path*",
      destination: "http://localhost:8080/api/v1/:path*",
    });
  });

  it("keeps invalid input for backend validation without changing the destination host", async () => {
    vi.stubEnv("API_ORIGIN", "https://api.yesulin.art");
    const { default: nextConfig } = await import("./next.config");
    const response = await unstable_getResponseFromNextConfig({
      url: "https://yesulin.art/api/v1/otr?vid=invalid&url=https%3A%2F%2Fexample.com",
      nextConfig,
    });

    const destination = new URL(getRewrittenUrl(response)!);
    expect(destination.origin).toBe("https://api.yesulin.art");
    expect(destination.pathname).toBe("/api/v1/otr");
    expect(destination.searchParams.get("vid")).toBe("invalid");
  });
});

describe("search exclusion outside production", () => {
  it.each(["preview", "development"])("sends noindex on every path in Vercel %s", async (vercelEnv) => {
    vi.stubEnv("VERCEL_ENV", vercelEnv);
    const { default: nextConfig } = await import("./next.config");

    for (const path of ["/", "/posts/135", "/sitemap.xml", "/images/og-image-20261124-open-door.png"]) {
      const response = await unstable_getResponseFromNextConfig({ url: `https://dev.yesulin.art${path}`, nextConfig });
      expect(response.headers.get("x-robots-tag")).toBe("noindex");
    }
  });

  it.each([["production"], [undefined]])("keeps pages indexable when VERCEL_ENV is %s", async (vercelEnv) => {
    vi.stubEnv("VERCEL_ENV", vercelEnv);
    const { default: nextConfig } = await import("./next.config");
    const response = await unstable_getResponseFromNextConfig({ url: "https://yesulin.art/posts/135", nextConfig });

    expect(response.headers.get("x-robots-tag")).toBeNull();
  });
});

describe("browser security headers", () => {
  it.each(["production", "preview"])("observes CSP violations in the %s build", async (vercelEnv) => {
    vi.stubEnv("VERCEL_ENV", vercelEnv);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://publickey@errors.example.test/42");
    const { default: nextConfig } = await import("./next.config");
    const response = await unstable_getResponseFromNextConfig({ url: "https://yesulin.art/login", nextConfig });
    const policy = response.headers.get("content-security-policy-report-only");

    expect(nextConfig.poweredByHeader).toBe(false);
    expect(response.headers.get("content-security-policy")).toBeNull();
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("worker-src 'self' blob:");
    expect(policy).toContain("https://errors.example.test");
    expect(policy).not.toContain("publickey");
  });

  it("keeps report-only out of next dev while preserving Vercel noindex", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "development");
    const { default: nextConfig } = await import("./next.config");
    const response = await unstable_getResponseFromNextConfig({ url: "https://dev.yesulin.art/", nextConfig });

    expect(response.headers.get("content-security-policy-report-only")).toBeNull();
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
  });
});

describe("actor page address", () => {
  const thirtyCharacters = "a".repeat(30);

  it.each([
    ["/actors/@minzzun.__", "/actor-page/minzzun.__"],
    ["/actors/@a", "/actor-page/a"],
    [`/actors/@${thirtyCharacters}`, `/actor-page/${thirtyCharacters}`],
    ["/actors/@MinZzun", "/actor-page/MinZzun"],
    ["/actors/@minzzun.__/posts", "/actor-page/minzzun.__/posts"],
  ])("serves %s from the internal route", async (path, internal) => {
    const { default: nextConfig } = await import("./next.config");
    const response = await unstable_getResponseFromNextConfig({ url: `https://yesulin.art${path}`, nextConfig });

    expect(new URL(getRewrittenUrl(response)!).pathname).toBe(internal);
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps the actor page rewrite next to the backend rewrite", async () => {
    vi.stubEnv("API_ORIGIN", "https://api.yesulin.art");
    const { default: nextConfig } = await import("./next.config");
    const response = await unstable_getResponseFromNextConfig({ url: "https://yesulin.art/actors/@min.zzun", nextConfig });

    expect(new URL(getRewrittenUrl(response)!).pathname).toBe("/actor-page/min.zzun");
  });

  it.each([
    ["/actor-page/minzzun", "/actors/@minzzun"],
    ["/actor-page/minzzun/posts", "/actors/@minzzun/posts"],
  ])("moves the internal route %s to the public address", async (path, publicPath) => {
    const { default: nextConfig } = await import("./next.config");
    const response = await unstable_getResponseFromNextConfig({ url: `https://yesulin.art${path}`, nextConfig });

    expect(response.status).toBe(308);
    expect(new URL(response.headers.get("location")!, "https://yesulin.art").pathname).toBe(publicPath);
  });
});
