export const uploadFlows = ["APPLICATION_PHOTO", "PROFILE_PHOTO", "PERFORMANCE_POSTER"] as const;
export type UploadFlow = typeof uploadFlows[number];

export const uploadStages = ["PREPARE", "UPLOAD_REQUEST", "PUT", "COMPLETION", "RETRY", "SUBMISSION"] as const;
export type UploadStage = typeof uploadStages[number];

export const uploadErrorCodes = [
  "FILE_READ_FAILED",
  "MEMORY_BLOB_SIZE_MISMATCH",
  "UPLOAD_REQUEST_FAILED",
  "WEBKIT_FILE_NOT_FOUND",
  "NETWORK_FETCH_FAILED",
  "S3_PUT_REJECTED",
  "FILE_METADATA_MISMATCH",
  "COMPLETION_FAILED",
] as const;
export type UploadErrorCode = typeof uploadErrorCodes[number];

export type UploadDiagnostic = {
  readonly uploadFlow: UploadFlow;
  readonly stage: UploadStage;
  readonly attempt: 1 | 2;
  readonly result: "FAILED" | "RETRY_SUCCEEDED";
  readonly errorCode: UploadErrorCode;
  readonly httpStatus?: number;
};

export type UploadResource = {
  readonly fileId: number;
  readonly uploadUrl: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
};

export type IncidentContext = { readonly incidentId: string };

export type SafeUploadInput = {
  readonly flow: UploadFlow;
  readonly source: Blob;
  readonly originalFilename: string;
  readonly requestUpload: (
    metadata: { readonly originalFilename: string; readonly contentType: string; readonly size: number },
    context: IncidentContext,
  ) => Promise<UploadResource>;
  readonly completeUpload: (fileId: number, context: IncidentContext) => Promise<void>;
  readonly put?: (resource: UploadResource, body: Blob) => Promise<Response>;
  readonly createIncidentId?: () => string;
  readonly reportDiagnostic?: (diagnostic: UploadDiagnostic & IncidentContext) => void;
};

export type SafeUploadResult = {
  readonly fileId: number;
  readonly incidentId: string;
  readonly retried: boolean;
};

export class SafeUploadError extends Error {
  readonly incidentId: string;
  readonly flow: UploadFlow;
  readonly stage: UploadStage;
  readonly attempt: 1 | 2;
  readonly code: UploadErrorCode;
  readonly httpStatus?: number;

  constructor(input: IncidentContext & {
    readonly flow: UploadFlow;
    readonly stage: UploadStage;
    readonly attempt: 1 | 2;
    readonly code: UploadErrorCode;
    readonly httpStatus?: number;
    readonly cause: unknown;
  }) {
    super(userMessage(input.stage, input.incidentId), { cause: input.cause });
    this.name = "SafeUploadError";
    this.incidentId = input.incidentId;
    this.flow = input.flow;
    this.stage = input.stage;
    this.attempt = input.attempt;
    this.code = input.code;
    this.httpStatus = input.httpStatus;
  }
}

function userMessage(stage: UploadStage, incidentId: string) {
  const action = stage === "PREPARE"
    ? "사진을 읽지 못했습니다. 해당 사진을 다시 선택해 주세요."
    : stage === "UPLOAD_REQUEST"
      ? "업로드를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요."
      : stage === "COMPLETION"
        ? "사진 검증을 완료하지 못했습니다. 다시 시도해 주세요."
        : "사진 전송을 완료하지 못했습니다. 네트워크를 확인한 뒤 다시 시도해 주세요.";
  return `${action} 문의 시 오류 ID ${incidentId}를 알려 주세요.`;
}
