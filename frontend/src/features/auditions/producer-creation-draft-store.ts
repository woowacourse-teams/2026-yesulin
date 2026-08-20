const DATABASE_NAME = "yesulin-producer-creation";
const DATABASE_VERSION = 1;
const STORE_NAME = "drafts";

export const PRODUCER_CREATION_DRAFT_DELAY_MS = 600;

export type ProducerCreationDraftRecord<T> = {
  readonly version: 1;
  readonly key: string;
  readonly updatedAt: number;
  readonly value: T;
};

export const performanceCreationDraftKey = () => "performance:new";
export const postingCreationDraftKey = (performanceId: string) => `posting:new:${performanceId}`;

export async function readProducerCreationDraft<T>(key: string) {
  const database = await openDatabase();
  return requestResult<ProducerCreationDraftRecord<T> | undefined>(database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key));
}

export async function saveProducerCreationDraft<T>(key: string, value: T) {
  const record: ProducerCreationDraftRecord<T> = { version: 1, key, value, updatedAt: Date.now() };
  const database = await openDatabase();
  await transactionDone(database.transaction(STORE_NAME, "readwrite"), (store) => store.put(record));
  return record.updatedAt;
}

export async function deleteProducerCreationDraft(key: string) {
  const database = await openDatabase();
  await transactionDone(database.transaction(STORE_NAME, "readwrite"), (store) => store.delete(key));
}

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("이 브라우저에서 임시저장소를 사용할 수 없습니다."));
      return;
    }
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("임시저장소를 열지 못했습니다."));
    request.onblocked = () => reject(new Error("다른 탭에서 임시저장소를 사용하고 있습니다."));
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("임시저장 내용을 읽지 못했습니다."));
  });
}

function transactionDone(transaction: IDBTransaction, change: (store: IDBObjectStore) => void) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("작성 내용을 임시저장하지 못했습니다."));
    transaction.onabort = () => reject(transaction.error ?? new Error("임시저장이 중단되었습니다."));
    change(transaction.objectStore(STORE_NAME));
  });
}
