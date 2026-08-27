"use client";

import { createContext, use, useEffect, useMemo, useState } from "react";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { applicationFormSteps, applicationStepProgress } from "@/features/applications/application-form";
import { applicationStepIssue } from "@/features/applications/application-form-state";
import type { ApplicationStepIssue, SubmissionState } from "@/features/applications/application-form-state";
import { createApplicationSubmission } from "@/features/applications/submission-api";
import { deletePublicApplicationDraft } from "@/features/applications/public-application-draft-store";
import { buildApplicationAuthReturnTo } from "@/features/auth/return-to";
import { applicationStepIndex } from "@/features/applications/routes";
import { trackAnalyticsEvent } from "@/features/analytics/events";
import type { EditableSection, PublicApplicationActions, PublicApplicationContextValue, PublicApplicationProviderProps, PublicApplicationState, SubmissionReceipt } from "./public-application-context-types";
import { usePublicApplicationDraft } from "./use-public-application-draft";
import { usePublicApplicationRoute } from "./use-public-application-route";

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
  initialRoute,
  children,
}: PublicApplicationProviderProps) {
  const steps = useMemo(() => applicationFormSteps(fields), [fields]);
  const [receipt, setReceipt] = useState<SubmissionReceipt | null>(null);
  const draft = usePublicApplicationDraft({
    postingId,
    fields,
    prefill,
    initialRoleIds,
    initialStepIndex: applicationStepIndex(initialRoute),
    initialReviewing: initialRoute === "review",
    stepCount: steps.length,
    submitted: receipt !== null,
  });
  const {
    stepIndex, setStepIndex, values, setValues, photos, setPhotos, videoUrl, setVideoUrl,
    noCareer, setNoCareer, careers, setCareers, completedStepIndexes, setCompletedStepIndexes,
    reviewing, setReviewing, consent: privacyConsent, setConsent: setPrivacyConsent,
    thirdPartyConsent, setThirdPartyConsent, saveToProfile, setSaveToProfile, roleIds,
  } = draft;
  const consent = privacyConsent && thirdPartyConsent;
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
  const updateRoute = usePublicApplicationRoute({
    postingId, roleIds, steps, stepIndex, reviewing, completedStepIndexes,
    maxReachedStepIndex, storageReady: draft.storageReady, profilePrefilled: Boolean(prefill), setStepIndex, setReviewing,
  });
  const reviewIssues = steps.flatMap((step, index) => {
    const issue = validationIssue(index);
    return issue ? [{ section: (steps[index]?.fields.find((field) => field.id === issue.fieldId || issue.fieldId.startsWith(`${field.id}.`))?.section ?? step.sections[0]) as EditableSection, fieldId: issue.fieldId, title: step.title, message: issue.message }] : [];
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
    setReviewing(false);
    updateRoute(steps[index]!.key);
  };

  const nextStep = () => {
    const issue = validationIssue(stepIndex);
    if (issue) {
      setStepErrors((current) => ({ ...current, [stepIndex]: issue.message }));
      focusIssue(issue);
      return;
    }
    clearStepError(stepIndex);
    if (!completedStepIndexes.includes(stepIndex)) {
      trackAnalyticsEvent("application_step_complete", { step_name: steps[stepIndex]!.key, step_number: stepIndex + 1, step_count: steps.length });
    }
    setCompletedStepIndexes((current) => current.includes(stepIndex) ? current : [...current, stepIndex]);
    if (stepIndex === steps.length - 1) {
      setReviewing(true);
      updateRoute("review");
    } else {
      setStepIndex(stepIndex + 1);
      updateRoute(steps[stepIndex + 1]!.key);
    }
  };

  const editSection = (section: EditableSection, fieldId?: string) => {
    if (submissionState === "SUBMITTING") return;
    const index = steps.findIndex((item) => item.sections.includes(section));
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
      updateRoute(steps[invalidIndex]!.key);
      setStepErrors((current) => ({ ...current, [invalidIndex]: issue.message }));
      focusIssue(issue);
      return;
    }
    setSubmissionState("SUBMITTING");
    setSubmissionError("");
    if (result === "ERROR") {
      setSubmissionState("ERROR");
      setSubmissionError("지원서를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.");
      trackAnalyticsEvent("application_submit_error", { error_code: "simulated_error" });
      return;
    }
    try {
      const response = await createApplicationSubmission({
        postingId,
        fields,
        values,
        photos,
        videoUrl,
        careers,
        noCareer,
        roleIds,
        privacyConsent,
        thirdPartyConsent,
        saveToProfile,
      });
      setReceipt({
        submissionId: response.submissionId,
        submittedAt: response.submittedAt,
        profileSaved: response.profileSaved,
      });
      trackAnalyticsEvent("application_submit_success", { selected_role_count: roleIds.length, save_to_profile: saveToProfile, profile_saved: Boolean(response.profileSaved) });
      void deletePublicApplicationDraft(postingId).catch(() => undefined);
    } catch (cause) {
      console.error("[지원서 제출 실패]", cause);
      if (cause instanceof AuditionRequestError && cause.status === 401) {
        trackAnalyticsEvent("application_submit_error", { error_code: "auth_expired" });
        const returnTo = encodeURIComponent(buildApplicationAuthReturnTo(postingId, roleIds));
        window.location.assign(`/login?returnTo=${returnTo}`);
        return;
      }
      const errorCode = cause instanceof AuditionRequestError
        ? cause.status >= 500 ? "server_error" : "client_error"
        : cause instanceof TypeError ? "network_error" : "unknown";
      trackAnalyticsEvent("application_submit_error", { error_code: errorCode });
      setSubmissionState("ERROR");
      setSubmissionError(cause instanceof Error ? cause.message : "지원서를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
  };

  const state: PublicApplicationState = {
    stepIndex, values, photos, videoUrl, noCareer, careers, stepError: stepErrors[stepIndex] ?? "", mediaError,
    stepProgress: applicationStepProgress({ steps, stepIndex, maxReachedStepIndex, completedStepIndexes, stepErrors }), reviewIssues,
    hasUnsavedChanges: draft.hasUnsavedChanges, leaveConfirmationOpen, reviewing, consent, privacyConsent, thirdPartyConsent, saveToProfile,
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
    updateConsent: (value) => { setPrivacyConsent(value); setThirdPartyConsent(value); setSubmissionError(""); },
    updatePrivacyConsent: (value) => { setPrivacyConsent(value); setSubmissionError(""); },
    updateThirdPartyConsent: (value) => { setThirdPartyConsent(value); setSubmissionError(""); },
    updateSaveToProfile: (value) => setSaveToProfile(value),
    retryDraftSave: draft.retrySave,
    submit,
  };

  return <PublicApplicationContext value={{ state, actions, meta: { postingId, fields, steps, performanceTitle, postingTitle, roleIds, roleName, authenticated, onBack, prefillSummary: prefill ? { filledCount: prefill.filledCount, requiredCount: prefill.requiredCount, missingKeys: prefill.missingKeys } : undefined } }}>{children}</PublicApplicationContext>;
}
