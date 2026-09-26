const fs = require('fs').promises;
const os = require('os');
const path = require('path');

describe('transcriptChunkService', () => {
  let tmp;
  let service;
  const meetingId = '11111111-1111-1111-1111-111111111111';

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'transcript-chunks-'));
    jest.resetModules();
    jest.spyOn(process, 'cwd').mockReturnValue(tmp);
    service = require('./transcriptChunkService');
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await fs.rm(tmp, { recursive: true, force: true });
  });

  test('buildChunkId combines meeting, index, and filesize', () => {
    expect(service.buildChunkId(meetingId, 2, 4096)).toBe(`${meetingId}:2:4096`);
  });

  test('save and list round-trip by chunkId', async () => {
    await service.saveMeetingTranscriptChunk(meetingId, {
      chunkIndex: 0,
      fileSize: 1000,
      text: 'سلام'
    });
    await service.saveMeetingTranscriptChunk(meetingId, {
      chunkIndex: 1,
      fileSize: 2000,
      text: 'دنیا'
    });

    const listed = await service.listMeetingTranscriptChunks(meetingId);
    expect(listed.chunks).toHaveLength(2);
    expect(listed.chunks[0].chunkId).toBe(`${meetingId}:0:1000`);
    expect(listed.chunks[0].text).toBe('سلام');
    expect(listed.chunks[1].chunkId).toBe(`${meetingId}:1:2000`);
  });

  test('different filesize at same index is a different checkpoint', async () => {
    await service.saveMeetingTranscriptChunk(meetingId, {
      chunkIndex: 0,
      fileSize: 1000,
      text: 'old'
    });
    await service.saveMeetingTranscriptChunk(meetingId, {
      chunkIndex: 0,
      fileSize: 2000,
      text: 'new'
    });

    const listed = await service.listMeetingTranscriptChunks(meetingId);
    expect(listed.chunks).toHaveLength(2);
    expect(listed.chunks.map((c) => c.fileSize).sort()).toEqual([1000, 2000]);
  });

  test('flush removes meeting checkpoints', async () => {
    await service.saveMeetingTranscriptChunk(meetingId, {
      chunkIndex: 0,
      fileSize: 1000,
      text: 'x'
    });
    const flushed = await service.flushMeetingTranscriptChunks(meetingId);
    expect(flushed.removed).toBe(true);
    const listed = await service.listMeetingTranscriptChunks(meetingId);
    expect(listed.chunks).toEqual([]);
  });
});
