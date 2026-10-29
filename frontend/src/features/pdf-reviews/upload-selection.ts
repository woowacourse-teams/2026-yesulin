export const MAX_SELECTION = 300;
const LIMIT_MESSAGE = "한 번에 PDF 300개까지 선택해 주세요.";
const isPdf = (file: File) => /\.pdf$/i.test(file.name);

/** 폴더의 사진·문서 등은 제외하고 파일 핸들만 수집한다. PDF 본문은 읽지 않는다. */
export function folderPdfs(files: FileList | readonly File[]): File[] {
  const pdfs = Array.from(files).filter(isPdf);
  if (pdfs.length > MAX_SELECTION) throw new Error(LIMIT_MESSAGE);
  if (!pdfs.length) throw new Error("폴더 안에 PDF 파일이 없습니다.");
  return pdfs;
}

/** 드롭 직후 핸들을 확보해야 비동기 순회 중에도 브라우저의 보호 모드에 영향받지 않는다. */
export async function collectDroppedPdfs(transfer: DataTransfer): Promise<File[]> {
  const entries = Array.from(transfer.items ?? []).filter(item => item.kind === "file")
    .map(item => item.webkitGetAsEntry?.());
  const files = Array.from(transfer.files);
  if (!entries.some(entry => entry?.isDirectory)) return files;
  const result: File[] = [];
  let visited = 0;
  async function visit(entry: FileSystemEntry, depth: number): Promise<void> {
    if (++visited > 10_000 || depth > 20) throw new Error("폴더가 너무 큽니다. PDF 파일만 모은 폴더를 선택해 주세요.");
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
      if (isPdf(file)) result.push(file);
      if (result.length > MAX_SELECTION) throw new Error(LIMIT_MESSAGE);
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
    if (entry) await visit(entry, 0);
    else throw new Error("일부 파일을 읽지 못했습니다. 파일 선택 또는 폴더 선택으로 다시 올려 주세요.");
  }
  if (!result.length) throw new Error("폴더 안에 PDF 파일이 없습니다.");
  return result;
}
