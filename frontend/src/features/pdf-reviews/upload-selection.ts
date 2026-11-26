export const MAX_SELECTION = 300;
export const SELECTION_LIMIT_MESSAGE = `한 번에 파일 ${MAX_SELECTION}개까지 선택해 주세요.`;
export const LEGACY_EXTENSIONS = ["pdf"] as const;

export function acceptsDocument(filename: string, extensions: readonly string[]) {
  const normalized = filename.trimEnd().toLowerCase();
  return extensions.some(extension => normalized.endsWith("." + extension));
}

export function folderDocuments(files: FileList | readonly File[], extensions: readonly string[]): File[] {
  const documents = Array.from(files).filter(file => acceptsDocument(file.name, extensions));
  if (documents.length > MAX_SELECTION) throw new Error(SELECTION_LIMIT_MESSAGE);
  if (!documents.length) throw new Error("폴더 안에 지원하는 형식의 파일이 없습니다.");
  return documents;
}

/** 드롭 직후 핸들을 확보해야 비동기 순회 중에도 브라우저의 보호 모드에 영향받지 않는다. */
export async function collectDroppedDocuments(transfer: DataTransfer, extensions: readonly string[]): Promise<File[]> {
  const entries = Array.from(transfer.items ?? []).filter(item => item.kind === "file")
    .map(item => item.webkitGetAsEntry?.());
  const files = Array.from(transfer.files);
  if (!entries.some(entry => entry?.isDirectory)) return files;
  const result: File[] = [];
  let visited = 0;
  async function visit(entry: FileSystemEntry, depth: number): Promise<void> {
    if (++visited > 10_000 || depth > 20) throw new Error("폴더가 너무 큽니다. 지원서 파일만 모은 폴더를 선택해 주세요.");
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      if (acceptsDocument(file.name, extensions)) result.push(file);
      if (result.length > MAX_SELECTION) throw new Error(SELECTION_LIMIT_MESSAGE);
      return;
    }
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries는 여러 묶음으로 반환할 수 있어 빈 배열이 나올 때까지 읽는다.
    while (true) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      for (const child of batch) await visit(child, depth + 1);
    }
  }
  for (const entry of entries) {
    if (!entry) throw new Error("일부 파일을 읽지 못했습니다. 파일 선택 또는 폴더 선택으로 다시 올려 주세요.");
    await visit(entry, 0);
  }
  if (!result.length) throw new Error("폴더 안에 지원하는 형식의 파일이 없습니다.");
  return result;
}
