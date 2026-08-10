export const AUDITION_TREE_CHANGED = "yesulin:audition-tree-changed";
export const PRODUCER_PROFILE_CHANGED = "yesulin:producer-profile-changed";

export function notifyAuditionTreeChanged() {
  window.dispatchEvent(new Event(AUDITION_TREE_CHANGED));
}

export function notifyProducerProfileChanged() {
  window.dispatchEvent(new Event(PRODUCER_PROFILE_CHANGED));
}
