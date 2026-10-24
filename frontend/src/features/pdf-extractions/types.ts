export type PdfExtractionStatus = "UPLOADING" | "UPLOAD_EXPIRED" | "QUEUED" | "DELAYED" | "COMPLETED" | "PARTIAL" | "FAILED";

export type PdfExtractionResult = {
  readonly status: "COMPLETED" | "PARTIAL" | "FAILED";
  readonly sourceSha256: string;
  readonly errorCode: string;
  readonly warnings: readonly string[];
  readonly pages: readonly {
    readonly number: number;
    readonly text: string;
    readonly needsOcr: boolean;
    readonly images: readonly { readonly fileKey: string; readonly url: string; readonly classification: string }[];
  }[];
};

export type PdfExtractionJob = {
  readonly jobId: string;
  readonly originalFilename: string;
  readonly size: number;
  readonly createdAt: string;
  readonly uploadedAt: string | null;
  readonly status: PdfExtractionStatus;
  readonly sourceFileKey: string;
  readonly resultFileKey: string;
  readonly sourceUrl: string | null;
  readonly result: PdfExtractionResult | null;
};

export type PreparedPdfUpload = {
  readonly jobId: string;
  readonly fileKey: string;
  readonly upload: {
    readonly url: string;
    readonly method: "PUT";
    readonly expiresAt: string;
    readonly headers: Record<string, string>;
  };
};

export const pdfStatusLabels: Record<PdfExtractionStatus, string> = {
  UPLOADING: "업로드 확인 전", UPLOAD_EXPIRED: "업로드 만료", QUEUED: "추출 대기·처리 중", DELAYED: "처리 지연",
  COMPLETED: "추출 완료", PARTIAL: "일부 추출", FAILED: "추출 실패",
};

export function isPendingPdf(status: PdfExtractionStatus) {
  return status === "QUEUED" || status === "DELAYED";
}
