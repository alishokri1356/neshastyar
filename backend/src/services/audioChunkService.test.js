const { planChunkWindows, CHUNK_SECONDS, OVERLAP_SECONDS, SINGLE_FILE_MAX_SECONDS } = require('./audioChunkService');
const { stitchTranscripts } = require('./transcriptStitch');

describe('planChunkWindows', () => {
  test('keeps a recording up to 75 minutes as one chunk', () => {
    expect(planChunkWindows(SINGLE_FILE_MAX_SECONDS)).toEqual([
      { start: 0, length: SINGLE_FILE_MAX_SECONDS }
    ]);
    expect(planChunkWindows(45 * 60)).toHaveLength(1);
    expect(planChunkWindows(74 * 60)).toHaveLength(1);
  });

  test('splits a 90 minute recording into overlapping 45 minute windows', () => {
    const windows = planChunkWindows(90 * 60);
    expect(CHUNK_SECONDS).toBe(45 * 60);
    expect(SINGLE_FILE_MAX_SECONDS).toBe(75 * 60);
    expect(windows).toHaveLength(2);
    expect(windows[0]).toEqual({ start: 0, length: CHUNK_SECONDS + OVERLAP_SECONDS });
    expect(windows[1].start).toBe(CHUNK_SECONDS);
    expect(windows[1].start).toBeLessThan(windows[0].start + windows[0].length);
    expect(windows[windows.length - 1].start + windows[windows.length - 1].length).toBe(90 * 60);
  });

  test('plans each long file independently (multi-file meeting model)', () => {
    const fileA = planChunkWindows(8 * 60);   // short → 1
    const fileB = planChunkWindows(90 * 60);  // >75 → 45m slices
    const fileC = planChunkWindows(75 * 60);  // exact threshold → 1
    expect(fileA).toHaveLength(1);
    expect(fileC).toHaveLength(1);
    expect(fileB.length).toBeGreaterThan(1);
    expect(fileB[0].length).toBe(CHUNK_SECONDS + OVERLAP_SECONDS);
    expect(fileA.length + fileB.length + fileC.length).toBe(1 + fileB.length + 1);
  });

  test('rejects an unreadable duration', () => {
    expect(() => planChunkWindows(0)).toThrow('Audio duration is invalid');
  });
});

describe('stitchTranscripts', () => {
  test('drops the repeated overlap at a chunk boundary', () => {
    const tail = 'و همه موافق ادامه کار بودند تا همین امروز کامل تمام شود';
    const joined = stitchTranscripts([
      `جلسه با بررسی بودجه شروع شد ${tail}`,
      `${tail} و قرار شد گزارش تا جمعه آماده شود`
    ]);
    expect(joined).toBe(`جلسه با بررسی بودجه شروع شد ${tail}\n\nو قرار شد گزارش تا جمعه آماده شود`);
  });

  test('keeps both sides when there is no shared ending', () => {
    expect(stitchTranscripts(['بخش اول.', 'بخش دوم.'])).toBe('بخش اول.\n\nبخش دوم.');
  });
});
