import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import type { PostingId } from "@/features/auditions/types";
import type { SubmissionId } from "@/features/auditions/types";
import type { applicationFormSteps, applicationStepProgress } from "@/features/applications/application-form";
import type { ApplicationPhoto, CareerDraft, SubmissionState } from "@/features/applications/application-form-state";
import type { ProfilePrefillResponse } from "@/features/applicants/types";
import type { DraftSaveStatus } from "./use-public-application-draft";

export type SubmissionReceipt = {
  readonly submissionId: SubmissionId;
  readonly submittedAt: string;
};

export type EditableSection = "BASIC" | "ADDITIONAL" | "INTRODUCTION" | "MATERIALS" | "CAREER" | "CUSTOM";
export type ReviewIssue = { readonly section: EditableSection; readonly fieldId: string; readonly title: string; readonly message: string };

export type PublicApplicationState = {
  readonly stepIndex: number;
  readonly values: Readonly<Record<string, string>>;
  readonly photos: readonly ApplicationPhoto[];
  readonly videoUrl: string;
  readonly noCareer: boolean;
  readonly careers: readonly CareerDraft[];
  readonly stepError: string;
  readonly stepProgress: ReturnType<typeof applicationStepProgress>;
  readonly reviewIssues: readonly ReviewIssue[];
  readonly hasUnsavedChanges: boolean;
  readonly leaveConfirmationOpen: boolean;
  readonly mediaError: string;
  readonly reviewing: boolean;
  readonly consent: boolean;
  readonly privacyConsent: boolean;
  readonly thirdPartyConsent: boolean;
  readonly saveToProfile: boolean;
  readonly draftSaveStatus: DraftSaveStatus;
  readonly draftSaveError: string;
  readonly draftLastSavedAt: number | null;
  readonly draftRestored: boolean;
  readonly submissionState: SubmissionState;
  readonly submissionError: string;
  readonly receipt: SubmissionReceipt | null;
};

export type PublicApplicationActions = {
  readonly updateField: (id: string, value: string) => void;
  readonly updatePhotos: (photos: readonly ApplicationPhoto[]) => void;
  readonly markPhotoReady: (id: string) => void;
  readonly updateVideo: (url: string) => void;
  readonly reportMediaError: (error: string) => void;
  readonly updateNoCareer: (noCareer: boolean) => void;
  readonly updateCareers: (careers: readonly CareerDraft[]) => void;
  readonly moveStep: (index: number) => void;
  readonly nextStep: () => void;
  readonly editSection: (section: EditableSection, fieldId?: string) => void;
  readonly requestBack: () => void;
  readonly cancelBack: () => void;
  readonly confirmBack: () => void;
  readonly updateConsent: (consent: boolean) => void;
  readonly updatePrivacyConsent: (consent: boolean) => void;
  readonly updateThirdPartyConsent: (consent: boolean) => void;
  readonly updateSaveToProfile: (save: boolean) => void;
  readonly retryDraftSave: () => void;
  readonly submit: (result: "SUCCESS" | "ERROR") => void;
};

export type PublicApplicationMeta = {
  readonly postingId: PostingId;
  readonly fields: readonly ApplicationFieldInput[];
  readonly steps: ReturnType<typeof applicationFormSteps>;
  readonly performanceTitle: string;
  readonly postingTitle: string;
  readonly roleIds: readonly string[];
  readonly roleName: string;
  readonly authenticated: boolean;
  readonly prefillSummary?: Pick<ProfilePrefillResponse, "filledCount" | "requiredCount" | "missingKeys">;
  readonly onBack: () => void;
};

export type PublicApplicationContextValue = {
  readonly state: PublicApplicationState;
  readonly actions: PublicApplicationActions;
  readonly meta: PublicApplicationMeta;
};

export type PublicApplicationProviderProps = Omit<PublicApplicationMeta, "steps"> & {
  readonly children: React.ReactNode;
  readonly prefill?: ProfilePrefillResponse;
};
