const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const MAX_FILE_BYTES = 500 * 1024 * 1024;
const MAX_CHUNK_BYTES = 8 * 1024 * 1024;
const SESSION_TTL_MS = 48 * 60 * 60 * 1000;

const ALLOWED_EXTENSIONS = new Set([
  '.mp3', '.wav', '.aac', '.m4a', '.ogg', '.opus', '.webm',
  '.3gp', '.3gpp', '.amr', '.flac', '.caf', '.aiff', '.aif', '.mp4',
]);

class UploadSessionError extends Error {
  constructor(message, statusCode = 400, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
  }
}

class UploadSessionService {
  constructor() {
    this.locks = new Map();
  }

  incompleteDir(userId) {
    return path.join(process.cwd(), 'uploads', 'incomplete', userId);
  }

  partPath(userId, uploadId) {
    return path.join(this.incompleteDir(userId), `${uploadId}.part`);
  }

  metaPath(userId, uploadId) {
    return path.join(this.incompleteDir(userId), `${uploadId}.json`);
  }

  donePath(userId, uploadId) {
    return path.join(this.incompleteDir(userId), `${uploadId}.done.json`);
  }

  assertUploadId(uploadId) {
    if (!/^[a-zA-Z0-9_-]{8,80}$/.test(String(uploadId || ''))) {
      throw new UploadSessionError('Invalid upload id');
    }
  }

  safeFileName(name) {
    const base = path.basename(String(name || 'audio')).replace(/[^\w.\-()\u0600-\u06FF ]+/g, '_');
    const trimmed = base.replace(/\s+/g, ' ').trim().slice(0, 180);
    return trimmed || 'audio';
  }

  extensionForMime(mimeType) {
    const mime = String(mimeType || '').toLowerCase();
    if (mime.includes('webm')) return '.webm';
    if (mime.includes('mpeg') || mime.includes('mp3')) return '.mp3';
    if (mime.includes('mp4') || mime.includes('m4a') || mime.includes('aac')) return '.m4a';
    if (mime.includes('ogg') || mime.includes('opus')) return '.ogg';
    if (mime.includes('flac')) return '.flac';
    if (mime.includes('wav')) return '.wav';
    if (mime.startsWith('audio/')) return '.wav';
    return '';
  }

