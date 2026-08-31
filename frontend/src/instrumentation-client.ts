import * as Sentry from "@sentry/nextjs";
import { sentryCommonOptions } from "./features/monitoring/sentry-config";

Sentry.init({
  ...sentryCommonOptions(),
  tracePropagationTargets: [/^\/api(?:\/|$)/, /^\/oauth2(?:\/|$)/, /^\/login\/oauth2(?:\/|$)/],
  beforeSend(event) {
    if (event.request?.url) event.request.url = withoutQuery(event.request.url);
    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    if (breadcrumb.category === "console" || breadcrumb.category === "ui.click") return null;
    if (breadcrumb.data) {
      for (const key of ["from", "to", "url"]) {
        if (typeof breadcrumb.data[key] === "string") breadcrumb.data[key] = withoutQuery(breadcrumb.data[key]);
      }
    }
    return breadcrumb;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

function withoutQuery(url: string) {
  return url.split("?", 1)[0] ?? url;
}
