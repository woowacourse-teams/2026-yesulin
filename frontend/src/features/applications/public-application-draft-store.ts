import type { ApplicationPhoto, CareerDraft } from "./application-form-state";

const DATABASE_NAME = "yesulin-public-applications";
const DATABASE_VERSION = 1;
const STORE_NAME = "drafts";

export type PublicApplicationDraftPhoto = {
  readonly id: string;
  readonly name: string;
  readonly slotIndex?: number;
  readonly blob?: Blob;
  readonly libraryFileId?: number;
  readonly sourceUrl?: string;
};

export type PublicApplicationDraftRecord = {
  readonly version: 1;
  readonly postingId: string;
  readonly updatedAt: number;
  readonly values: Readonly<Record<string, string>>;
  readonly photos: readonly PublicApplicationDraftPhoto[];
  readonly videoUrl: string;
  readonly noCareer: boolean;
  readonly careers: readonly CareerDraft[];
  readonly consent: boolean;
  readonly thirdPartyConsent?: boolean;
  readonly saveToProfile: boolean;
  readonly stepIndex: number;
  readonly completedStepIndexes: readonly number[];
  readonly reviewing: boolean;
  readonly roleIds: readonly string[];
};

export type PublicApplicationDraftInput = Omit<PublicApplicationDraftRecord, "version" | "updatedAt" | "photos"> & {
  readonly photos: readonly ApplicationPhoto[];
};

export async function readPublicApplicationDraft(postingId: string) {
  const database = await openDatabase();
  return requestResult<PublicApplicationDraftRecord | undefined>(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(postingId));
}

export async function listPublicApplicationDrafts() {
  const database = await openDatabase();
  return requestResult<PublicApplicationDraftRecord[]>(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll());
}

export async function savePublicApplicationDraft(input: PublicApplicationDraftInput) {
  if (process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("draftStorage") === "fail") {
    throw new Error("개발 검증을 위해 기기 저장 실패를 재현했습니다.");
  }
  const record: PublicApplicationDraftRecord = {
    ...input,
    version: 1,
    updatedAt: Date.now(),
    // 사진 선택기의 File은 복사가 끝난 READY 상태에서만 저장해 iOS 임시 파일 참조가 IndexedDB에 남지 않게 한다.
    photos: input.photos.filter((photo) => photo.status === "READY").map((photo) => ({
      id: photo.id,
      name: photo.name,
      ...(photo.slotIndex === undefined ? {} : { slotIndex: photo.slotIndex }),
      ...(photo.blob ? { blob: photo.blob } : {}),
      ...(photo.libraryFileId === undefined ? {} : { libraryFileId: photo.libraryFileId }),
      ...(!photo.blob && photo.url ? { sourceUrl: photo.url } : {}),
    })),
  };
  const database = await openDatabase();
  await transactionDone(database.transaction(STORE_NAME, "readwrite"), (store) => store.put(record));
  return record.updatedAt;
}

export async function deletePublicApplicationDraft(postingId: string) {
  const database = await openDatabase();
  await transactionDone(database.transaction(STORE_NAME, "readwrite"), (store) => store.delete(postingId));
}

export async function restoreDraftPhotos(photos: readonly PublicApplicationDraftPhoto[]): Promise<ApplicationPhoto[]> {
  const restored: ApplicationPhoto[] = [];
  for (const [index, photo] of photos.entries()) {
    try {
      // 기존 Draft에 File이 저장돼 있으면 읽을 수 있을 때 일반 Blob으로 자동 이관한다.
      const blob = await independentBlobFromStoredFile(photo.blob);
      const url = blob ? URL.createObjectURL(blob) : photo.sourceUrl;
      if (url) restored.push({ ...photo, blob, slotIndex: photo.slotIndex ?? index, url, status: "READY" });
    } catch (cause) {
      console.error("[임시저장 사진 복원 실패]", cause);
      restored.push({
        ...photo,
        blob: undefined,
        slotIndex: photo.slotIndex ?? index,
        url: "",
        status: "ERROR",
        error: "저장된 사진을 읽지 못했어요. 해당 사진을 다시 선택해 주세요.",
      });
    }
  }
  return restored;
}

async function independentBlobFromStoredFile(blob?: Blob) {
  if (!blob || typeof File === "undefined" || !(blob instanceof File)) return blob;
  const copy = new Blob([await blob.arrayBuffer()], { type: blob.type });
  if (copy.size !== blob.size) throw new Error("저장된 사진 복사 크기가 원본과 일치하지 않습니다.");
  return copy;
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("이 브라우저에서 기기 저장소를 사용할 수 없습니다."));
      return;
    }
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "postingId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("기기 저장소를 열지 못했습니다."));
    request.onblocked = () => reject(new Error("다른 탭에서 기기 저장소를 사용하고 있습니다."));
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("기기 저장소를 읽지 못했습니다."));
  });
}

function transactionDone(transaction: IDBTransaction, change: (store: IDBObjectStore) => void) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("기기에 저장하지 못했습니다."));
    transaction.onabort = () => reject(transaction.error ?? new Error("기기 저장이 중단되었습니다."));
    change(transaction.objectStore(STORE_NAME));
  });
}
