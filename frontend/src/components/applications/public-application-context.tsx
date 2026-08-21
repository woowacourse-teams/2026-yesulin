"use client";

import { createContext, use, useEffect, useState } from "react";
import { applicationFormSteps, applicationStepProgress } from "@/features/applications/application-form";
import { applicationStepIssue } from "@/features/applications/application-form-state";
import type { ApplicationStepIssue, SubmissionState } from "@/features/applications/application-form-state";
import { createPublicSubmission } from "@/features/applicants/api";
import { deletePublicApplicationDraft } from "@/features/applications/public-application-draft-store";
import { submissionValue } from "./public-application-draft";
import { hasSubmittedValue } from "@/features/applications/materials";
import type { EditableSection, PublicApplicationActions, PublicApplicationContextValue, PublicApplicationProviderProps, PublicApplicationState, SubmissionReceipt } from "./public-application-context-types";
import { usePublicApplicationDraft } from "./use-public-application-draft";

const PublicApplicationContext = createContext<PublicApplicationContextValue | null>(null);

export function usePublicApplication() {
  const value = use(PublicApplicationContext);
  if (!value) throw new Error("PublicApplicationProvider 안에서 사용해 주세요.");
  return value;
}

export function PublicApplicationProvider({
  postingId,
  fields,
  performanceTitle,
  postingTitle,
  roleIds: initialRoleIds,
  roleName,
  authenticated,
  onBack,
  prefill,
  children,
}: PublicApplicationProviderProps) {
  const steps = applicationFormSteps(fields);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const draft = usePublicApplicationDraft({ postingId, fields, prefill, initialRoleIds, submitted: receipt !== null });
  const {
    stepIndex, setStepIndex, values, setValues, photos, setPhotos, videoUrl, setVideoUrl,
    noCareer, setNoCareer, careers, setCareers, completedStepIndexes, setCompletedStepIndexes,
    reviewing, setReviewing, consent, setConsent, saveToProfile, setSaveToProfile, roleIds,
  } = draft;
  const [stepErrors, setStepErrors] = useState<Readonly<Record<number, string>>>({});
  const [mediaError, setMediaError] = useState("");
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("IDLE");
  const [submissionError, setSubmissionError] = useState("");

  useEffect(() => {
    if (!draft.hasUnsavedChanges) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [draft.hasUnsavedChanges]);

  const validationIssue = (index: number) => applicationStepIssue({
    step: steps[index]!, photos, videoUrl, noCareer, careers, values,
  });
  const maxReachedStepIndex = Math.min(
    steps.length - 1,
    completedStepIndexes.length ? Math.max(...completedStepIndexes) + 1 : 0,
  );
  const reviewIssues = steps.flatMap((step, index) => {
    const issue = validationIssue(index);
    return issue ? [{ section: step.section as EditableSection, fieldId: issue.fieldId, title: step.title, message: issue.message }] : [];
  });

  const clearStepError = (index: number) => setStepErrors((current) => {
    if (!current[index]) return current;
    const remaining = { ...current };
    delete remaining[index];
    return remaining;
  });

  const focusIssue = (issue: ApplicationStepIssue) => {
    window.requestAnimationFrame(() => {
      const field = document.getElementById(`application-field-${issue.fieldId}`);
      const control = field?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])");
      field?.scrollIntoView({ behavior: "smooth", block: "center" });
      control?.focus({ preventScroll: true });
    });
  };

  const moveStep = (index: number) => {
    if (index < 0 || index >= steps.length || index > maxReachedStepIndex) return;
    setMediaError("");
    setStepIndex(index);
  };

  const nextStep = () => {
    const issue = validationIssue(stepIndex);
    if (issue) {
      setStepErrors((current) => ({ ...current, [stepIndex]: issue.message }));
      focusIssue(issue);
      return;
    }
    clearStepError(stepIndex);
    setCompletedStepIndexes((current) => current.includes(stepIndex) ? current : [...current, stepIndex]);
    if (stepIndex === steps.length - 1) setReviewing(true);
    else setStepIndex(stepIndex + 1);
  };

  const editSection = (section: EditableSection, fieldId?: string) => {
    if (submissionState === "SUBMITTING") return;
    const index = steps.findIndex((item) => item.section === section);
    if (index >= 0) {
      const issue = fieldId ? validationIssue(index) : null;
      setReviewing(false);
      moveStep(index);
      if (issue) {
        setStepErrors((current) => ({ ...current, [index]: issue.message }));
        focusIssue(issue);
      } else {
        window.requestAnimationFrame(() => document.querySelector<HTMLElement>("#application-step-content input:not([type=file]):not([disabled]), #application-step-content select:not([disabled]), #application-step-content textarea:not([disabled]), #application-step-content button:not([disabled])")?.focus());
      }
    }
  };

  const requestBack = () => {
    if (draft.hasUnsavedChanges) {
      setLeaveConfirmationOpen(true);
      return;
    }
    onBack();
  };

  const submit = async (result: "SUCCESS" | "ERROR") => {
    if (submissionState === "SUBMITTING") return;
    if (!consent) {
      setSubmissionError("개인정보 수집·이용 동의가 필요합니다.");
      window.requestAnimationFrame(() => document.getElementById("application-consent")?.focus());
      return;
    }
    if (!authenticated) {
      setSubmissionError("최종 제출하려면 소셜 로그인이 필요합니다.");
      window.requestAnimationFrame(() => document.getElementById("application-auth-actions")?.focus());
      return;
    }
    const invalidIndex = steps.findIndex((_, index) => validationIssue(index));
    if (invalidIndex >= 0) {
      const issue = validationIssue(invalidIndex)!;
      setReviewing(false);
      setStepIndex(invalidIndex);
      setStepErrors((current) => ({ ...current, [invalidIndex]: issue.message }));
      focusIssue(issue);
      return;
    }
    setSubmissionState("SUBMITTING");
    setSubmissionError("");
    if (result === "ERROR") {
      setSubmissionState("ERROR");
      setSubmissionError("지원서를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }
    try {
      const submittedAnswers = fields
        .filter((field) => field.enabled)
        .map((field) => ({
          field,
          value: submissionValue(field, { values, photos, videoUrl, careers, noCareer }),
        }))
        .filter(({ field, value }) => field.required || hasSubmittedValue(value));
      const response = await createPublicSubmission({
        postingId,
        roleIds,
        answers: submittedAnswers.map(({ field, value }) => ({
          key: field.id,
          ...(field.custom ? { label: field.label } : {}),
          value,
        })),
        privacyAgreed: consent,
        saveToProfile,
      });
      setReceipt({
        submissionId: response.submissionId,
        number: response.receiptNumber,
        submittedAt: response.submittedAt,
        profileClaimToken: response.profileClaimToken,
        profileClaimExpiresAt: response.profileClaimExpiresAt,
      });
      void deletePublicApplicationDraft(postingId).catch(() => undefined);
    } catch (cause) {
      setSubmissionState("ERROR");
      setSubmissionError(cause instanceof Error ? cause.message : "지원서를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const state: PublicApplicationState = {
    stepIndex, values, photos, videoUrl, noCareer, careers, stepError: stepErrors[stepIndex] ?? "", mediaError,
    stepProgress: applicationStepProgress({ steps, stepIndex, maxReachedStepIndex, completedStepIndexes, stepErrors }), reviewIssues,
    hasUnsavedChanges: draft.hasUnsavedChanges, leaveConfirmationOpen, reviewing, consent, saveToProfile,
    draftSaveStatus: draft.saveStatus, draftSaveError: draft.saveError, draftLastSavedAt: draft.lastSavedAt,
    draftRestored: draft.restored, submissionState, submissionError, receipt,
  };
  const actions: PublicApplicationActions = {
    updateField: (id, value) => { setValues((current) => ({ ...current, [id]: value })); clearStepError(stepIndex); },
    updatePhotos: (next) => { setPhotos(next); setMediaError(""); clearStepError(stepIndex); },
    markPhotoReady: (id) => setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, status: "READY" } : photo)),
    updateVideo: (url) => { setVideoUrl(url); setMediaError(""); clearStepError(stepIndex); },
    reportMediaError: (error) => { setMediaError(error); clearStepError(stepIndex); },
    updateNoCareer: (value) => { setNoCareer(value); clearStepError(stepIndex); },
    updateCareers: (next) => { setCareers(next); clearStepError(stepIndex); },
    moveStep,
    nextStep,
    editSection,
    requestBack,
    cancelBack: () => setLeaveConfirmationOpen(false),
    confirmBack: () => { setLeaveConfirmationOpen(false); onBack(); },
    updateConsent: (value) => { setConsent(value); setSubmissionError(""); },
    updateSaveToProfile: (value) => setSaveToProfile(value),
    retryDraftSave: draft.retrySave,
    submit,
  };

  return <PublicApplicationContext value={{ state, actions, meta: { postingId, fields, steps, performanceTitle, postingTitle, roleIds, roleName, authenticated, onBack, prefillSummary: prefill ? { filledCount: prefill.filledCount, requiredCount: prefill.requiredCount, missingKeys: prefill.missingKeys } : undefined } }}>{children}</PublicApplicationContext>;
}
