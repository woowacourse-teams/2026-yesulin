import * as Sentry from "@sentry/nextjs";
import { sentryCommonOptions } from "./src/features/monitoring/sentry-config";

Sentry.init({
  ...sentryCommonOptions(),
  beforeSend(event) {
    if (event.request?.url) event.request.url = event.request.url.split("?", 1)[0];
    return event;
  },
});
