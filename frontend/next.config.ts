import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN
  ? new URL(process.env.API_ORIGIN).origin
  : null;

const nextConfig: NextConfig = {
  output: "standalone",
  // 루트 lockfile 때문에 워크스페이스 루트가 저장소 루트로 추정되면 standalone·트레이스
  // 파일 경로가 틀어져 Vercel 배포와 Docker 실행이 깨진다. 프로젝트 루트를 고정한다.
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  async rewrites() {
    if (!apiOrigin) return [];

    return [
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

export default nextConfig;
