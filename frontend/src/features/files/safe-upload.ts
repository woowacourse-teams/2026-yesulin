import {
  SafeUploadError,
  type IncidentContext,
  type SafeUploadInput,
  type SafeUploadResult,
  type UploadDiagnostic,
  type UploadErrorCode,
  type UploadResource,
  type UploadStage,
} from "./safe-upload-types";
import { reportError } from "../monitoring/report-error";
import { createRequestId } from "../monitoring/request-id";

export { SafeUploadError, uploadErrorCodes, uploadFlows, uploadStages } from "./safe-upload-types";
export type {
  SafeUploadInput,
  SafeUploadResult,
  UploadDiagnostic,
  UploadErrorCode,
  UploadFlow,
  UploadResource,
  UploadStage,
} from "./safe-upload-types";

class AttemptFailure {
  constructor(readonly stage: "PUT" | "COMPLETION", readonly cause: unknown) {}
}

class PutRejectedError extends Error {
  constructor(readonly status: number) {
    super(`S3 PUT rejected with status ${status}`);
    this.name = "PutRejectedError";
  }
}

class MemoryBlobSizeMismatchError extends Error {
  readonly name = "MemoryBlobSizeMismatchError";
}

const preparedMemoryBlobs = new WeakSet<Blob>();

export async function safeUpload(input: SafeUploadInput): Promise<SafeUploadResult> {
  const incidentId = (input.createIncidentId ?? defaultIncidentId)();
  const context = { incidentId };
  let body: Blob;
  try {
    body = preparedMemoryBlobs.has(input.source) ? input.source : await prepareMemoryBlob(input.source);
  } catch (cause) {
    throw finalFailure(input, context, "PREPARE", 1, classifyPrepareFailure(cause), cause);
  }

  let resource: UploadResource;
  try {
    resource = await input.requestUpload(
      { originalFilename: input.originalFilename, contentType: body.type, size: body.size },
      context,
    );
  } catch (cause) {
    throw finalFailure(input, context, "UPLOAD_REQUEST", 1, classifyRequestFailure(cause), cause);
  }

  const put = input.put ?? putBlob;
  try {
    await uploadAttempt(resource, body, context, input.completeUpload, put);
    return { fileId: resource.fileId, incidentId, retried: false };
  } catch (caught) {
    const failure = attemptFailure(caught);
    const classification = classifyAttemptFailure(failure);
    if (!classification.retryable) {
      throw finalFailure(input, context, failure.stage, 1, classification, failure.cause);
    }

    try {
      await uploadAttempt(resource, body, context, input.completeUpload, put);
      emitDiagnostic(input, {
        ...context,
        uploadFlow: input.flow,
        stage: "RETRY",
        attempt: 2,
        result: "RETRY_SUCCEEDED",
        errorCode: classification.code,
        ...(classification.httpStatus === undefined ? {} : { httpStatus: classification.httpStatus }),
      });
      if (classification.code === "WEBKIT_FILE_NOT_FOUND") {
        reportError(failure.cause, {
          feature: "upload",
          operation: "retry_recovered",
          requestId: context.incidentId,
          errorCode: classification.code,
          uploadStage: "RETRY",
          uploadFlow: input.flow,
          uploadAttempt: 2,
        });
      }
      return { fileId: resource.fileId, incidentId, retried: true };
    } catch (retryCaught) {
      const retryFailure = attemptFailure(retryCaught);
      throw finalFailure(input, context, "RETRY", 2, classifyAttemptFailure(retryFailure), retryFailure.cause);
    }
  }
}

export async function uploadSequentially<Input, Output>(
  inputs: readonly Input[],
  upload: (input: Input) => Promise<Output>,
): Promise<Output[]> {
  const outputs: Output[] = [];
  for (const input of inputs) outputs.push(await upload(input));
  return outputs;
}

export async function prepareMemoryBlob(source: Blob): Promise<Blob> {
  const buffer = await source.arrayBuffer();
  const body = new Blob([buffer], { type: source.type });
  if (body.size !== source.size) throw new MemoryBlobSizeMismatchError("memory Blob size differs from source");
  preparedMemoryBlobs.add(body);
  return body;
}

