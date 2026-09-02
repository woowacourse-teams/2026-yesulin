import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SentryExampleClient } from "./sentry-example-client";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SentryExamplePage() {
  if (process.env.SENTRY_EXAMPLE_ENABLED !== "true") notFound();
  return <SentryExampleClient />;
}
