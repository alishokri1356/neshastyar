const CHUNK_SIZE = 5 * 1024 * 1024;

export class UploadAbortedError extends Error {
  constructor() {
    super('Upload aborted');
    this.name = 'AbortError';
  }
}

export interface ResumableUploadResult {
  relativePath: string;
  size: number;
  format: string;
  filename: string;
}

interface SessionStatus {
  bytesReceived: number;
  totalSize: number;
  complete?: boolean;
  relativePath?: string | null;
  size?: number;
  format?: string;
  filename?: string;
}

interface UploadOptions {
  apiBaseUrl: string;
  token: string;
  uploadId: string;
  file: Blob;
  fileName: string;
  mimeType: string;
  signal?: AbortSignal;
  onProgress?: (loaded: number, total: number) => void;
}

function authHeaders(token: string, json = false): HeadersInit {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function readJson(response: Response) {
  return response.json().catch(() => ({}));
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new UploadAbortedError();
}

async function createOrResumeSession(options: UploadOptions): Promise<SessionStatus> {
  throwIfAborted(options.signal);
  const response = await fetch(`${options.apiBaseUrl}/upload/sessions`, {
    method: 'POST',
    headers: authHeaders(options.token, true),
    body: JSON.stringify({
      uploadId: options.uploadId,
      fileName: options.fileName,
      totalSize: options.file.size,
      mimeType: options.mimeType || 'application/octet-stream',
    }),
    signal: options.signal,
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(body.message || 'شروع آپلود ناموفق بود');
  }
  return body.data as SessionStatus;
}

async function readSession(options: UploadOptions): Promise<SessionStatus | null> {
  try {
    const response = await fetch(`${options.apiBaseUrl}/upload/sessions/${options.uploadId}`, {
      headers: authHeaders(options.token),
      signal: options.signal,
    });
    const body = await readJson(response);
    if (!response.ok) return null;
    return body.data as SessionStatus;
  } catch (error) {
    if (error instanceof UploadAbortedError || (error as Error).name === 'AbortError') {
      throw new UploadAbortedError();
    }
    return null;
  }
}

function sendChunk(
  options: UploadOptions,
  offset: number,
  blob: Blob,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${options.apiBaseUrl}/upload/sessions/${options.uploadId}?offset=${offset}`;
    xhr.open('PATCH', url);
    xhr.setRequestHeader('Authorization', `Bearer ${options.token}`);
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    const onAbort = () => {
      xhr.abort();
      reject(new UploadAbortedError());
    };
    options.signal?.addEventListener('abort', onAbort, { once: true });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      options.onProgress?.(offset + event.loaded, options.file.size);
    };
    xhr.onload = () => {
      options.signal?.removeEventListener('abort', onAbort);
      let body: { message?: string; data?: { bytesReceived?: number } } = {};
      try {
        body = JSON.parse(xhr.responseText || '{}');
      } catch {
        body = {};
      }
      if (xhr.status === 409 && typeof body.data?.bytesReceived === 'number') {
        resolve(body.data.bytesReceived);
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && typeof body.data?.bytesReceived === 'number') {
        resolve(body.data.bytesReceived);
        return;
      }
      reject(new Error(body.message || `آپلود ناموفق (${xhr.status})`));
    };
    xhr.onerror = () => {
      options.signal?.removeEventListener('abort', onAbort);
      reject(new Error('ارتباط هنگام آپلود قطع شد'));
    };
    xhr.onabort = () => {
      options.signal?.removeEventListener('abort', onAbort);
      reject(new UploadAbortedError());
    };
    xhr.send(blob);
  });
}

async function completeSession(options: UploadOptions): Promise<ResumableUploadResult> {
  throwIfAborted(options.signal);
  const response = await fetch(`${options.apiBaseUrl}/upload/sessions/${options.uploadId}/complete`, {
    method: 'POST',
    headers: authHeaders(options.token, true),
    signal: options.signal,
  });
  const body = await readJson(response);
  if (!response.ok) {
    throw new Error(body.message || 'پایان آپلود ناموفق بود');
  }
  const data = body.data || {};
  if (!data.relativePath) throw new Error('مسیر فایل از سرور برنگشت');
  return {
    relativePath: String(data.relativePath).replace(/\\/g, '/'),
    size: Number(data.size || options.file.size),
    format: data.format || options.mimeType,
    filename: data.filename || options.fileName,
  };
}

function resultFromSession(session: SessionStatus, fallback: UploadOptions): ResumableUploadResult | null {
  if (!session.complete || !session.relativePath) return null;
  return {
    relativePath: String(session.relativePath).replace(/\\/g, '/'),
    size: Number(session.size || fallback.file.size),
    format: session.format || fallback.mimeType,
    filename: session.filename || fallback.fileName,
  };
}

export async function uploadFileResumable(options: UploadOptions): Promise<ResumableUploadResult> {
  const session = await createOrResumeSession(options);
  const alreadyDone = resultFromSession(session, options);
  if (alreadyDone) {
    options.onProgress?.(options.file.size, options.file.size);
    return alreadyDone;
  }

  let offset = session.bytesReceived || 0;
  options.onProgress?.(offset, options.file.size);

  while (offset < options.file.size) {
    throwIfAborted(options.signal);
    const end = Math.min(offset + CHUNK_SIZE, options.file.size);
    const slice = options.file.slice(offset, end);
    let delivered = false;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 5 && !delivered; attempt += 1) {
      throwIfAborted(options.signal);
      try {
        offset = await sendChunk(options, offset, slice);
        delivered = true;
      } catch (error) {
        if (error instanceof UploadAbortedError || (error as Error).name === 'AbortError') {
          throw new UploadAbortedError();
        }
        lastError = error as Error;
        const latest = await readSession(options);
        if (latest) {
          const done = resultFromSession(latest, options);
          if (done) return done;
          if (typeof latest.bytesReceived === 'number' && latest.bytesReceived !== offset) {
            offset = latest.bytesReceived;
            delivered = true;
          }
        }
        if (!delivered && attempt < 4) {
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
        }
      }
    }

    if (!delivered) {
      throw lastError || new Error('آپلود فایل ناموفق بود');
    }
  }

  const finished = await completeSession(options);
  options.onProgress?.(options.file.size, options.file.size);
  return finished;
}
