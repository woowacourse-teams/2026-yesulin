import type { Applicant as BaseApplicant } from "../auditions/types";
export type { ApplicantPhoto, ReviewStatus, SubmissionId } from "../auditions/types";
/** Existing screening presentation model; no legacy screening API is used. */
export type Applicant = BaseApplicant & {
  readonly review: BaseApplicant["review"] & { readonly revision?: number };
  readonly sourceDocument?: { readonly filename: string; readonly preparation: string;
    readonly educationText?: string; readonly ageText?: string; readonly heightText?: string;
    readonly careers?: readonly { readonly text: string; readonly title?: string; readonly part?: string;
      readonly period?: string; readonly genre?: string; readonly company?: string }[];
  };
};
