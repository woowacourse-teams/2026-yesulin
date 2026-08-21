import type { ApplicationPhoto, CareerDraft } from "./application-form-state";

const DATABASE_NAME = "yesulin-public-applications";
const DATABASE_VERSION = 1;
const STORE_NAME = "drafts";

export type PublicApplicationDraftPhoto = {
  readonly id: string;
  readonly name: string;
  readonly slotIndex?: number;
  readonly blob?: Blob;
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
    photos: input.photos.filter((photo) => photo.status !== "ERROR").map((photo) => ({
      id: photo.id,
      name: photo.name,
      ...(photo.slotIndex === undefined ? {} : { slotIndex: photo.slotIndex }),
      ...(photo.blob ? { blob: photo.blob } : {}),
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

export function restoreDraftPhotos(photos: readonly PublicApplicationDraftPhoto[]): ApplicationPhoto[] {
  return photos.flatMap((photo, index) => {
    const url = photo.blob ? URL.createObjectURL(photo.blob) : photo.sourceUrl;
    return url ? [{ ...photo, slotIndex: photo.slotIndex ?? index, url, status: "READY" as const }] : [];
  });
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
