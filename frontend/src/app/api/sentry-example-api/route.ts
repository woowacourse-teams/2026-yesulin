import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

// A faulty API route to test Sentry's error monitoring
export function GET() {
  if (process.env.SENTRY_EXAMPLE_ENABLED !== "true") {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  throw new SentryExampleAPIError(
    "Sentry server example error",
  );
}