async function uploadAttempt(
  resource: UploadResource,
  body: Blob,
  context: IncidentContext,
  completeUpload: SafeUploadInput["completeUpload"],
  put: NonNullable<SafeUploadInput["put"]>,
) {
  try {
    const response = await put(resource, body);
    if (!response.ok) throw new PutRejectedError(response.status);
  } catch (cause) {
    throw new AttemptFailure("PUT", cause);
  }
  try {
    await completeUpload(resource.fileId, context);
  } catch (cause) {
    throw new AttemptFailure("COMPLETION", cause);
  }
}

function putBlob(resource: UploadResource, body: Blob) {
  return fetch(resource.uploadUrl, { method: resource.method, headers: resource.headers, body });
}

function finalFailure(
  input: SafeUploadInput,
  context: IncidentContext,
  stage: UploadStage,
  attempt: 1 | 2,
  classification: { readonly code: UploadErrorCode; readonly httpStatus?: number },
  cause: unknown,
) {
  const error = new SafeUploadError({
    ...context,
    flow: input.flow,
    stage,
    attempt,
    code: classification.code,
    cause,
    ...(classification.httpStatus === undefined ? {} : { httpStatus: classification.httpStatus }),
  });
  emitDiagnostic(input, {
    ...context,
    uploadFlow: input.flow,
    stage,
    attempt,
    result: "FAILED",
    errorCode: classification.code,
    ...(classification.httpStatus === undefined ? {} : { httpStatus: classification.httpStatus }),
  });
  if (classification.httpStatus === undefined || classification.httpStatus >= 500) {
    reportError(error, {
      feature: "upload",
      operation: "failure",
      requestId: context.incidentId,
      errorCode: classification.code,
      status: classification.httpStatus,
    });
  }
  return error;
}

function attemptFailure(cause: unknown) {
  return cause instanceof AttemptFailure ? cause : new AttemptFailure("PUT", cause);
}

function classifyPrepareFailure(cause: unknown): { readonly code: UploadErrorCode } {
  return cause instanceof MemoryBlobSizeMismatchError
    ? { code: "MEMORY_BLOB_SIZE_MISMATCH" }
    : { code: "FILE_READ_FAILED" };
}

function classifyRequestFailure(cause: unknown) {
  const status = errorStatus(cause);
  return { code: "UPLOAD_REQUEST_FAILED" as const, ...(status === undefined ? {} : { httpStatus: status }) };
}

function classifyAttemptFailure(failure: AttemptFailure) {
  const cause = failure.cause;
  const status = errorStatus(cause);
  if (errorCode(cause) === "FILE_METADATA_MISMATCH") {
    return { code: "FILE_METADATA_MISMATCH" as const, retryable: true, ...(status === undefined ? {} : { httpStatus: status }) };
  }
  if (errorName(cause) === "NotFoundError") return { code: "WEBKIT_FILE_NOT_FOUND" as const, retryable: true };
  if (cause instanceof TypeError && /load failed|failed to fetch/i.test(cause.message)) {
    return { code: "NETWORK_FETCH_FAILED" as const, retryable: true };
  }
  if (cause instanceof PutRejectedError) {
    return { code: "S3_PUT_REJECTED" as const, retryable: false, httpStatus: cause.status };
  }
  return {
    code: failure.stage === "COMPLETION" ? "COMPLETION_FAILED" as const : "NETWORK_FETCH_FAILED" as const,
    retryable: false,
    ...(status === undefined ? {} : { httpStatus: status }),
  };
}

function errorName(cause: unknown) {
  return readStringProperty(cause, "name") ?? "";
}

function errorCode(cause: unknown) {
  return readStringProperty(cause, "code") ?? "";
}

function errorStatus(cause: unknown) {
  if (typeof cause !== "object" || cause === null || !("status" in cause)) return undefined;
  return typeof cause.status === "number" ? cause.status : undefined;
}

function readStringProperty(cause: unknown, property: "name" | "message" | "code") {
  if (typeof cause !== "object" || cause === null || !(property in cause)) return undefined;
  const value = (cause as Record<string, unknown>)[property];
  return typeof value === "string" ? value : undefined;
}

function defaultIncidentId() {
  return createRequestId();
}

function emitDiagnostic(input: SafeUploadInput, diagnostic: UploadDiagnostic & IncidentContext) {
  try {
    input.reportDiagnostic?.(diagnostic);
  } catch {
    // 진단 장애가 사용자에게 반환할 원래 업로드 오류를 덮어쓰지 않는 최상위 관측 경계다.
    console.warn(`[upload diagnostic callback failed] incidentId=${diagnostic.incidentId}`);
  }
}
