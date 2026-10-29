import { NextRequest, NextResponse } from "next/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** 목적지는 매번 새로 읽는다. 브라우저·CDN에 인쇄 당시 목적지를 영구 저장하지 않는다. */
export async function redirectBusinessCard(request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const landing = new URL(`/networking/${encodeURIComponent(publicId)}`, request.url);
  const move = (url: URL | string) => NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
  if (!UUID.test(publicId)) {
    landing.searchParams.set("state", "missing");
    return move(landing);
  }
  try {
    const apiOrigin = process.env.API_ORIGIN;
    if (!apiOrigin) throw new Error("API origin is unavailable");
    const lookup = (recordVisit: boolean) => fetch(new URL(`/api/v1/public/business-cards/${publicId}${recordVisit ? "/visit" : ""}`, apiOrigin), {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10_000),
    });
    let response: Response;
    if (request.method === "HEAD") {
      response = await lookup(false);
    } else {
      // 기록 장애로 이동을 막지 않으며, 재시도는 집계하지 않는 조회로만 한다.
      const recorded = await lookup(true).catch(() => null);
      response = recorded && recorded.status < 500 ? recorded : await lookup(false);
    }
    if (response.status === 404) {
      landing.searchParams.set("state", "missing");
      return move(landing);
    }
    if (!response.ok) throw new Error("Business card lookup failed");
    const { profileUrl } = await response.json() as { profileUrl: string | null };
    return move(profileUrl ?? landing);
  } catch {
    landing.searchParams.set("state", "unavailable");
    return move(landing);
  }
}
