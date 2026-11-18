import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN
  ? new URL(process.env.API_ORIGIN).origin
  : null;

// dev.yesulin.art 같은 Vercel Preview는 운영 주소를 canonical로 쓰지만 데이터가 달라 검색에서 뺀다.
// robots.txt로 막으면 로봇이 이 헤더를 읽지 못하므로 수집은 허용하고 헤더로만 제외한다.
const excludeFromSearch = Boolean(process.env.VERCEL_ENV) && process.env.VERCEL_ENV !== "production";

function sentryIngestOrigins(): string[] {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return [];
  const url = URL.parse(dsn);
  if (url?.protocol !== "https:") return [];
  return [url.origin];
}

const connectSources = [
  "'self'", "https://www.googletagmanager.com", "https://*.google-analytics.com", "https://*.analytics.google.com",
  "https://us.i.posthog.com", "https://eu.i.posthog.com", "https://us-assets.i.posthog.com", "https://eu-assets.i.posthog.com",
  "https://dcijkydwh7e79.cloudfront.net", "https://s3.ap-northeast-2.amazonaws.com", "https://*.s3.ap-northeast-2.amazonaws.com",
  "https://s3.amazonaws.com", "https://*.s3.amazonaws.com", ...sentryIngestOrigins(),
];

const reportOnlyPolicy = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval' https://www.googletagmanager.com https://us-assets.i.posthog.com https://eu-assets.i.posthog.com https://va.vercel-scripts.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  `connect-src ${connectSources.join(" ")}`,
  "worker-src 'self' blob:",
  "frame-src 'self' blob: https://www.youtube-nocookie.com https://www.youtube.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async headers() {
    const headers = [];
    if (excludeFromSearch) headers.push({ key: "X-Robots-Tag", value: "noindex" });
    if (process.env.NODE_ENV !== "development") {
      headers.push({ key: "Content-Security-Policy-Report-Only", value: reportOnlyPolicy });
    }
    if (!headers.length) return [];
    return [{ source: "/:path*", headers }];
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
