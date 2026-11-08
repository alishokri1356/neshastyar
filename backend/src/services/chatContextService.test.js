const {
  buildPrompt,
  truncate,
  MEETING_TRANSCRIPT_LIMIT,
} = require('./chatContextService');

describe('chatContextService helpers', () => {
  test('truncate keeps short text unchanged', () => {
    expect(truncate('سلام', 10)).toBe('سلام');
  });

  test('truncate shortens long text', () => {
    const long = 'الف'.repeat(MEETING_TRANSCRIPT_LIMIT + 20);
    const result = truncate(long, MEETING_TRANSCRIPT_LIMIT);
    expect(result.length).toBeLessThan(long.length);
    expect(result).toContain('[...متن کوتاه شد...]');
  });

  test('buildPrompt creates Persian system and history window', () => {
    const history = [];
    for (let i = 0; i < 20; i += 1) {
      history.push({ role: i % 2 === 0 ? 'user' : 'assistant', content: `msg-${i}` });
    }

    const { system, messages } = buildPrompt({
      scope: 'meeting',
      contextText: 'خلاصه جلسه تست',
      history,
    });

    expect(system).toContain('فارسی');
    expect(system).toContain('خلاصه جلسه تست');
    expect(system).toContain('یک جلسه مشخص');
    expect(messages).toHaveLength(12);
    expect(messages[0].content).toBe('msg-8');
    expect(messages[messages.length - 1].content).toBe('msg-19');
  });

  test('buildPrompt for all meetings uses all-meetings instruction', () => {
    const { system } = buildPrompt({
      scope: 'all',
      contextText: 'لیست جلسات',
      history: [],
    });
    expect(system).toContain('همه جلسات');
  });
});
