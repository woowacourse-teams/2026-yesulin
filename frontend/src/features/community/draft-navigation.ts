import { DraftHistory } from "./draft-history";

const runtimeKey = Symbol.for("yesulin.community.draft-navigation");
const message = "작성 중인 내용이 사라져요. 이동할까요?";

export function communityDraftNavigation(): DraftNavigation {
  const existing = Reflect.get(window, runtimeKey) as DraftNavigation | undefined;
  if (existing) return existing;
  const navigation = new DraftNavigation();
  navigation.connect();
  Reflect.set(window, runtimeKey, navigation);
  return navigation;
}

class DraftNavigation {
  private readonly drafts = new Set<symbol>();

  connect() {
    const history = new DraftHistory(window.history, () => this.confirmLeave());
    history.connect();
    window.addEventListener("hashchange", () => history.recordHashEntry());
    window.addEventListener("popstate", event => history.traverse(event), true);
    document.addEventListener("click", event => this.navigate(event), true);
  }

  register() {
    const token = Symbol();
    this.drafts.add(token);
    window.addEventListener("beforeunload", this.unload);
    return () => {
      this.drafts.delete(token);
      if (this.drafts.size === 0) window.removeEventListener("beforeunload", this.unload);
    };
  }

  private confirmLeave() {
    if (this.drafts.size === 0) return true;
    return window.confirm(message);
  }

  private navigate(event: MouseEvent) {
    if (!leavesCurrentPage(event) || this.confirmLeave()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  private readonly unload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = "";
  };
}

function leavesCurrentPage(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (!(event.target instanceof Element)) return false;
  const link = event.target.closest("a[href]");
  if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download")) return false;
  if (link.target && link.target !== "_self") return false;
  const destination = new URL(link.href, window.location.href);
  if (!["http:", "https:"].includes(destination.protocol)) return false;
  return destination.origin !== location.origin || destination.pathname !== location.pathname || destination.search !== location.search;
}
