"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { hasApplicationDraft } from "@/features/applications/application-form-state";
import type { ApplicationPhoto, CareerDraft } from "@/features/applications/application-form-state";
import { deletePublicApplicationDraft, readPublicApplicationDraft, restoreDraftPhotos, savePublicApplicationDraft } from "@/features/applications/public-application-draft-store";
import type { ProfilePrefillResponse } from "@/features/applicants/types";
import { applicationDraftFromPrefill } from "./public-application-draft";

export type DraftSaveStatus = "RESTORING" | "IDLE" | "SAVING" | "SAVED" | "ERROR";

export function usePublicApplicationDraft({ postingId, prefill, initialRoleIds, submitted }: {
  readonly postingId: string;
  readonly prefill?: ProfilePrefillResponse;
  readonly initialRoleIds: readonly string[];
  readonly submitted: boolean;
}) {
  const [initial] = useState(() => applicationDraftFromPrefill(prefill));
  const [fallbackRoleIds] = useState(initialRoleIds);
  const [values, setValuesBase] = useState<Readonly<Record<string, string>>>(initial.values);
  const [photos, setPhotosBase] = useState<readonly ApplicationPhoto[]>(initial.photos);
  const [videoUrl, setVideoUrlBase] = useState(initial.videoUrl);
  const [noCareer, setNoCareerBase] = useState(false);
  const [careers, setCareersBase] = useState<readonly CareerDraft[]>(initial.careers);
  const [consent, setConsentBase] = useState(false);
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
        setConsentBase(draft.consent);
        setSaveToProfileBase(draft.saveToProfile);
        setStepIndexBase(draft.stepIndex);
        setCompletedStepIndexesBase(draft.completedStepIndexes);
        setReviewingBase(draft.reviewing);
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
      setReadFailed(true);
      setSaveError(storageErrorMessage(cause));
      setSaveStatus("ERROR");
      setStorageReady(true);
    });
    return () => { active = false; };
  }, [fallbackRoleIds, initial, postingId]);

  useEffect(() => {
    if (!storageReady || submitted) return;
    if (restored && changeVersion === 0 && saveRequest === 0) return;
    if (readFailed && changeVersion === 0 && saveRequest === 0) return;
    let active = true;
    const hasDraft = hasApplicationDraft({ values, photos, videoUrl, noCareer, careers, consent, submitted: false });
    const timeout = window.setTimeout(() => {
      const operation = hasDraft ? savePublicApplicationDraft({
        postingId, values, photos, videoUrl, noCareer, careers, consent, saveToProfile,
        stepIndex, completedStepIndexes, reviewing, roleIds,
      }) : deletePublicApplicationDraft(postingId).then(() => null);
      operation.then((savedAt) => {
        if (!active) return;
        setLastSavedAt(savedAt);
        setSaveError("");
        setSaveStatus(savedAt ? "SAVED" : "IDLE");
      }).catch((cause) => {
        if (!active) return;
        setSaveError(storageErrorMessage(cause));
        setSaveStatus("ERROR");
      });
    }, 600);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [storageReady, readFailed, restored, changeVersion, saveRequest, postingId, values, photos, videoUrl, noCareer, careers, consent, saveToProfile, stepIndex, completedStepIndexes, reviewing, roleIds, submitted]);

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
    saveToProfile, setSaveToProfile: setter(setSaveToProfileBase), stepIndex, setStepIndex: setter(setStepIndexBase),
    completedStepIndexes, setCompletedStepIndexes: setter(setCompletedStepIndexesBase), reviewing, setReviewing: setter(setReviewingBase),
    roleIds, saveStatus, saveError, lastSavedAt, restored, retrySave,
    hasUnsavedChanges: saveStatus === "SAVING" || saveStatus === "ERROR",
  };
}

function storageErrorMessage(cause: unknown) {
  return cause instanceof Error && cause.message ? cause.message : "작성 내용을 이 기기에 저장하지 못했습니다.";
}
