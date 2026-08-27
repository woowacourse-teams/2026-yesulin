"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { hasApplicationDraft } from "@/features/applications/application-form-state";
import type { ApplicationPhoto, CareerDraft } from "@/features/applications/application-form-state";
import { deletePublicApplicationDraft, readPublicApplicationDraft, restoreDraftPhotos, savePublicApplicationDraft } from "@/features/applications/public-application-draft-store";
import type { ProfilePrefillResponse } from "@/features/applicants/types";
import { applicationDraftFromPrefill } from "@/features/applications/public-application-draft";

export type DraftSaveStatus = "RESTORING" | "IDLE" | "SAVING" | "SAVED" | "ERROR";

export function usePublicApplicationDraft({ postingId, fields, prefill, initialRoleIds, initialStepIndex, initialReviewing, stepCount, submitted }: {
  readonly postingId: string;
  readonly fields: readonly ApplicationFieldInput[];
  readonly prefill?: ProfilePrefillResponse;
  readonly initialRoleIds: readonly string[];
  readonly initialStepIndex: number;
  readonly initialReviewing: boolean;
  readonly stepCount: number;
  readonly submitted: boolean;
}) {
  const [initial] = useState(() => applicationDraftFromPrefill(prefill, fields));
  const [fallbackRoleIds] = useState(initialRoleIds);
  const [values, setValuesBase] = useState<Readonly<Record<string, string>>>(initial.values);
  const [photos, setPhotosBase] = useState<readonly ApplicationPhoto[]>(initial.photos);
  const [videoUrl, setVideoUrlBase] = useState(initial.videoUrl);
  const [noCareer, setNoCareerBase] = useState(false);
  const [careers, setCareersBase] = useState<readonly CareerDraft[]>(initial.careers);
  const [consent, setConsentBase] = useState(false);
  const [thirdPartyConsent, setThirdPartyConsentBase] = useState(false);
  const [saveToProfile, setSaveToProfileBase] = useState(false);
  const [stepIndex, setStepIndexBase] = useState(0);
  const [completedStepIndexes, setCompletedStepIndexesBase] = useState<readonly number[]>([]);
  const [reviewing, setReviewingBase] = useState(false);
  const [roleIds, setRoleIds] = useState(initialRoleIds);
  const [storageReady, setStorageReady] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [changeVersion, setChangeVersion] = useState(0);
  const [saveRequest, setSaveRequest] = useState(0);
  const [saveStatus, setSaveStatus] = useState<DraftSaveStatus>("RESTORING");
  const [saveError, setSaveError] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const photosRef = useRef(photos);

  useEffect(() => { photosRef.current = photos; }, [photos]);

  useEffect(() => {
    let active = true;
    readPublicApplicationDraft(postingId).then((draft) => {
      if (!active) return;
      if (draft?.version === 1) {
        setValuesBase(draft.values);
        setPhotosBase(restoreDraftPhotos(draft.photos));
        setVideoUrlBase(draft.videoUrl);
        setNoCareerBase(draft.noCareer);
        setCareersBase(draft.careers);
        // 필수 동의와 제출별 프로필 저장 선택은 복원하지 않고 초기화한다.
        setConsentBase(false);
        setThirdPartyConsentBase(false);
        setSaveToProfileBase(false);
        const maxReachedStepIndex = Math.min(stepCount - 1, draft.completedStepIndexes.length ? Math.max(...draft.completedStepIndexes) + 1 : 0);
        const routeStepIndex = Math.max(0, Math.min(initialStepIndex, maxReachedStepIndex));
        setStepIndexBase(routeStepIndex);
        setCompletedStepIndexesBase(draft.completedStepIndexes);
        setReviewingBase(initialReviewing && draft.completedStepIndexes.length >= stepCount);
        setRoleIds(draft.roleIds.length ? draft.roleIds : fallbackRoleIds);
        setLastSavedAt(draft.updatedAt);
        setRestored(true);
        setSaveStatus("SAVED");
      } else {
        const prefilled = hasApplicationDraft({ ...initial, noCareer: false, consent: false, submitted: false });
        setSaveStatus(prefilled ? "SAVING" : "IDLE");
      }
      setStorageReady(true);
    }).catch((cause) => {
      if (!active) return;
      console.error("[지원서 임시저장 불러오기 실패]", cause);
      setReadFailed(true);
      setSaveError(storageErrorMessage(cause));
      setSaveStatus("ERROR");
      setStorageReady(true);
    });
    return () => { active = false; };
  }, [fallbackRoleIds, initial, initialReviewing, initialStepIndex, postingId, stepCount]);

  useEffect(() => {
    if (!storageReady || submitted) return;
    if (restored && changeVersion === 0 && saveRequest === 0) return;
    if (readFailed && changeVersion === 0 && saveRequest === 0) return;
    let active = true;
    const hasDraft = hasApplicationDraft({ values, photos, videoUrl, noCareer, careers, consent: consent || thirdPartyConsent, submitted: false });
    const timeout = window.setTimeout(() => {
      const operation = hasDraft ? savePublicApplicationDraft({
        postingId, values, photos, videoUrl, noCareer, careers, consent, thirdPartyConsent, saveToProfile,
        stepIndex, completedStepIndexes, reviewing, roleIds,
      }) : deletePublicApplicationDraft(postingId).then(() => null);
      operation.then((savedAt) => {
        if (!active) return;
        setLastSavedAt(savedAt);
        setSaveError("");
        setSaveStatus(savedAt ? "SAVED" : "IDLE");
      }).catch((cause) => {
        if (!active) return;
        console.error("[지원서 임시저장 실패]", cause);
        setSaveError(storageErrorMessage(cause));
        setSaveStatus("ERROR");
      });
    }, 600);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [storageReady, readFailed, restored, changeVersion, saveRequest, postingId, values, photos, videoUrl, noCareer, careers, consent, thirdPartyConsent, saveToProfile, stepIndex, completedStepIndexes, reviewing, roleIds, submitted]);

  useEffect(() => () => {
    photosRef.current.forEach((photo) => { if (photo.blob && photo.url) URL.revokeObjectURL(photo.url); });
  }, []);

  const beginChange = () => {
    setChangeVersion((current) => current + 1);
    setRestored(false);
    setSaveError("");
    setSaveStatus("SAVING");
  };
  const setter = <T,>(base: Dispatch<SetStateAction<T>>) => (next: SetStateAction<T>) => {
    beginChange();
    base(next);
  };
  const retrySave = () => {
    beginChange();
    setSaveRequest((current) => current + 1);
  };

  return {
    values, setValues: setter(setValuesBase), photos, setPhotos: setter(setPhotosBase),
    videoUrl, setVideoUrl: setter(setVideoUrlBase), noCareer, setNoCareer: setter(setNoCareerBase),
    careers, setCareers: setter(setCareersBase), consent, setConsent: setter(setConsentBase),
    thirdPartyConsent, setThirdPartyConsent: setter(setThirdPartyConsentBase),
    saveToProfile, setSaveToProfile: setter(setSaveToProfileBase), stepIndex, setStepIndex: setter(setStepIndexBase),
    completedStepIndexes, setCompletedStepIndexes: setter(setCompletedStepIndexesBase), reviewing, setReviewing: setter(setReviewingBase),
    roleIds, saveStatus, saveError, lastSavedAt, restored, storageReady, retrySave,
    hasUnsavedChanges: saveStatus === "SAVING" || saveStatus === "ERROR",
  };
}

function storageErrorMessage(cause: unknown) {
  return cause instanceof Error && cause.message ? cause.message : "작성 내용을 이 기기에 저장하지 못했습니다.";
}
