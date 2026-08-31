import * as Sentry from "@sentry/nextjs";
import { isRequestId } from "./request-id";

type ErrorReportContext = {
  readonly feature: string;
  readonly operation: string;
  readonly requestId?: string;
  readonly errorCode?: string | null;
  readonly status?: number;
  readonly uploadStage?: string;
  readonly uploadFlow?: string;
  readonly uploadAttempt?: number;
};

const capturedErrors = new WeakSet<object>();

/** 사용자 입력이나 응답 본문은 싣지 않고, 로그 상관관계에 필요한 분류값만 보낸다. */
export function reportError(cause: unknown, context: ErrorReportContext) {
  const error = cause instanceof Error ? cause : new Error("Unknown frontend failure", { cause });
  const chain = errorChain(error);
  if (chain.some((item) => capturedErrors.has(item))) return;
  chain.forEach((item) => capturedErrors.add(item));

  Sentry.withScope((scope) => {
    scope.setTag("feature", context.feature);
    scope.setTag("operation", context.operation);
    const requestId = context.requestId ?? requestIdFrom(cause);
    const upload = uploadContextFrom(cause);
    if (requestId) scope.setTag("request_id", requestId);
    if (context.errorCode ?? upload.errorCode) scope.setTag("error_code", context.errorCode ?? upload.errorCode!);
    if (context.status !== undefined) scope.setTag("http_status", String(context.status));
    if (context.uploadStage ?? upload.stage) scope.setTag("upload_stage", context.uploadStage ?? upload.stage!);
    if (context.uploadFlow ?? upload.flow) scope.setTag("upload_flow", context.uploadFlow ?? upload.flow!);
    if (context.uploadAttempt ?? upload.attempt) {
      scope.setTag("upload_attempt", String(context.uploadAttempt ?? upload.attempt));
    }
    if (upload.causeName) scope.setTag("cause_name", upload.causeName);
    Sentry.captureException(error);
  });
}

function uploadContextFrom(cause: unknown) {
  let current = cause;
  const context: { errorCode?: string; stage?: string; flow?: string; attempt?: number; causeName?: string } = {};
  const visited = new Set<object>();

  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth += 1) {
    if (visited.has(current)) break;
    visited.add(current);
    if (!context.errorCode) context.errorCode = stringProperty(current, "code");
    if (!context.stage) context.stage = stringProperty(current, "stage");
    if (!context.flow) context.flow = stringProperty(current, "flow");
    context.causeName = stringProperty(current, "name") ?? context.causeName;
    if (context.attempt === undefined && "attempt" in current && typeof current.attempt === "number") {
      context.attempt = current.attempt;
    }
    current = "cause" in current ? current.cause : undefined;
  }
  return context;
}

function stringProperty(value: object, key: "code" | "stage" | "flow" | "name") {
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" ? candidate : undefined;
}

function errorChain(error: Error) {
  const chain: object[] = [];
  let current: unknown = error;
  const visited = new Set<object>();
  while (typeof current === "object" && current !== null && !visited.has(current)) {
    visited.add(current);
    chain.push(current);
    current = "cause" in current ? current.cause : undefined;
  }
  return chain;
}

function requestIdFrom(cause: unknown): string | undefined {
  let current = cause;
  const visited = new Set<object>();

  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth += 1) {
    if (visited.has(current)) return undefined;
    visited.add(current);
    const candidate = requestIdProperty(current, "requestId") ?? requestIdProperty(current, "incidentId");
    if (candidate) return candidate;
    current = "cause" in current ? current.cause : undefined;
  }
  return undefined;
}

function requestIdProperty(value: object, key: "requestId" | "incidentId") {
  const candidate = (value as Record<string, unknown>)[key];
  return isRequestId(candidate) ? candidate : undefined;
}
