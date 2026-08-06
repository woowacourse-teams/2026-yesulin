"use client";

import { createContext, use, useEffect, useRef, useState } from "react";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import type { PostingId } from "@/features/auditions/types";
import { applicationFormSteps, applicationStepProgress } from "@/features/applications/application-form";
import { applicationStepIssue, hasApplicationDraft } from "@/features/applications/application-form-state";
import type { ApplicationStepIssue } from "@/features/applications/application-form-state";
import type {
  ApplicationPhoto,
  CareerDraft,
  SubmissionState,
} from "@/features/applications/application-form-state";

type ApplicationReceipt = { readonly number: string; readonly submittedAt: string };
type EditableSection = "BASIC" | "INTRODUCTION" | "MATERIALS" | "CAREER" | "CUSTOM";
type ReviewIssue = { readonly section: EditableSection; readonly title: string; readonly message: string };
type PublicApplicationState = {
  readonly stepIndex: number;
  readonly values: Readonly<Record<string, string>>;
  readonly photos: readonly ApplicationPhoto[];
  readonly videoUrl: string;
  readonly noCareer: boolean;
  readonly careers: readonly CareerDraft[];
  readonly stepError: string;
  readonly stepProgress: ReturnType<typeof applicationStepProgress>;
  readonly reviewIssues: readonly ReviewIssue[];
  readonly dirty: boolean;
  readonly leaveConfirmationOpen: boolean;
  readonly mediaError: string;
  readonly reviewing: boolean;
  readonly consent: boolean;
  readonly submissionState: SubmissionState;
  readonly submissionError: string;
  readonly receipt: ApplicationReceipt | null;
};

type PublicApplicationActions = {
  readonly updateField: (id: string, value: string) => void;
  readonly updatePhotos: (photos: readonly ApplicationPhoto[]) => void;
  readonly markPhotoReady: (id: string) => void;
  readonly updateVideo: (url: string) => void;
  readonly reportMediaError: (error: string) => void;
  readonly updateNoCareer: (noCareer: boolean) => void;
  readonly updateCareers: (careers: readonly CareerDraft[]) => void;
  readonly moveStep: (index: number) => void;
  readonly nextStep: () => void;
  readonly editSection: (section: EditableSection) => void;
  readonly requestBack: () => void;
  readonly cancelBack: () => void;
  readonly confirmBack: () => void;
  readonly updateConsent: (consent: boolean) => void;
  readonly submit: (result: "SUCCESS" | "ERROR") => void;
};

type PublicApplicationMeta = {
  readonly postingId: PostingId;
  readonly fields: readonly ApplicationFieldInput[];
  readonly steps: ReturnType<typeof applicationFormSteps>;
  readonly performanceTitle: string;
  readonly postingTitle: string;
  readonly roleName: string;
  readonly onBack: () => void;
};

type PublicApplicationContextValue = {
  readonly state: PublicApplicationState;
  readonly actions: PublicApplicationActions;
  readonly meta: PublicApplicationMeta;
};

const PublicApplicationContext = createContext<PublicApplicationContextValue | null>(null);

export function usePublicApplication() {
  const value = use(PublicApplicationContext);
  if (!value) throw new Error("PublicApplicationProvider 안에서 사용해 주세요.");
  return value;
}

type PublicApplicationProviderProps = Omit<PublicApplicationMeta, "steps"> & {
  readonly children: React.ReactNode;
};

export function PublicApplicationProvider({
  postingId,
  fields,
  performanceTitle,
  postingTitle,
  roleName,
  onBack,
  children,
}: PublicApplicationProviderProps) {
  const steps = applicationFormSteps(fields);
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<Readonly<Record<string, string>>>({});
  const [photos, setPhotos] = useState<readonly ApplicationPhoto[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [noCareer, setNoCareer] = useState(false);
  const [careers, setCareers] = useState<readonly CareerDraft[]>([]);
  const [stepErrors, setStepErrors] = useState<Readonly<Record<number, string>>>({});
  const [completedStepIndexes, setCompletedStepIndexes] = useState<readonly number[]>([]);
  const [mediaError, setMediaError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [leaveConfirmationOpen, setLeaveConfirmationOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("IDLE");
  const [submissionError, setSubmissionError] = useState("");
  const [receipt, setReceipt] = useState<ApplicationReceipt | null>(null);
  const submissionTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (submissionTimer.current) window.clearTimeout(submissionTimer.current);
  }, []);

  const dirty = hasApplicationDraft({
    values, photos, videoUrl, noCareer, careers, consent, submitted: receipt !== null,
  });

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const validationIssue = (index: number) => applicationStepIssue({
    step: steps[index]!, photos, videoUrl, noCareer, careers, values,
  });
  const maxReachedStepIndex = Math.min(
    steps.length - 1,
    completedStepIndexes.length ? Math.max(...completedStepIndexes) + 1 : 0,
  );
  const reviewIssues = steps.flatMap((step, index) => {
    const issue = validationIssue(index);
    return issue ? [{ section: step.section as EditableSection, title: step.title, message: issue.message }] : [];
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
      const control = field?.querySelector<HTMLElement>("input:not([disabled]), select:not([disabled]), textarea:not([disabled])");
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

  const editSection = (section: EditableSection) => {
    if (submissionState === "SUBMITTING" || submissionTimer.current !== null) return;
    const index = steps.findIndex((item) => item.section === section);
    if (index >= 0) {
      setReviewing(false);
      moveStep(index);
      window.requestAnimationFrame(() => document.querySelector<HTMLElement>("#application-step-content input:not([type=file]):not([disabled]), #application-step-content select:not([disabled]), #application-step-content textarea:not([disabled]), #application-step-content button:not([disabled])")?.focus());
    }
  };

  const requestBack = () => {
    if (dirty) {
      setLeaveConfirmationOpen(true);
      return;
    }
    onBack();
  };

  const submit = (result: "SUCCESS" | "ERROR") => {
    if (submissionState === "SUBMITTING" || submissionTimer.current !== null) return;
    if (!consent) {
      setSubmissionError("개인정보 수집·이용 동의가 필요합니다.");
      window.requestAnimationFrame(() => document.getElementById("application-consent")?.focus());
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
    submissionTimer.current = window.setTimeout(() => {
      submissionTimer.current = null;
      if (result === "ERROR") {
        setSubmissionState("ERROR");
        setSubmissionError("지원서를 접수하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const now = new Date();
      const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const submittedAt = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${now.toTimeString().slice(0, 5)}`;
      setReceipt({ number: `YS-${date}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`, submittedAt });
    }, 650);
  };

  const state: PublicApplicationState = {
    stepIndex, values, photos, videoUrl, noCareer, careers, stepError: stepErrors[stepIndex] ?? "", mediaError,
    stepProgress: applicationStepProgress({ steps, stepIndex, maxReachedStepIndex, completedStepIndexes, stepErrors }), reviewIssues,
    dirty, leaveConfirmationOpen, reviewing, consent, submissionState, submissionError, receipt,
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
    submit,
  };

  return <PublicApplicationContext value={{ state, actions, meta: { postingId, fields, steps, performanceTitle, postingTitle, roleName, onBack } }}>{children}</PublicApplicationContext>;
}
