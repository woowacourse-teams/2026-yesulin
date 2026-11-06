import { useEffect, useState, useSyncExternalStore } from "react";
import { ReviewAutosave, type DraftField, type ReviewDraft } from "./review-autosave";

export function useReviewAutosave(initial: ReviewDraft, save: (field: DraftField, value: string) => Promise<string | null>, onDirty: (dirty: boolean) => void) {
  const [store] = useState(() => new ReviewAutosave({ initial, save, onDirty }));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  useEffect(() => { store.activate(); return store.dispose; }, [store]);
  const { title, memo } = initial;
  useEffect(() => store.sync({ title, memo }), [store, title, memo]);
  return { ...snapshot, change: store.change, compose: store.compose, flush: store.flush };
}