  normalizeAudioName(fileName, mimeType) {
    const ext = path.extname(fileName).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) return fileName;
    const guessed = this.extensionForMime(mimeType);
    if (!guessed) {
      throw new UploadSessionError('Only audio files are allowed');
    }
    return `${fileName}${guessed}`;
  }

  async withLock(uploadId, fn) {
    const prev = this.locks.get(uploadId) || Promise.resolve();
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    this.locks.set(uploadId, prev.then(() => gate));
    await prev.catch(() => {});
    try {
      return await fn();
    } finally {
      release();
      if (this.locks.get(uploadId) === gate) {
        this.locks.delete(uploadId);
      }
    }
  }

  async readJson(filePath) {
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      return JSON.parse(raw);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }

  async writeJson(filePath, value) {
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmp = `${filePath}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(value));
    await fs.rename(tmp, filePath);
  }

  statusFromMeta(meta, extra = {}) {
    return {
      uploadId: meta.uploadId,
      bytesReceived: meta.bytesReceived,
      totalSize: meta.totalSize,
      complete: false,
      ...extra,
    };
  }

  async sweepStale(userId) {
    const dir = this.incompleteDir(userId);
    let names = [];
    try {
      names = await fs.readdir(dir);
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    const cutoff = Date.now() - SESSION_TTL_MS;
    for (const name of names) {
      if (!name.endsWith('.json')) continue;
      const full = path.join(dir, name);
      try {
        const stat = await fs.stat(full);
        if (stat.mtimeMs < cutoff) {
          const id = name.replace(/\.done\.json$/, '').replace(/\.json$/, '');
          await fs.rm(path.join(dir, `${id}.part`), { force: true });
          await fs.rm(path.join(dir, `${id}.json`), { force: true });
          await fs.rm(path.join(dir, `${id}.done.json`), { force: true });
        }
      } catch {
        // ignore a file that disappeared mid-sweep
      }
    }
  }

  async createOrResume(userId, body) {
    const uploadId = body.uploadId;
    this.assertUploadId(uploadId);
    const fileName = this.normalizeAudioName(this.safeFileName(body.fileName), body.mimeType);
    const totalSize = Number(body.totalSize);
    if (!Number.isInteger(totalSize) || totalSize <= 0 || totalSize > MAX_FILE_BYTES) {
      throw new UploadSessionError('Invalid file size');
    }
    const mimeType = String(body.mimeType || 'application/octet-stream').slice(0, 120);

    return this.withLock(uploadId, async () => {
      await this.sweepStale(userId);
      const done = await this.readJson(this.donePath(userId, uploadId));
      if (done) {
        return {
          uploadId,
          bytesReceived: done.size,
          totalSize: done.size,
          complete: true,
          relativePath: done.relativePath,
          size: done.size,
          format: done.format,
          originalName: done.originalName,
          filename: done.filename,
        };
      }

      const existing = await this.readJson(this.metaPath(userId, uploadId));
      if (existing) {
        if (existing.totalSize !== totalSize) {
          throw new UploadSessionError('Upload session already exists with a different file size', 409, {
            bytesReceived: existing.bytesReceived,
            totalSize: existing.totalSize,
          });
        }
        return this.statusFromMeta(existing);
      }

      await fs.mkdir(this.incompleteDir(userId), { recursive: true });
      await fs.writeFile(this.partPath(userId, uploadId), Buffer.alloc(0));
      const meta = {
        uploadId,
        fileName,
        mimeType,
        totalSize,
        bytesReceived: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await this.writeJson(this.metaPath(userId, uploadId), meta);
      return this.statusFromMeta(meta);
    });
  }

  async getStatus(userId, uploadId) {
    this.assertUploadId(uploadId);
    const done = await this.readJson(this.donePath(userId, uploadId));
    if (done) {
      return {
        uploadId,
        bytesReceived: done.size,
        totalSize: done.size,
        complete: true,
        relativePath: done.relativePath,
        size: done.size,
        format: done.format,
        originalName: done.originalName,
        filename: done.filename,
      };
    }
    const meta = await this.readJson(this.metaPath(userId, uploadId));
    if (!meta) {
      throw new UploadSessionError('Upload session not found', 404);
    }
    return this.statusFromMeta(meta);
  }

  async appendChunk(userId, uploadId, req) {
    this.assertUploadId(uploadId);
    const offset = Number(req.query.offset);
    const contentLength = Number(req.headers['content-length']);
    if (!Number.isInteger(offset) || offset < 0) {
      throw new UploadSessionError('Invalid upload offset');
    }
    if (!Number.isInteger(contentLength) || contentLength <= 0 || contentLength > MAX_CHUNK_BYTES) {
      throw new UploadSessionError('Invalid chunk size');
    }

    return this.withLock(uploadId, async () => {
      const meta = await this.readJson(this.metaPath(userId, uploadId));
      if (!meta) {
        throw new UploadSessionError('Upload session not found', 404);
      }
      if (offset !== meta.bytesReceived) {
        throw new UploadSessionError('Offset mismatch', 409, {
          bytesReceived: meta.bytesReceived,
          totalSize: meta.totalSize,
        });
      }
      if (offset + contentLength > meta.totalSize) {
        throw new UploadSessionError('Chunk exceeds file size');
      }

      const part = this.partPath(userId, uploadId);
      await fs.truncate(part, meta.bytesReceived);

      const written = await this.writeRequest(req, part, offset, contentLength);
      if (written !== contentLength) {
        await fs.truncate(part, meta.bytesReceived);
        throw new UploadSessionError('Incomplete chunk', 400, {
          bytesReceived: meta.bytesReceived,
          totalSize: meta.totalSize,
        });
      }

      meta.bytesReceived = offset + written;
      meta.updatedAt = new Date().toISOString();
      await this.writeJson(this.metaPath(userId, uploadId), meta);
      return this.statusFromMeta(meta);
    });
  }

  writeRequest(req, partPath, offset, contentLength) {
    return new Promise((resolve, reject) => {
      const ws = fsSync.createWriteStream(partPath, { flags: 'r+', start: offset });
      let written = 0;
      let settled = false;

      req.on('data', (chunk) => {
        if (settled) return;
        written += chunk.length;
        if (written > contentLength) {
          settled = true;
          req.destroy();
          ws.destroy();
          resolve(written);
          return;
        }
        if (!ws.write(chunk)) req.pause();
      });
      ws.on('drain', () => req.resume());
      req.on('end', () => {
        if (settled) return;
        settled = true;
        ws.end(() => resolve(written));
      });
      req.on('error', (error) => {
        if (settled) return;
        settled = true;
        ws.destroy();
        reject(error);
      });
      ws.on('error', (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      });
      req.on('aborted', () => {
        if (settled) return;
        settled = true;
        ws.destroy();
        resolve(written);
      });
    });
  }

  async complete(userId, uploadId) {
    this.assertUploadId(uploadId);
    return this.withLock(uploadId, async () => {
      const done = await this.readJson(this.donePath(userId, uploadId));
      if (done) {
        return {
          path: done.path,
          relativePath: done.relativePath,
          size: done.size,
          format: done.format,
          originalName: done.originalName,
          filename: done.filename,
        };
      }

      const meta = await this.readJson(this.metaPath(userId, uploadId));
      if (!meta) {
        throw new UploadSessionError('Upload session not found', 404);
      }
      const part = this.partPath(userId, uploadId);
      const stat = await fs.stat(part);
      if (stat.size !== meta.totalSize || meta.bytesReceived !== meta.totalSize) {
        throw new UploadSessionError('Upload is incomplete', 409, {
          bytesReceived: Math.min(stat.size, meta.bytesReceived),
          totalSize: meta.totalSize,
        });
      }

      const filename = `${Date.now()}-${meta.fileName}`;
      const audioDir = path.join(process.cwd(), 'uploads', 'audio', userId);
      await fs.mkdir(audioDir, { recursive: true });
      const dest = path.join(audioDir, filename);
      try {
        await fs.rename(part, dest);
      } catch (error) {
        if (error.code !== 'EXDEV') throw error;
        await fs.copyFile(part, dest);
        await fs.unlink(part);
      }

      const relativePath = `uploads/audio/${userId}/${filename}`;
      const fileInfo = {
        path: dest,
        relativePath,
        size: meta.totalSize,
        format: meta.mimeType,
        originalName: meta.fileName,
        filename,
      };
      await this.writeJson(this.donePath(userId, uploadId), fileInfo);
      await fs.rm(this.metaPath(userId, uploadId), { force: true });
      return fileInfo;
    });
  }

  async remove(userId, uploadId) {
    this.assertUploadId(uploadId);
    return this.withLock(uploadId, async () => {
      await fs.rm(this.partPath(userId, uploadId), { force: true });
      await fs.rm(this.metaPath(userId, uploadId), { force: true });
      await fs.rm(this.donePath(userId, uploadId), { force: true });
      return { deleted: true, uploadId };
    });
  }
}

module.exports = new UploadSessionService();
module.exports.UploadSessionError = UploadSessionError;
