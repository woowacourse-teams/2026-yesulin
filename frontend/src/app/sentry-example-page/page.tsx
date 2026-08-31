import { notFound } from "next/navigation";
import { SentryExampleClient } from "./sentry-example-client";

export default function SentryExamplePage() {
  if (process.env.SENTRY_EXAMPLE_ENABLED !== "true") notFound();
  return <SentryExampleClient />;
}
