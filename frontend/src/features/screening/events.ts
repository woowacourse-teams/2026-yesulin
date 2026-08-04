export const SCREENING_TREE_CHANGED = "yesulin:screening-tree-changed";

export function notifyScreeningTreeChanged() {
  window.dispatchEvent(new Event(SCREENING_TREE_CHANGED));
}
