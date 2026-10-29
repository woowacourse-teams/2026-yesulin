import { NextRequest, NextResponse } from "next/server";
import { buildAnalyticsContext } from "@/features/analytics/server-context";

export const runtime = "nodejs";

/** 계정 원문 ID와 내부 계정 목록은 서버 안에서만 다룬다. 오류를 일반 방문으로 간주하지 않는다. */
export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.POSTHOG_COLLECTION_ENABLED !== "true") {
    return NextResponse.json({ enabled: false }, { headers });
  }
  try {
    const origin = process.env.API_ORIGIN;
    if (!origin) return NextResponse.json({ enabled: false }, { status: 503, headers });
    const response = await fetch(new URL("/api/v1/sessions/current", origin), {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok && response.status !== 401) return NextResponse.json({ enabled: false }, { status: 503, headers });
    const session = response.status === 401 ? null : await response.json();
    return NextResponse.json(buildAnalyticsContext(session, {
      secret: process.env.POSTHOG_IDENTITY_SECRET,
      internalIds: process.env.POSTHOG_INTERNAL_MEMBER_IDS,
      testObjects: process.env.POSTHOG_TEST_OBJECTS,
      formAttachments: process.env.POSTHOG_FORM_ATTACHMENTS,
    }), { headers });
  } catch {
    return NextResponse.json({ enabled: false }, { status: 503, headers });
  }
}
