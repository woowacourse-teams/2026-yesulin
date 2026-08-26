import { type NextRequest, NextResponse } from "next/server";

type CurrentSession = {
  readonly role?: unknown;
};

const realProducerSessionEnabled =
  process.env.NEXT_PUBLIC_API_MOCKING !== "enabled"
  || process.env.NEXT_PUBLIC_PRODUCER_LOGIN === "enabled";

export async function proxy(request: NextRequest) {
  if (!realProducerSessionEnabled) return NextResponse.next();

  try {
    const cookie = request.headers.get("cookie");
    const response = await fetch(currentSessionUrl(request), {
      method: "GET",
      headers: cookie
        ? { accept: "application/json", cookie }
        : { accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return redirectHome(request);

    const session = await response.json() as CurrentSession;
    if (session.role !== "PRODUCER") return redirectHome(request);

    return NextResponse.next();
  } catch {
    return redirectHome(request);
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

export const config = {
  matcher: ["/producers/:path*"],
};
