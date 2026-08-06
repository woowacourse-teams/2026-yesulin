"use client";

import { createContext, use, useEffect, useRef, useState } from "react";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { applicationFormSteps } from "@/features/applications/application-form";
import { applicationStepError } from "@/features/applications/application-form-state";
import type {
  ApplicationPhoto,
  CareerDraft,
  SubmissionState,
} from "@/features/applications/application-form-state";

type ApplicationReceipt = { readonly number: string; readonly submittedAt: string };
type EditableSection = "BASIC" | "MATERIALS" | "CAREER" | "CUSTOM";

type PublicApplicationState = {
  readonly stepIndex: number;
  readonly values: Readonly<Record<string, string>>;
  readonly photos: readonly ApplicationPhoto[];
  readonly videoUrl: string;
  readonly noCareer: boolean;
  readonly careers: readonly CareerDraft[];
  readonly stepError: string;
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
  readonly updateConsent: (consent: boolean) => void;
  readonly submit: (result: "SUCCESS" | "ERROR") => void;
};

type PublicApplicationMeta = {
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
  const [stepError, setStepError] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("IDLE");
  const [submissionError, setSubmissionError] = useState("");
  const [receipt, setReceipt] = useState<ApplicationReceipt | null>(null);
  const submissionTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (submissionTimer.current) window.clearTimeout(submissionTimer.current);
  }, []);

  const validationError = (index: number) => applicationStepError({
    step: steps[index]!, photos, videoUrl, noCareer, careers, values,
  });

  const moveStep = (index: number) => {
    setStepError("");
    setMediaError("");
    setStepIndex(index);
  };

  const nextStep = () => {
    const error = validationError(stepIndex);
    if (error) {
      setStepError(error);
      return;
    }
    if (stepIndex === steps.length - 1) setReviewing(true);
    else moveStep(stepIndex + 1);
  };

  const editSection = (section: EditableSection) => {
    if (submissionState === "SUBMITTING" || submissionTimer.current !== null) return;
    const index = steps.findIndex((item) => item.section === section);
    if (index >= 0) {
      setReviewing(false);
      moveStep(index);
    }
  };

  const submit = (result: "SUCCESS" | "ERROR") => {
    if (submissionState === "SUBMITTING" || submissionTimer.current !== null) return;
    if (!consent) {
      setSubmissionError("개인정보 수집·이용 동의가 필요합니다.");
      return;
    }
    const invalidIndex = steps.findIndex((_, index) => validationError(index));
    if (invalidIndex >= 0) {
      setReviewing(false);
      setStepIndex(invalidIndex);
      setStepError(validationError(invalidIndex) ?? "입력 내용을 확인해 주세요.");
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
      setReceipt({ number: `MOCK-${date}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`, submittedAt });
    }, 650);
  };

  const state: PublicApplicationState = {
    stepIndex, values, photos, videoUrl, noCareer, careers, stepError, mediaError,
    reviewing, consent, submissionState, submissionError, receipt,
  };
  const actions: PublicApplicationActions = {
    updateField: (id, value) => { setValues((current) => ({ ...current, [id]: value })); setStepError(""); },
    updatePhotos: (next) => { setPhotos(next); setMediaError(""); setStepError(""); },
    markPhotoReady: (id) => setPhotos((current) => current.map((photo) => photo.id === id ? { ...photo, status: "READY" } : photo)),
    updateVideo: (url) => { setVideoUrl(url); setMediaError(""); setStepError(""); },
    reportMediaError: (error) => { setMediaError(error); setStepError(""); },
    updateNoCareer: (value) => { setNoCareer(value); setStepError(""); },
    updateCareers: (next) => { setCareers(next); setStepError(""); },
    moveStep,
    nextStep,
    editSection,
    updateConsent: (value) => { setConsent(value); setSubmissionError(""); },
    submit,
  };

  return <PublicApplicationContext value={{ state, actions, meta: { fields, steps, performanceTitle, postingTitle, roleName, onBack } }}>{children}</PublicApplicationContext>;
}
