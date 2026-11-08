const db = require('../config/database');
const {
  parseMeetingSummaryJson,
  getBulletPointsFromSummaryJson,
} = require('../utils/summaryUtils');

const MEETING_TRANSCRIPT_LIMIT = 100_000;
const ALL_MEETINGS_CONTEXT_LIMIT = 80_000;
const HISTORY_WINDOW = 12;
const RECENT_MEETINGS_LIMIT = 40;

function truncate(text, max) {
  const value = String(text || '');
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n\n[...متن کوتاه شد...]`;
}

function formatMeetingDate(raw) {
  if (!raw) return '';
  try {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return String(raw);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  } catch {
    return String(raw);
  }
}

function summarizeMeetingRow(meeting) {
  const parsed = parseMeetingSummaryJson(meeting.summary);
  const subject = parsed?.Subject || meeting.title || 'بدون عنوان';
  const summary = typeof parsed?.Summary === 'string'
    ? parsed.Summary
    : (typeof meeting.summary === 'string' ? meeting.summary : '');
  const bullets = getBulletPointsFromSummaryJson(parsed);
  return {
    id: meeting.id,
    title: meeting.title || subject,
    subject,
    date: formatMeetingDate(meeting.meeting_date || meeting.created_at),
    summary: summary.trim(),
    bullets,
  };
}

async function getMeetingOwned(userId, meetingId) {
  const rows = await db.query(
    `SELECT id, title, meeting_date, created_at, status, summary, transcription, CommentText
     FROM meetings
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [meetingId, userId],
  );
  return rows[0] || null;
}

async function buildMeetingContext(userId, meetingId) {
  const meeting = await getMeetingOwned(userId, meetingId);
  if (!meeting) {
    const error = new Error('جلسه پیدا نشد یا دسترسی ندارید');
    error.status = 404;
    throw error;
  }

  const participants = await db.query(
    `SELECT p.name
     FROM participants p
     INNER JOIN meeting_participants mp ON p.id = mp.participant_id
     WHERE mp.meeting_id = ?
     ORDER BY p.name ASC`,
    [meetingId],
  );
  const tags = await db.query(
    `SELECT t.name
     FROM tags t
     INNER JOIN meeting_tags mt ON t.id = mt.tag_id
     WHERE mt.meeting_id = ?
     ORDER BY t.name ASC`,
    [meetingId],
  );

  const info = summarizeMeetingRow(meeting);
  const lines = [
    `جلسه: ${info.title}`,
    info.date ? `تاریخ: ${info.date}` : null,
    participants.length ? `حاضرین: ${participants.map((p) => p.name).join('، ')}` : null,
    tags.length ? `برچسب‌ها: ${tags.map((t) => t.name).join('، ')}` : null,
    meeting.CommentText ? `توضیح کاربر: ${meeting.CommentText}` : null,
    info.subject ? `موضوع: ${info.subject}` : null,
    info.summary ? `خلاصه:\n${info.summary}` : null,
    info.bullets.length ? `نکات کلیدی:\n${info.bullets.map((b) => `- ${b}`).join('\n')}` : null,
    meeting.transcription
      ? `متن پیاده‌سازی شده جلسه:\n${truncate(meeting.transcription, MEETING_TRANSCRIPT_LIMIT)}`
      : 'متن پیاده‌سازی شده جلسه در دسترس نیست.',
  ].filter(Boolean);

  return {
    scope: 'meeting',
    meetingId,
    meetingTitle: info.title,
    contextText: lines.join('\n\n'),
  };
}

async function buildAllMeetingsContext(userId) {
  const meetings = await db.query(
    `SELECT id, title, meeting_date, created_at, summary, status
     FROM meetings
     WHERE user_id = ?
       AND summary IS NOT NULL
       AND TRIM(summary) <> ''
     ORDER BY COALESCE(meeting_date, created_at) DESC
     LIMIT ?`,
    [userId, RECENT_MEETINGS_LIMIT],
  );

  if (!meetings.length) {
    return {
      scope: 'all',
      meetingId: null,
      meetingTitle: null,
      contextText: 'هیچ جلسه پردازش‌شده‌ای برای این کاربر پیدا نشد.',
    };
  }

  const chunks = [];
  let total = 0;
  for (const meeting of meetings) {
    const info = summarizeMeetingRow(meeting);
    const block = [
      `### جلسه: ${info.title}`,
      info.date ? `تاریخ: ${info.date}` : null,
      info.subject ? `موضوع: ${info.subject}` : null,
      info.summary ? `خلاصه: ${info.summary}` : null,
      info.bullets.length ? `نکات: ${info.bullets.join(' | ')}` : null,
    ].filter(Boolean).join('\n');

    if (total + block.length > ALL_MEETINGS_CONTEXT_LIMIT) break;
    chunks.push(block);
    total += block.length + 2;
  }

  return {
    scope: 'all',
    meetingId: null,
    meetingTitle: null,
    contextText: [
      'لیست جلسات اخیر کاربر (از جدید به قدیم):',
      ...chunks,
    ].join('\n\n'),
  };
}

function buildPrompt({ scope, contextText, history }) {
  const scopeLine = scope === 'meeting'
    ? 'کاربر درباره یک جلسه مشخص سؤال می‌پرسد. فقط از اطلاعات همان جلسه استفاده کن.'
    : 'کاربر درباره همه جلساتش سؤال می‌پرسد. فقط از فهرست جلسات داده‌شده استفاده کن و اگر به جلسه‌ای اشاره کردی نام و تاریخ آن را بگو.';

  const system = [
    'تو دستیار هوشمند نشست‌یار هستی.',
    'فقط به زبان فارسی پاسخ بده.',
    'فقط بر اساس اطلاعات زمینه‌ای که به تو داده می‌شود جواب بده. چیزی را حدس نزن.',
    'اگر پاسخ در اطلاعات موجود نیست، صریح بگو که نمی‌دانی.',
    'پاسخ را کوتاه، واضح و مفید بنویس.',
    scopeLine,
    '',
    '# زمینه',
    contextText || 'زمینه‌ای موجود نیست.',
  ].join('\n');

  const recent = (history || [])
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && String(m.content || '').trim())
    .slice(-HISTORY_WINDOW)
    .map((m) => ({
      role: m.role,
      content: String(m.content).trim(),
    }));

  return { system, messages: recent };
}

module.exports = {
  buildMeetingContext,
  buildAllMeetingsContext,
  buildPrompt,
  truncate,
  HISTORY_WINDOW,
  MEETING_TRANSCRIPT_LIMIT,
  ALL_MEETINGS_CONTEXT_LIMIT,
};
