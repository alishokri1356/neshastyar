export interface StoredDraftFile {
  id: string;
  name: string;
  duration: number;
  type: 'recording' | 'upload';
  blob: Blob;
}

export interface StoredCompletedUpload {
  fileName: string;
  filePath: string;
  fileSize: number;
  duration: number;
  format: string;
  uploadOrder: number;
  linked?: boolean;
}

export interface StoredUploadDraft {
  commentText: string;
  files: StoredDraftFile[];
  completed: Record<string, StoredCompletedUpload>;
  selectedTagIds: string[];
  meetingId: string | null;
  uploading: boolean;
}

const DB_NAME = 'neshastyar-uploads';
const STORE = 'draft';
const KEY = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readDraft(): Promise<StoredUploadDraft | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readonly');
    const value = await requestToPromise(tx.objectStore(STORE).get(KEY));
    return (value as StoredUploadDraft | undefined) ?? null;
  } finally {
    db.close();
  }
}

async function writeDraft(draft: StoredUploadDraft): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(draft, KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

function emptyDraft(): StoredUploadDraft {
  return {
    commentText: '',
    files: [],
    completed: {},
    selectedTagIds: [],
    meetingId: null,
    uploading: false,
  };
}

export async function loadUploadDraft(): Promise<StoredUploadDraft | null> {
  return readDraft();
}

export async function saveUploadDraftFiles(
  files: StoredDraftFile[],
  commentText: string,
  selectedTagIds: string[] = [],
): Promise<void> {
  const current = (await readDraft()) ?? emptyDraft();
  const ids = new Set(files.map((file) => file.id));
  const completed: Record<string, StoredCompletedUpload> = {};
  for (const [id, value] of Object.entries(current.completed || {})) {
    if (ids.has(id)) completed[id] = value;
  }
  await writeDraft({
    ...current,
    commentText,
    files,
    selectedTagIds,
    completed,
  });
}

export async function saveCompletedUpload(
  fileId: string,
  completed: StoredCompletedUpload,
): Promise<void> {
  const current = (await readDraft()) ?? emptyDraft();
  current.completed = { ...current.completed, [fileId]: completed };
  await writeDraft(current);
}

export async function markUploadLinked(fileId: string): Promise<void> {
  const current = await readDraft();
  if (!current?.completed?.[fileId]) return;
  current.completed[fileId] = { ...current.completed[fileId], linked: true };
  await writeDraft(current);
}

export async function saveUploadMeetingId(meetingId: string): Promise<void> {
  const current = (await readDraft()) ?? emptyDraft();
  current.meetingId = meetingId;
  await writeDraft(current);
}

export async function setUploadActive(active: boolean): Promise<void> {
  const current = (await readDraft()) ?? emptyDraft();
  current.uploading = active;
  await writeDraft(current);
}

export async function clearUploadDraft(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
