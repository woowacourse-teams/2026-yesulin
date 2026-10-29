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
  // App Router는 `@`로 시작하는 폴더를 병렬 라우트 슬롯으로 보므로 `/actors/@아이디`를 내부 경로로 넘긴다.
  // 내부 경로로 바로 들어오면 정규 주소로 보낸다. 리다이렉트는 들어온 주소에만 적용되어 rewrite 결과와 순환하지 않는다.
  async redirects() {
    return [
      { source: "/actor-page/:handle", destination: "/actors/@:handle", permanent: true },
      { source: "/actor-page/:handle/:path*", destination: "/actors/@:handle/:path*", permanent: true },
    ];
  },
  async rewrites() {
    const actorPages = [
      { source: "/actors/@:handle", destination: "/actor-page/:handle" },
      { source: "/actors/@:handle/:path*", destination: "/actor-page/:handle/:path*" },
    ];
    if (!apiOrigin) return actorPages;

    return [
      ...actorPages,
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
