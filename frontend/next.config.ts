import type { NextConfig } from "next";

const apiOrigin = process.env.API_ORIGIN
  ? new URL(process.env.API_ORIGIN).origin
  : null;

const nextConfig: NextConfig = {
  output: "standalone",
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
