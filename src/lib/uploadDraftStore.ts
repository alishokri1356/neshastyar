import { DraftStatus, type DraftStatusType } from "@/lib/neshastyarStatus";

export interface StoredDraftFile {
  id: string;
  name: string;
  duration: number;
  type: "recording" | "upload";
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
  id: string;
  createdAt: number;
  status: DraftStatusType;
  commentText: string;
  files: StoredDraftFile[];
  completed: Record<string, StoredCompletedUpload>;
  selectedTagIds: string[];
  selectedParticipantIds: string[];
  meetingId: string | null;
  uploading: boolean;
}

const DB_NAME = "neshastyar-uploads";
const STORE = "draft";
const KEY = "current";

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeUploadDraft(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

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

function normalizeDraft(raw: Partial<StoredUploadDraft> | null | undefined): StoredUploadDraft | null {
  if (!raw) return null;
  return {
    id: raw.id || "local-draft",
    createdAt: raw.createdAt || Date.now(),
    status:
      raw.status ||
      (raw.uploading ? DraftStatus.ON_UPLOADING : DraftStatus.ON_RECORDING),
    commentText: raw.commentText ?? "",
    files: Array.isArray(raw.files) ? raw.files : [],
    completed: raw.completed ?? {},
    selectedTagIds: Array.isArray(raw.selectedTagIds) ? raw.selectedTagIds : [],
    selectedParticipantIds: Array.isArray(raw.selectedParticipantIds) ? raw.selectedParticipantIds : [],
    meetingId: raw.meetingId ?? null,
    uploading: Boolean(raw.uploading),
  };
}

async function readDraft(): Promise<StoredUploadDraft | null> {
  try {
    const db = await openDb();
    try {
      const tx = db.transaction(STORE, "readonly");
      const value = await requestToPromise(tx.objectStore(STORE).get(KEY));
      return normalizeDraft(value as Partial<StoredUploadDraft> | undefined);
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

async function writeDraft(draft: StoredUploadDraft): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(draft, KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  notifyListeners();
}

function emptyDraft(): StoredUploadDraft {
  return {
    id: `draft-${Date.now()}`,
    createdAt: Date.now(),
    status: DraftStatus.ON_RECORDING,
    commentText: "",
    files: [],
    completed: {},
    selectedTagIds: [],
    selectedParticipantIds: [],
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
  selectedTagIds?: string[],
  options?: {
    status?: DraftStatusType;
    selectedParticipantIds?: string[];
  },
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
    selectedTagIds: selectedTagIds ?? current.selectedTagIds,
    selectedParticipantIds: options?.selectedParticipantIds ?? current.selectedParticipantIds,
    status: options?.status ?? current.status,
    completed,
  });
}

export async function updateDraftStatus(status: DraftStatusType): Promise<void> {
  const current = await readDraft();
  if (!current) return;
  await writeDraft({
    ...current,
    status,
    uploading: status === DraftStatus.ON_UPLOADING ? true : current.uploading,
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
  current.status = active ? DraftStatus.ON_UPLOADING : DraftStatus.ON_TAG_SELECTION;
  await writeDraft(current);
}

export async function clearUploadDraft(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(KEY);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  notifyListeners();
}
