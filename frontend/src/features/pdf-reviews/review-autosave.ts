export type DraftField = "title" | "memo";
export type ReviewDraft = Readonly<Record<DraftField, string>>;
export type AutosaveSnapshot = ReviewDraft & { readonly dirty: boolean; readonly status: "saved" | "pending" | "saving" | "error"; readonly error: string };
type Options = { initial: ReviewDraft; save: (field: DraftField, value: string) => Promise<string | null>; onDirty: (dirty: boolean) => void; delay?: number };

export class ReviewAutosave {
  private draft: ReviewDraft;
  private saved: ReviewDraft;
  private snapshot: AutosaveSnapshot;
  private listeners = new Set<() => void>();
  private composing = new Set<DraftField>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<boolean> | null = null;
  private disposed = false;
  private error = "";
  private inFlight: DraftField | null = null;
  private uncertain = new Set<DraftField>();

  constructor(private readonly options: Options) {
    this.draft = { ...options.initial };
    this.saved = { ...options.initial };
    this.snapshot = { ...this.draft, dirty: false, status: "saved", error: "" };
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  activate = () => { this.disposed = false; };
  dispose = () => { this.disposed = true; clearTimeout(this.timer); this.options.onDirty(false); };
  private dirty() { return this.inFlight !== null || this.uncertain.size > 0 || this.draft.title !== this.saved.title || this.draft.memo !== this.saved.memo; }

  private publish(status: AutosaveSnapshot["status"]) {
    if (this.disposed) return;
    this.snapshot = { ...this.draft, dirty: this.dirty(), status, error: this.error };
    this.options.onDirty(this.snapshot.dirty);
    this.listeners.forEach(listener => listener());
  }

  change = (field: DraftField, value: string) => {
    this.draft = { ...this.draft, [field]: value };
    this.error = "";
    if (this.dirty()) this.publish("pending");
    if (!this.dirty()) this.publish("saved");
    this.schedule();
  };

  compose = (field: DraftField, active: boolean, value?: string) => {
    clearTimeout(this.timer);
    if (active) { this.composing.add(field); return; }
    this.composing.delete(field);
    if (value !== undefined) this.change(field, value);
    this.schedule();
  };

  sync = (values: ReviewDraft) => {
    if (this.running || this.disposed) return;
    let changed = false;
    for (const field of ["title", "memo"] as const) {
      if (this.uncertain.has(field) || this.draft[field] !== this.saved[field] || values[field] === this.saved[field]) continue;
      this.draft = { ...this.draft, [field]: values[field] };
      this.saved = { ...this.saved, [field]: values[field] }; changed = true;
    }
    if (changed) this.publish(this.snapshot.status);
  };

  private schedule() {
    clearTimeout(this.timer);
    if (this.composing.size || this.disposed || !this.dirty()) return;
    this.timer = setTimeout(() => { void this.flush(); }, this.options.delay ?? 800);
  }

  flush = (): Promise<boolean> => {
    clearTimeout(this.timer);
    if (this.disposed || this.composing.size) return Promise.resolve(false);
    if (this.running) return this.running;
    if (!this.dirty()) { this.publish("saved"); return Promise.resolve(true); }
    this.error = "";
    this.running = Promise.resolve().then(() => this.drain()).finally(() => { this.running = null; });
    return this.running;
  };

  private nextField(): DraftField | null {
    if (this.uncertain.has("title") || this.draft.title !== this.saved.title) return "title";
    if (this.uncertain.has("memo") || this.draft.memo !== this.saved.memo) return "memo";
    return null;
  }

  private invalid(field: DraftField, value: string) {
    if (field === "title" && (value.trim().length > 255)) return "배우 이름은 255자 이하로 입력해 주세요.";
    if (field === "memo" && value.length > 500) return "메모는 500자 이하로 입력해 주세요.";
    return "";
  }

  private fail(message: string) { this.error = message; this.publish("error"); return false; }

  private async saveField(field: DraftField, draft: string) {
    const invalid = this.invalid(field, draft);
    if (invalid) return this.fail(invalid);
    this.inFlight = field;
    this.publish("saving");
    let value = draft;
    if (field === "title") value = draft.trim();
    let confirmed: string | null = null;
    try { confirmed = await this.options.save(field, value); } catch { confirmed = null; }
    this.inFlight = null;
    if (confirmed === null) { this.uncertain.add(field); return this.fail("저장하지 못했어요. 입력은 유지됩니다."); }
    this.uncertain.delete(field);
    this.saved = { ...this.saved, [field]: confirmed };
    if (this.draft[field] === draft) this.draft = { ...this.draft, [field]: confirmed };
    return true;
  }

  private async drain(): Promise<boolean> {
    while (!this.disposed && !this.composing.size) {
      const field = this.nextField();
      if (!field) { this.publish("saved"); return true; }
      if (!await this.saveField(field, this.draft[field])) return false;
    }
    return false;
  }
}
