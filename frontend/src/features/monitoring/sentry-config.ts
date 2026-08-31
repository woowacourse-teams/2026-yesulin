const PRODUCTION_TRACE_SAMPLE_RATE = 0.05;

export function sentryCommonOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  return {
    dsn,
    enabled: Boolean(dsn),
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    enableLogs: false,
    tracesSampleRate: process.env.NODE_ENV === "production" ? PRODUCTION_TRACE_SAMPLE_RATE : 1,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: { request: false, response: false },
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      stackFrameVariables: false,
    },
  };
}
