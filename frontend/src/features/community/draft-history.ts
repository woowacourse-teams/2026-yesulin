type BrowserHistory = Pick<History, "state" | "pushState" | "replaceState" | "go">;
type HistoryPosition = { readonly timeline: string; readonly index: number };
type Traversal = Pick<PopStateEvent, "state" | "stopImmediatePropagation">;
const positionKey = "__yesulinDraftPosition";

export class DraftHistory {
  private position: HistoryPosition;
  private restoring = false;
  private currentState: unknown;

  constructor(private readonly history: BrowserHistory, private readonly confirmLeave: () => boolean) {
    this.currentState = history.state;
    this.position = readPosition(history.state) ?? { timeline: crypto.randomUUID(), index: 0 };
  }

  connect() {
    const push = this.history.pushState.bind(this.history);
    const replace = this.history.replaceState.bind(this.history);
    replace(this.stamp(this.history.state), "");
    this.patchPush(push);
    this.history.replaceState = (state, unused, url) => {
      replace(this.stamp(state), unused, url);
      this.currentState = this.history.state;
    };
  }

  private patchPush(push: History["pushState"]) {
    this.history.pushState = (state, unused, url) => {
      const next = { ...this.position, index: this.position.index + 1 };
      push({ ...state, [positionKey]: next }, unused, url);
      this.position = next;
      this.currentState = this.history.state;
    };
  }

  recordHashEntry() {
    if (readPosition(this.history.state) || this.restoring) return;
    this.position = { ...this.position, index: this.position.index + 1 };
    this.history.replaceState(this.stamp(this.currentState), "");
  }

  traverse(event: Traversal) {
    const target = readPosition(event.state);
    if (!target || target.timeline !== this.position.timeline) return;
    if (this.restoring) return this.restore(event, target);
    if (target.index === this.position.index) return;
    if (this.confirmLeave()) return this.arrive(target, event.state);
    event.stopImmediatePropagation();
    this.restoring = true;
    this.history.go(this.position.index - target.index);
  }

  private arrive(position: HistoryPosition, state: unknown) {
    this.position = position;
    this.currentState = state;
  }

  private restore(event: Traversal, target: HistoryPosition) {
    event.stopImmediatePropagation();
    if (target.index === this.position.index) { this.restoring = false; return; }
    this.history.go(this.position.index - target.index);
  }

  private stamp(state: unknown) {
    if (state && typeof state === "object") return { ...state, [positionKey]: this.position };
    return { [positionKey]: this.position };
  }
}

function readPosition(state: unknown): HistoryPosition | undefined {
  if (!state || typeof state !== "object") return;
  const position = Reflect.get(state, positionKey);
  if (!position || typeof position.timeline !== "string") return;
  if (!Number.isSafeInteger(position.index)) return;
  return position;
}
