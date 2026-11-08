jest.mock('uuid', () => ({
  v4: jest.fn(() => 'fixed-id'),
}));

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('./chatContextService', () => ({
  buildMeetingContext: jest.fn(async () => ({
    scope: 'meeting',
    meetingId: 'm1',
    meetingTitle: 'جلسه تست',
    contextText: 'خلاصه تست',
  })),
  buildAllMeetingsContext: jest.fn(async () => ({
    scope: 'all',
    meetingId: null,
    meetingTitle: null,
    contextText: 'لیست جلسات',
  })),
  buildPrompt: jest.fn(({ history }) => ({
    system: 'system-prompt',
    messages: history,
  })),
}));

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const chatService = require('./chatService');

describe('chatService.sendMessage', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.CHAT_WEBHOOK_URL;
  let ids;

  beforeEach(() => {
    jest.clearAllMocks();
    ids = ['user-1', 'assistant-1'];
    uuidv4.mockImplementation(() => ids.shift() || 'extra-id');
    process.env.CHAT_WEBHOOK_URL = 'https://example.com/chat';
    process.env.INTERNAL_WEBHOOK_SECRET = 'secret';

    db.query.mockImplementation(async (sql) => {
      if (sql.includes('FROM chat_sessions') && sql.includes('LIMIT 1')) {
        return [{
          id: 's1',
          user_id: 'u1',
          meeting_id: 'm1',
          scope: 'meeting',
          title: 'جلسه تست',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          last_message_at: null,
        }];
      }
      if (sql.includes('FROM chat_messages') && sql.includes('ORDER BY created_at ASC')) {
        return [
          {
            id: 'user-1',
            session_id: 's1',
            role: 'user',
            content: 'سلام',
            model_used: null,
            status: 'ok',
            created_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 'assistant-1',
            session_id: 's1',
            role: 'assistant',
            content: 'پاسخ',
            model_used: 'glm_53',
            status: 'ok',
            created_at: '2026-01-01T00:00:01Z',
          },
        ];
      }
      return { affectedRows: 1 };
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
    process.env.CHAT_WEBHOOK_URL = originalEnv;
  });

  test('returns user and assistant messages on success', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, answer: 'پاسخ', model: 'glm_53' }),
    }));

    const result = await chatService.sendMessage('u1', 's1', 'سلام');
    expect(result.userMessage.content).toBe('سلام');
    expect(result.assistantMessage.content).toBe('پاسخ');
    expect(result.assistantMessage.model_used).toBe('glm_53');
    expect(global.fetch).toHaveBeenCalled();
  });

  test('saves error assistant message when webhook fails', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 502,
      json: async () => ({ ok: false, error: 'مدل‌ها پاسخ ندادند' }),
    }));

    db.query.mockImplementation(async (sql) => {
      if (sql.includes('FROM chat_sessions') && sql.includes('LIMIT 1')) {
        return [{
          id: 's1',
          user_id: 'u1',
          meeting_id: 'm1',
          scope: 'meeting',
          title: 'جلسه تست',
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          last_message_at: null,
        }];
      }
      if (sql.includes('FROM chat_messages') && sql.includes('ORDER BY created_at ASC')) {
        return [
          {
            id: 'user-1',
            session_id: 's1',
            role: 'user',
            content: 'سلام',
            status: 'ok',
            created_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 'assistant-1',
            session_id: 's1',
            role: 'assistant',
            content: 'مدل‌ها پاسخ ندادند',
            status: 'error',
            created_at: '2026-01-01T00:00:01Z',
          },
        ];
      }
      return { affectedRows: 1 };
    });

    const result = await chatService.sendMessage('u1', 's1', 'سلام');
    expect(result.assistantMessage.status).toBe('error');
    expect(result.assistantMessage.content).toContain('مدل');
  });

  test('rejects empty question with 400', async () => {
    await expect(chatService.sendMessage('u1', 's1', '   ')).rejects.toMatchObject({
      status: 400,
    });
  });
});
