import { fetchCurrentSession, type SessionResponse } from "./session-api";

export class SessionSynchronizer {
  private revision = 0;

  constructor(
    private readonly apply: (session: SessionResponse | null) => void,
    private readonly ready: () => void,
  ) {}

  invalidate() {
    this.revision += 1;
  }

  async refresh() {
    const revision = ++this.revision;
    try {
      this.applyCurrent(revision, await fetchCurrentSession());
    } finally {
      this.finishCurrent(revision);
    }
  }

  private applyCurrent(revision: number, session: SessionResponse | null) {
    if (revision !== this.revision) return;
    this.apply(session);
  }

  private finishCurrent(revision: number) {
    if (revision !== this.revision) return;
    this.ready();
  }
}
