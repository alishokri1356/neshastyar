const { execFile } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Files longer than 75 minutes are split into ~45 minute slices
// with a short overlap so transcript stitching can drop duplicated edges.
const CHUNK_SECONDS = 45 * 60;
const OVERLAP_SECONDS = 20;
const SINGLE_FILE_MAX_SECONDS = 75 * 60;
const PLAN_VERSION = '45m-keep75-overlap20-v1';
const FFMPEG_TIMEOUT_MS = 3 * 60 * 1000;

const inflight = new Map();

function planChunkWindows(durationSeconds) {
  const duration = Number(durationSeconds);
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error('Audio duration is invalid');
  }

  if (duration <= SINGLE_FILE_MAX_SECONDS) {
    return [{ start: 0, length: duration }];
  }

  const windows = [];
  let start = 0;
  while (start < duration - 0.5) {
    const remaining = duration - start;
    if (windows.length > 0 && remaining <= OVERLAP_SECONDS) break;

    const length = Math.min(CHUNK_SECONDS + OVERLAP_SECONDS, remaining);
    windows.push({ start, length });
    if (start + length >= duration - 0.5) break;
    start += CHUNK_SECONDS;
    if (windows.length > 200) {
      throw new Error('Audio file produced too many chunks');
    }
  }

  return windows;
}

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function resolveInsideCwd(relativePath) {
  const root = path.resolve(process.cwd());
  const resolved = path.resolve(root, relativePath);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw httpError(400, 'Audio path is outside the application directory');
  }
  return resolved;
}

