import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN
  ? new URL(process.env.API_ORIGIN).origin
  : null;

// dev.yesulin.art 같은 Vercel Preview는 운영 주소를 canonical로 쓰지만 데이터가 달라 검색에서 뺀다.
// robots.txt로 막으면 로봇이 이 헤더를 읽지 못하므로 수집은 허용하고 헤더로만 제외한다.
const excludeFromSearch = Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    if (!excludeFromSearch) return [];

    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
  async rewrites() {
    if (!apiOrigin) return [];

    return [
      {
        source: "/otr",
        destination: `${apiOrigin}/api/v1/otr`,
      },
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
      {
        source: "/oauth2/:path*",
        destination: `${apiOrigin}/oauth2/:path*`,
      },
      {
        source: "/login/oauth2/:path*",
        destination: `${apiOrigin}/login/oauth2/:path*`,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG ?? "in-front",
  project: process.env.SENTRY_PROJECT ?? "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
  },
});
