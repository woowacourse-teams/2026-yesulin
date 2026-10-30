export type ProfileFact = { readonly value: string | null; readonly evidence: string | null };
export type ProfileCareer = { readonly title: string; readonly venue: string | null; readonly part: string | null;
  readonly genre: string | null; readonly period: string | null; readonly company: string | null; readonly evidence: string };
export type PdfApplicantProfile = { readonly birthDate: ProfileFact; readonly age: ProfileFact; readonly height: ProfileFact;
  readonly education: ProfileFact; readonly careers: readonly ProfileCareer[] };

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
  readonly applicantInfo?: {
    readonly version: "applicant-info-v1" | "applicant-info-v2";
    readonly profile?: PdfApplicantProfile | null;
    readonly status: "COMPLETED" | "FAILED" | "SKIPPED";
    readonly provider: "bedrock" | "gemini" | "";
    readonly model: string;
    readonly applicantName: string | null;
    readonly applicantNameEvidence: string | null;
    readonly roleId: string | null;
    readonly roleEvidence: string | null;
    readonly reason: string;
  };
};

export type PdfExtractionJob = {
  readonly jobId: string;
  readonly originalFilename: string;
  readonly extension?: "pdf";
  readonly contentType?: "application/pdf";
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