function execFileAsync(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { timeout: FFMPEG_TIMEOUT_MS, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        if (error.code === 'ENOENT') {
          reject(httpError(500, `${command} is not installed on the server`));
          return;
        }
        const detail = (stderr || error.message || '').trim();
        reject(httpError(500, detail || `${command} failed`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

async function probeDuration(filePath) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'csv=p=0',
    filePath
  ]);
  const duration = parseFloat(String(stdout).trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw httpError(422, 'Could not read audio duration');
  }
  return duration;
}

async function readManifest(manifestPath) {
  try {
    return JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function ensureChunks(audioFile) {
  const key = String(audioFile.id);
  if (!inflight.has(key)) {
    const job = buildChunks(audioFile).finally(() => inflight.delete(key));
    inflight.set(key, job);
  }
  return inflight.get(key);
}

async function buildChunks(audioFile) {
  const sourcePath = resolveInsideCwd(audioFile.file_path);
  let sourceStat;
  try {
    sourceStat = await fs.stat(sourcePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw httpError(404, 'Audio file is missing on disk');
    }
    throw error;
  }

  const outDir = path.join(process.cwd(), 'uploads', 'audio-chunks', String(audioFile.id));
  const manifestPath = path.join(outDir, 'manifest.json');
  const existing = await readManifest(manifestPath);
  if (
    existing &&
    existing.planVersion === PLAN_VERSION &&
    existing.sourceMtimeMs === sourceStat.mtimeMs &&
    existing.sourceSize === sourceStat.size
  ) {
    return existing;
  }

  await fs.rm(outDir, { recursive: true, force: true });
  await fs.mkdir(outDir, { recursive: true });

  const duration = await probeDuration(sourcePath);
  const windows = planChunkWindows(duration);
  const chunks = [];

  if (windows.length === 1 && duration <= SINGLE_FILE_MAX_SECONDS) {
    chunks.push({
      index: 0,
      count: 1,
      startSeconds: 0,
      endSeconds: duration,
      fileName: path.basename(sourcePath),
      relativePath: audioFile.file_path,
      mimeType: audioFile.format || 'application/octet-stream',
      fileSize: sourceStat.size,
      useOriginal: true
    });
  } else {
    for (let index = 0; index < windows.length; index += 1) {
      const window = windows[index];
      const fileName = `chunk-${String(index).padStart(3, '0')}.mp3`;
      const relativePath = path.join('uploads', 'audio-chunks', String(audioFile.id), fileName);
      const outPath = resolveInsideCwd(relativePath);
      await execFileAsync('ffmpeg', [
        '-y',
        '-ss', String(window.start),
        '-t', String(window.length),
        '-i', sourcePath,
        '-vn',
        '-ac', '1',
        '-ar', '16000',
        '-c:a', 'libmp3lame',
        '-b:a', '64k',
        outPath
      ]);
      const chunkStat = await fs.stat(outPath);
      chunks.push({
        index,
        count: windows.length,
        startSeconds: window.start,
        endSeconds: Math.min(window.start + window.length, duration),
        fileName,
        relativePath,
        mimeType: 'audio/mpeg',
        fileSize: chunkStat.size,
        useOriginal: false
      });
    }
  }

  const manifest = {
    planVersion: PLAN_VERSION,
    sourceMtimeMs: sourceStat.mtimeMs,
    sourceSize: sourceStat.size,
    duration,
    chunks
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  return manifest;
}

function toPublicChunk(audioFile, fileIndex, fileCount, chunk) {
  return {
    audioFileId: audioFile.id,
    fileIndex,
    fileCount,
    chunkIndex: chunk.index,
    chunkCount: chunk.count,
    url: `/api/audio-chunks/${audioFile.id}/${chunk.index}`,
    fileName: chunk.fileName,
    mimeType: chunk.mimeType,
    fileSize: chunk.fileSize,
    startSeconds: chunk.startSeconds,
    endSeconds: chunk.endSeconds
  };
}

async function listMeetingChunks(meetingId) {
  const db = require('../config/database');
  const audioFiles = await db.query(
    'SELECT * FROM audio_files WHERE meeting_id = ? ORDER BY upload_order ASC, created_at ASC',
    [meetingId]
  );
  if (!audioFiles.length) {
    throw httpError(404, 'No audio files found for this meeting');
  }

  const chunks = [];
  for (let fileIndex = 0; fileIndex < audioFiles.length; fileIndex += 1) {
    const audioFile = audioFiles[fileIndex];
    const manifest = await ensureChunks(audioFile);
    for (const chunk of manifest.chunks) {
      chunks.push(toPublicChunk(audioFile, fileIndex, audioFiles.length, chunk));
    }
  }
  return chunks;
}

async function resolveChunk(audioFileId, chunkIndex) {
  const index = Number(chunkIndex);
  if (!Number.isInteger(index) || index < 0) {
    throw httpError(400, 'Chunk index is invalid');
  }

  const db = require('../config/database');
  const rows = await db.query('SELECT * FROM audio_files WHERE id = ?', [audioFileId]);
  if (!rows.length) {
    throw httpError(404, 'Audio file not found');
  }

  const manifest = await ensureChunks(rows[0]);
  const chunk = manifest.chunks.find((item) => item.index === index);
  if (!chunk) {
    throw httpError(404, 'Audio chunk not found');
  }

  const absolutePath = resolveInsideCwd(chunk.relativePath);
  const stat = await fs.stat(absolutePath);
  return {
    absolutePath,
    mimeType: chunk.mimeType,
    fileName: chunk.fileName,
    fileSize: stat.size
  };
}

/**
 * Delete generated transcription chunk files for a meeting.
 * Original uploaded audio under uploads/audio is never removed.
 */
async function flushMeetingChunks(meetingId) {
  const db = require('../config/database');
  const audioFiles = await db.query(
    'SELECT id FROM audio_files WHERE meeting_id = ? ORDER BY upload_order ASC, created_at ASC',
    [meetingId]
  );

  const flushed = [];
  for (const audioFile of audioFiles) {
    const audioFileId = String(audioFile.id);
    inflight.delete(audioFileId);

    const outDir = path.join(process.cwd(), 'uploads', 'audio-chunks', audioFileId);
    let removed = false;
    let bytesFreed = 0;
    try {
      const entries = await fs.readdir(outDir);
      for (const name of entries) {
        try {
          const st = await fs.stat(path.join(outDir, name));
          if (st.isFile()) bytesFreed += st.size;
        } catch (_) {
          /* ignore per-file stat errors */
        }
      }
      await fs.rm(outDir, { recursive: true, force: true });
      removed = true;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    flushed.push({ audioFileId, removed, bytesFreed });
  }

  return {
    meetingId,
    audioFileCount: audioFiles.length,
    flushed,
    bytesFreed: flushed.reduce((sum, item) => sum + item.bytesFreed, 0)
  };
}

module.exports = {
  CHUNK_SECONDS,
  OVERLAP_SECONDS,
  SINGLE_FILE_MAX_SECONDS,
  PLAN_VERSION,
  planChunkWindows,
  listMeetingChunks,
  resolveChunk,
  flushMeetingChunks
};
