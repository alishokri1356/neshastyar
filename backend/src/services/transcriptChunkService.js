const fs = require('fs').promises;
const path = require('path');

function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function assertMeetingId(meetingId) {
  if (!/^[0-9a-f-]{36}$/i.test(String(meetingId || ''))) {
    throw httpError(400, 'Meeting id must be a UUID');
  }
  return String(meetingId);
}

function assertChunkIndex(chunkIndex) {
  const index = Number(chunkIndex);
  if (!Number.isInteger(index) || index < 0) {
    throw httpError(400, 'chunkIndex must be a non-negative integer');
  }
  return index;
}

function assertFileSize(fileSize) {
  const size = Number(fileSize);
  if (!Number.isInteger(size) || size < 0) {
    throw httpError(400, 'fileSize must be a non-negative integer');
  }
  return size;
}

function buildChunkId(meetingId, chunkIndex, fileSize) {
  return `${meetingId}:${chunkIndex}:${fileSize}`;
}

function meetingDir(meetingId) {
  return path.join(process.cwd(), 'uploads', 'transcript-chunks', meetingId);
}

function chunkFileName(chunkIndex, fileSize) {
  return `${chunkIndex}_${fileSize}.json`;
}

function parseChunkFileName(name) {
  const match = /^(\d+)_(\d+)\.json$/.exec(name);
  if (!match) return null;
  return {
    chunkIndex: Number(match[1]),
    fileSize: Number(match[2])
  };
}

async function listMeetingTranscriptChunks(meetingId) {
  const id = assertMeetingId(meetingId);
  const dir = meetingDir(id);
  let names;
  try {
    names = await fs.readdir(dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { meetingId: id, chunks: [] };
    }
    throw error;
  }

  const chunks = [];
  for (const name of names) {
    const parsed = parseChunkFileName(name);
    if (!parsed) continue;
    try {
      const raw = JSON.parse(await fs.readFile(path.join(dir, name), 'utf8'));
      const text = typeof raw.text === 'string' ? raw.text.trim() : '';
      if (!text) continue;
      const chunkIndex = Number.isInteger(raw.chunkIndex) ? raw.chunkIndex : parsed.chunkIndex;
      const fileSize = Number.isInteger(raw.fileSize) ? raw.fileSize : parsed.fileSize;
      chunks.push({
        chunkId: buildChunkId(id, chunkIndex, fileSize),
        meetingId: id,
        chunkIndex,
        fileSize,
        text,
        updatedAt: raw.updatedAt || null
      });
    } catch (_) {
      /* ignore corrupt checkpoint files */
    }
  }

  chunks.sort((a, b) => a.chunkIndex - b.chunkIndex || a.fileSize - b.fileSize);
  return { meetingId: id, chunks };
}

async function saveMeetingTranscriptChunk(meetingId, { chunkIndex, fileSize, text }) {
  const id = assertMeetingId(meetingId);
  const index = assertChunkIndex(chunkIndex);
  const size = assertFileSize(fileSize);
  const body = String(text || '').trim();
  if (!body) {
    throw httpError(400, 'text is required');
  }

  const dir = meetingDir(id);
  await fs.mkdir(dir, { recursive: true });

  const chunkId = buildChunkId(id, index, size);
  const payload = {
    chunkId,
    meetingId: id,
    chunkIndex: index,
    fileSize: size,
    text: body,
    updatedAt: new Date().toISOString()
  };
  await fs.writeFile(path.join(dir, chunkFileName(index, size)), JSON.stringify(payload));
  return payload;
}

async function flushMeetingTranscriptChunks(meetingId) {
  const id = assertMeetingId(meetingId);
  const dir = meetingDir(id);
  let bytesFreed = 0;
  let removed = false;
  let fileCount = 0;

  try {
    const names = await fs.readdir(dir);
    fileCount = names.length;
    for (const name of names) {
      try {
        const st = await fs.stat(path.join(dir, name));
        if (st.isFile()) bytesFreed += st.size;
      } catch (_) {
        /* ignore */
      }
    }
    await fs.rm(dir, { recursive: true, force: true });
    removed = true;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  return { meetingId: id, removed, fileCount, bytesFreed };
}

module.exports = {
  buildChunkId,
  listMeetingTranscriptChunks,
  saveMeetingTranscriptChunk,
  flushMeetingTranscriptChunks
};
