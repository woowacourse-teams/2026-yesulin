export class PdfRenderQueue {
  private tail: Promise<unknown> = Promise.resolve();
  enqueue(task: () => Promise<void>) {
    const next = this.tail.then(task);
    this.tail = next.catch(() => {});
    return next;
  }
}
