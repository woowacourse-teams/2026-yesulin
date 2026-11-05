export class PdfRenderQueue {
  private tail: Promise<unknown> = Promise.resolve();
  enqueue<T>(task: () => Promise<T>) {
    const next = this.tail.then(task);
    this.tail = next.catch(() => {});
    return next;
  }
}
