import { type NextRequest, NextResponse } from "next/server";

type CurrentSession = {
  readonly role?: unknown;
};

const realProducerSessionEnabled =
  process.env.NEXT_PUBLIC_API_MOCKING !== "enabled"
  || process.env.NEXT_PUBLIC_PRODUCER_LOGIN === "enabled";

export async function proxy(request: NextRequest) {
  const isAdmin = request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/");
  if (!isAdmin && !realProducerSessionEnabled) return NextResponse.next();
  const denied = () => isAdmin ? hiddenAdminResponse() : redirectHome(request);
  const cookie = request.headers.get("cookie");
  if (isAdmin && !cookie) return denied();

  try {
    const response = await fetch(currentSessionUrl(request), {
      method: "GET",
      headers: cookie
        ? { accept: "application/json", cookie }
        : { accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) return denied();

    const session = await response.json() as CurrentSession;
    if (session.role !== (isAdmin ? "ADMIN" : "PRODUCER")) return denied();

    const result = NextResponse.next();
    if (isAdmin) result.headers.set("Cache-Control", "private, no-store");
    return result;
  } catch {
    return denied();
  }
}

function currentSessionUrl(request: NextRequest) {
  const apiOrigin = process.env.API_ORIGIN?.trim();
  return new URL("/api/v1/sessions/current", apiOrigin || request.nextUrl.origin);
}

function redirectHome(request: NextRequest) {
  const home = request.nextUrl.clone();
  home.pathname = "/";
  home.search = "";
  return NextResponse.redirect(home);
}

/** 운영 화면·로그인 폼을 렌더링하지 않고 존재하지 않는 경로처럼 응답한다. */
function hiddenAdminResponse() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export const config = {
  matcher: ["/producers/:path*", "/admin/:path*"],
};
