export const AUDITION_TREE_CHANGED = "yesulin:audition-tree-changed";

export function notifyAuditionTreeChanged() {
  window.dispatchEvent(new Event(AUDITION_TREE_CHANGED));
}
