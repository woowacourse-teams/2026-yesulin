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

describe("OTR notice link rewrite", () => {
  it.each([
    ["https://api.yesulin.art", "https://yesulin.art"],
    ["https://dev-api.yesulin.art", "https://dev.yesulin.art"],
  ])("forwards vid from our link to %s", async (apiOrigin, frontendOrigin) => {
    vi.stubEnv("API_ORIGIN", apiOrigin);
    const { default: nextConfig } = await import("./next.config");
    const response = await unstable_getResponseFromNextConfig({
      url: `${frontendOrigin}/otr?vid=22310`,
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
      source: "/otr",
      destination: "http://localhost:8080/api/v1/otr",
    });
  });

  it("keeps invalid input for backend validation without changing the destination host", async () => {
    vi.stubEnv("API_ORIGIN", "https://api.yesulin.art");
    const { default: nextConfig } = await import("./next.config");
    const response = await unstable_getResponseFromNextConfig({
      url: "https://yesulin.art/otr?vid=invalid&url=https%3A%2F%2Fexample.com",
      nextConfig,
    });

    const destination = new URL(getRewrittenUrl(response)!);
    expect(destination.origin).toBe("https://api.yesulin.art");
    expect(destination.pathname).toBe("/api/v1/otr");
    expect(destination.searchParams.get("vid")).toBe("invalid");
  });
});
