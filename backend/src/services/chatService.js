const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const {
  buildMeetingContext,
  buildAllMeetingsContext,
  buildPrompt,
} = require('./chatContextService');

const MAX_QUESTION_LENGTH = 4000;
const CHAT_TIMEOUT_MS = 120_000;
const pendingSessions = new Set();

function getChatWebhookUrl() {
  return process.env.CHAT_WEBHOOK_URL || '';
}

function getInternalSecret() {
  return process.env.INTERNAL_WEBHOOK_SECRET || process.env.N8N_WEBHOOK_SECRET || '';
}

function mapSession(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    meeting_id: row.meeting_id || null,
    scope: row.scope,
    title: row.title || null,
    meeting_title: row.meeting_title || null,
    last_message_preview: row.last_message_preview || null,
    last_message_at: row.last_message_at || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    session_id: row.session_id,
    role: row.role,
    content: row.content,
    model_used: row.model_used || null,
    status: row.status || 'ok',
    created_at: row.created_at,
  };
}

class ChatService {
  async createSession(userId, { meetingId } = {}) {
    if (meetingId) {
      const context = await buildMeetingContext(userId, meetingId);
      const id = uuidv4();
      await db.query(
        `INSERT INTO chat_sessions (id, user_id, meeting_id, scope, title, last_message_at)
         VALUES (?, ?, ?, 'meeting', ?, NULL)`,
        [id, userId, meetingId, context.meetingTitle || 'گفتگو درباره جلسه'],
      );
      return this.getSession(userId, id);
    }

    const id = uuidv4();
    await db.query(
      `INSERT INTO chat_sessions (id, user_id, meeting_id, scope, title, last_message_at)
       VALUES (?, ?, NULL, 'all', ?, NULL)`,
      [id, userId, 'گفتگو درباره همه جلسات'],
    );
    return this.getSession(userId, id);
  }

  async listSessions(userId, { meetingId, scope } = {}) {
    let sql = `
      SELECT
        s.*,
        m.title AS meeting_title,
        (
          SELECT cm.content
          FROM chat_messages cm
          WHERE cm.session_id = s.id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) AS last_message_preview
      FROM chat_sessions s
      LEFT JOIN meetings m ON m.id = s.meeting_id
      WHERE s.user_id = ?
    `;
    const params = [userId];

    if (meetingId) {
      sql += ' AND s.meeting_id = ? AND s.scope = \'meeting\'';
      params.push(meetingId);
    } else if (scope === 'all') {
      sql += ' AND s.scope = \'all\'';
    }

    sql += ' ORDER BY COALESCE(s.last_message_at, s.created_at) DESC';
    const rows = await db.query(sql, params);
    return rows.map(mapSession);
  }

  async getSession(userId, sessionId) {
    const rows = await db.query(
      `SELECT s.*, m.title AS meeting_title
       FROM chat_sessions s
       LEFT JOIN meetings m ON m.id = s.meeting_id
       WHERE s.id = ? AND s.user_id = ?
       LIMIT 1`,
      [sessionId, userId],
    );
    const session = mapSession(rows[0]);
    if (!session) {
      const error = new Error('گفتگو پیدا نشد');
      error.status = 404;
      throw error;
    }

    const messages = await db.query(
      `SELECT *
       FROM chat_messages
       WHERE session_id = ?
       ORDER BY created_at ASC`,
      [sessionId],
    );

    return {
      ...session,
      messages: messages.map(mapMessage),
    };
  }

  async deleteSession(userId, sessionId) {
    const result = await db.query(
      'DELETE FROM chat_sessions WHERE id = ? AND user_id = ?',
      [sessionId, userId],
    );
    if (!result.affectedRows) {
      const error = new Error('گفتگو پیدا نشد');
      error.status = 404;
      throw error;
    }
    return { success: true };
  }

  async sendMessage(userId, sessionId, content) {
    const question = String(content || '').trim();
    if (!question) {
      const error = new Error('متن سؤال خالی است');
      error.status = 400;
      throw error;
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      const error = new Error(`سؤال نباید بیشتر از ${MAX_QUESTION_LENGTH} کاراکتر باشد`);
      error.status = 400;
      throw error;
    }

    if (pendingSessions.has(sessionId)) {
      const error = new Error('پاسخ قبلی هنوز در حال آماده‌سازی است');
      error.status = 409;
      throw error;
    }

    const session = await this.getSession(userId, sessionId);
    pendingSessions.add(sessionId);

    try {
      const userMessageId = uuidv4();
      await db.query(
        `INSERT INTO chat_messages (id, session_id, role, content, model_used, status)
         VALUES (?, ?, 'user', ?, NULL, 'ok')`,
        [userMessageId, sessionId, question],
      );

      if (!session.title || session.title === 'گفتگو درباره جلسه' || session.title === 'گفتگو درباره همه جلسات') {
        const title = question.length > 60 ? `${question.slice(0, 57)}...` : question;
        await db.query(
          'UPDATE chat_sessions SET title = ?, last_message_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
          [title, sessionId, userId],
        );
      } else {
        await db.query(
          'UPDATE chat_sessions SET last_message_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
          [sessionId, userId],
        );
      }

      const context = session.scope === 'meeting'
        ? await buildMeetingContext(userId, session.meeting_id)
        : await buildAllMeetingsContext(userId);

      const history = [...(session.messages || []), { role: 'user', content: question }];
      const prompt = buildPrompt({
        scope: session.scope,
        contextText: context.contextText,
        history,
      });

      let assistantContent = '';
      let modelUsed = null;
      let status = 'ok';

      try {
        const answer = await this.callChatWebhook(prompt);
        assistantContent = answer.answer;
        modelUsed = answer.model || null;
      } catch (error) {
        status = 'error';
        assistantContent = error.message || 'پاسخ‌گویی ناموفق بود. دوباره تلاش کنید.';
      }

      const assistantMessageId = uuidv4();
      await db.query(
        `INSERT INTO chat_messages (id, session_id, role, content, model_used, status)
         VALUES (?, ?, 'assistant', ?, ?, ?)`,
        [assistantMessageId, sessionId, assistantContent, modelUsed, status],
      );
      await db.query(
        'UPDATE chat_sessions SET last_message_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [sessionId, userId],
      );

      const refreshed = await this.getSession(userId, sessionId);
      const userMessage = refreshed.messages.find((m) => m.id === userMessageId);
      const assistantMessage = refreshed.messages.find((m) => m.id === assistantMessageId);

      return {
        session: refreshed,
        userMessage,
        assistantMessage,
      };
    } finally {
      pendingSessions.delete(sessionId);
    }
  }

  async callChatWebhook({ system, messages }) {
    const url = getChatWebhookUrl();
    if (!url) {
      const error = new Error('آدرس وب‌هوک گفتگو تنظیم نشده است');
      error.status = 500;
      throw error;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': getInternalSecret(),
        },
        body: JSON.stringify({ system, messages }),
        signal: controller.signal,
      });

      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok || !body?.ok || !String(body?.answer || '').trim()) {
        const message = body?.error
          || (response.status === 502 ? 'مدل‌های هوش مصنوعی پاسخ ندادند' : `خطای وب‌هوک گفتگو (${response.status})`);
        const error = new Error(message);
        error.status = 502;
        throw error;
      }

      return {
        answer: String(body.answer).trim(),
        model: body.model || null,
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('پاسخ‌گویی طولانی شد، دوباره تلاش کنید');
        timeoutError.status = 504;
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = new ChatService();
