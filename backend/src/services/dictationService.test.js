const dictationService = require('./dictationService');

describe('dictationService.transcribe', () => {
  const originalFetch = global.fetch;
  const originalUrl = process.env.DICTATION_WEBHOOK_URL;
  const audio = Buffer.from('fake-audio');

  beforeEach(() => {
    process.env.DICTATION_WEBHOOK_URL = 'https://example.com/dictation';
    process.env.INTERNAL_WEBHOOK_SECRET = 'secret';
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.DICTATION_WEBHOOK_URL = originalUrl;
  });

  test('sends base64 audio with the internal secret and returns text', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, text: ' سلام دنیا ', model: 'gemini-3.5-transcribe' }),
    }));

    const result = await dictationService.transcribe({ buffer: audio, mimeType: 'audio/x-m4a' });

    expect(result).toEqual({ text: 'سلام دنیا', model: 'gemini-3.5-transcribe' });
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://example.com/dictation');
    expect(options.headers['x-internal-secret']).toBe('secret');
    expect(JSON.parse(options.body)).toEqual({
      mimeType: 'audio/mp4',
      audio: audio.toString('base64'),
    });
  });

  test('returns empty text when nothing was said', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, text: '' }),
    }));

    const result = await dictationService.transcribe({ buffer: audio, mimeType: 'audio/mp4' });
    expect(result.text).toBe('');
  });

  test('maps webhook failure to 502', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ ok: false, error: 'Gemini failed' }),
    }));

    await expect(
      dictationService.transcribe({ buffer: audio, mimeType: 'audio/mp4' }),
    ).rejects.toMatchObject({ status: 502 });
  });

  test('rejects missing audio with 400', async () => {
    await expect(dictationService.transcribe({ buffer: null, mimeType: 'audio/mp4' }))
      .rejects.toMatchObject({ status: 400 });
  });

  test('rejects unsupported mime type with 415', async () => {
    await expect(dictationService.transcribe({ buffer: audio, mimeType: 'video/mp4' }))
      .rejects.toMatchObject({ status: 415 });
  });

  test('rejects oversized audio with 413', async () => {
    const big = Buffer.alloc(dictationService.MAX_AUDIO_BYTES + 1);
    await expect(dictationService.transcribe({ buffer: big, mimeType: 'audio/mp4' }))
      .rejects.toMatchObject({ status: 413 });
  });
});
