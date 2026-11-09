const db = require('../config/database');
const tagService = require('./tagService');
const meetingTagService = require('./meetingTagService');
const meetingParticipantService = require('./meetingParticipantService');
const {
  parseMeetingSummaryJson,
  formatBulletPoint,
  extractLocation,
  setLocation,
} = require('../utils/summaryUtils');
const { tehranJalaliToUtcDate, utcDateToTehranJalali } = require('../utils/jalali');

const MAX_PROMPT_LENGTH = 2000;
const MAX_TRANSCRIPT_LENGTH = 60_000;
const AI_EDITOR_TIMEOUT_MS = 280_000;
const BULLET_KEYS = ['Bolet Points', 'Bullet Points'];
const PEOPLE_KEYS = ['People in meetings', 'People in Meetings', 'participants', 'Participants'];
const TAG_KEYS = ['Tags', 'tags'];
const pendingMeetings = new Set();

function getAiEditorWebhookUrl() {
  return process.env.AI_EDITOR_WEBHOOK_URL || '';
}

function getInternalSecret() {
  return process.env.INTERNAL_WEBHOOK_SECRET || process.env.N8N_WEBHOOK_SECRET || '';
}

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function stringList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item : item == null ? '' : String(item)))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function uniqueNames(names) {
  const seen = new Set();
  const result = [];
  for (const name of stringList(names)) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }
  return result;
}

function firstList(json, keys) {
  for (const key of keys) {
    if (Array.isArray(json[key])) return json[key];
  }
  return [];
}

function bulletKey(json) {
  return BULLET_KEYS.find((key) => Array.isArray(json[key])) || BULLET_KEYS[0];
}

function truncate(text, max) {
  const value = String(text || '');
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n\n[...متن کوتاه شد...]`;
}

function formatJalali(parts) {
  if (!parts) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${parts.year}/${pad(parts.month)}/${pad(parts.day)} ${pad(parts.hour)}:${pad(parts.minute)}`;
}

async function loadMeetingState(userId, meetingId) {
  const rows = await db.query('SELECT * FROM meetings WHERE id = ? AND user_id = ? LIMIT 1', [
    meetingId,
    userId,
  ]);
  const meeting = rows[0];
  if (!meeting) throw httpError('جلسه پیدا نشد یا دسترسی ندارید', 404);

  const [participants, tags] = await Promise.all([
    meetingParticipantService.getParticipantsForMeeting(meetingId, userId),
    meetingTagService.getTagsForMeeting(meetingId, userId),
  ]);

  const parsed = parseMeetingSummaryJson(meeting.summary);
  const summaryJson = parsed || {};
  const rawBullets = firstList(summaryJson, BULLET_KEYS);

  return {
    meeting,
    participants,
    tags,
    summaryIsJson: Boolean(parsed),
    summaryJson,
    rawBullets,
    current: {
      title: cleanText(meeting.title),
      subject: cleanText(summaryJson.Subject),
      location: cleanText(extractLocation(summaryJson) ?? meeting.location ?? ''),
      summary: parsed
        ? cleanText(summaryJson.Summary)
        : cleanText(meeting.summary),
      bullet_points: rawBullets.map(formatBulletPoint).filter((item) => item.length > 0),
      participants: uniqueNames(participants.map((p) => p.name)),
      tags: uniqueNames(tags.map((t) => t.name)),
      suggested_participants: uniqueNames(firstList(summaryJson, PEOPLE_KEYS)),
      suggested_tags: uniqueNames(firstList(summaryJson, TAG_KEYS)),
    },
  };
}

function buildPrompt(state, instruction, now = new Date()) {
  const { meeting, current } = state;
  const meetingDate = meeting.meeting_date || meeting.created_at;
  const meetingJalali = meetingDate ? utcDateToTehranJalali(meetingDate) : null;
  const nowJalali = utcDateToTehranJalali(now);

  const system = [
    'You are the AI meeting editor of Neshastyar, a Persian meeting-minutes app.',
    'You receive the current details of ONE meeting, its transcript, and an edit instruction from the user (usually in Persian).',
    'Apply ONLY the changes the user asks for and return the full, final state of the meeting.',
    'Rules:',
    '- Copy every field the user did not ask to change exactly as given. Never rewrite, shorten, translate, or reformat untouched text.',
    '- Keep all text in Persian unless the user explicitly asks otherwise.',
    '- "participants" is the final list of approved attendees and "tags" is the final list of approved tags. Add, remove, or rename entries only when asked. Suggested participants and tags may be used when the user refers to them.',
    '- Use the transcript only as a source of facts when the instruction needs it (for example "fix the summary based on what was said" or "add everyone who spoke"). Do not invent facts.',
    '- "meeting_date": return null when the date/time should not change. Otherwise return the new date in the Jalali (Shamsi) calendar, Tehran local time, as {"year":1405,"month":8,"day":15,"hour":16,"minute":0}. Resolve relative dates such as "yesterday" or "next Sunday" from the current date given below. If the user gives a Gregorian date, convert it to Jalali.',
    '- "changes_summary": one short Persian sentence describing what you changed, or saying that nothing could be changed.',
    'Respond with ONLY a JSON object (no markdown, no explanations) with exactly these keys:',
    '{"title": string, "subject": string, "location": string, "summary": string, "bullet_points": string[], "participants": string[], "tags": string[], "meeting_date": object|null, "changes_summary": string}',
  ].join('\n');

  const payload = {
    instruction,
    now_tehran: {
      jalali: formatJalali(nowJalali),
      gregorian: now.toISOString(),
    },
    meeting: {
      title: current.title,
      meeting_date: meetingJalali
        ? { ...meetingJalali, text: formatJalali(meetingJalali) }
        : null,
      subject: current.subject,
      location: current.location,
      summary: current.summary,
      bullet_points: current.bullet_points,
      participants: current.participants,
      tags: current.tags,
      suggested_participants: current.suggested_participants,
      suggested_tags: current.suggested_tags,
      user_comment: cleanText(meeting.CommentText) || null,
    },
    transcript: truncate(meeting.transcription, MAX_TRANSCRIPT_LENGTH) || null,
  };

  return { system, user: JSON.stringify(payload, null, 2) };
}

function normalizeEdited(edited, current) {
  const pick = (key) => (typeof edited[key] === 'string' ? edited[key].trim() : current[key]);
  return {
    title: pick('title'),
    subject: pick('subject'),
    location: pick('location'),
    summary: pick('summary'),
    bullet_points: Array.isArray(edited.bullet_points)
      ? stringList(edited.bullet_points)
      : current.bullet_points,
    participants: Array.isArray(edited.participants)
      ? uniqueNames(edited.participants)
      : current.participants,
    tags: Array.isArray(edited.tags) ? uniqueNames(edited.tags) : current.tags,
    meeting_date: edited.meeting_date && typeof edited.meeting_date === 'object'
      ? tehranJalaliToUtcDate(edited.meeting_date)
      : null,
    changes_summary: cleanText(edited.changes_summary),
  };
}

function sameList(a, b) {
  return a.length === b.length && a.every((item, i) => item === b[i]);
}

/** Keeps original bullet objects for unchanged lines so structured decisions are not flattened. */
function mergeBullets(rawBullets, nextBullets) {
  const byText = new Map();
  rawBullets.forEach((raw) => {
    const text = formatBulletPoint(raw);
    if (text && !byText.has(text)) byText.set(text, raw);
  });
  return nextBullets.map((text) => (byText.has(text) ? byText.get(text) : text));
}

function toMySQLDateTime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function persistMeetingFields(userId, meetingId, state, next) {
  const { current } = state;
  const updates = [];
  const values = [];

  if (next.title && next.title !== current.title) {
    updates.push('title = ?');
    values.push(next.title);
  }

  if (next.meeting_date) {
    updates.push('meeting_date = ?');
    values.push(toMySQLDateTime(next.meeting_date));
  }

  const summaryChanged = next.subject !== current.subject
    || next.location !== current.location
    || next.summary !== current.summary
    || !sameList(next.bullet_points, current.bullet_points);

  if (summaryChanged) {
    const json = state.summaryIsJson ? { ...state.summaryJson } : {};
    json.Subject = next.subject;
    json.Summary = next.summary;
    setLocation(json, next.location);
    const key = bulletKey(json);
    json[key] = mergeBullets(state.rawBullets, next.bullet_points);
    for (const other of BULLET_KEYS) {
      if (other !== key) delete json[other];
    }
    if (!state.summaryIsJson) {
      json['People in meetings'] = [];
      json.Tags = [];
    }
    updates.push('summary = ?', 'location = ?');
    values.push(JSON.stringify(json), next.location || null);
  }

  if (!updates.length) return false;

  updates.push('updated_at = NOW()');
  await db.query(
    `UPDATE meetings SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    [...values, meetingId, userId],
  );
  return true;
}

async function syncParticipants(userId, meetingId, linked, desiredNames) {
  const desired = new Set(desiredNames.map((name) => name.toLowerCase()));
  const linkedNames = new Set();
  let changed = false;

  for (const participant of linked) {
    const key = String(participant.name || '').trim().toLowerCase();
    linkedNames.add(key);
    if (!desired.has(key)) {
      await meetingParticipantService.removeParticipantFromMeeting(userId, meetingId, participant.id);
      changed = true;
    }
  }

  for (const name of desiredNames) {
    if (linkedNames.has(name.toLowerCase())) continue;
    try {
      await meetingParticipantService.addParticipantByNameToMeeting(userId, meetingId, name);
      changed = true;
    } catch (error) {
      if (!String(error.message || '').includes('already exists')) throw error;
    }
  }

  return changed;
}

async function findOrCreateTag(userId, name) {
  const rows = await db.query(
    'SELECT * FROM tags WHERE user_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1',
    [userId, name],
  );
  if (rows[0]) return rows[0];
  return tagService.createTag(userId, { name });
}

async function syncTags(userId, meetingId, linked, desiredNames) {
  const desired = new Set(desiredNames.map((name) => name.toLowerCase()));
  const linkedNames = new Set();
  let changed = false;

  for (const tag of linked) {
    const key = String(tag.name || '').trim().toLowerCase();
    linkedNames.add(key);
    if (!desired.has(key)) {
      await meetingTagService.deleteMeetingTag(userId, meetingId, tag.id);
      changed = true;
    }
  }

  for (const name of desiredNames) {
    if (linkedNames.has(name.toLowerCase())) continue;
    const tag = await findOrCreateTag(userId, name);
    try {
      await meetingTagService.createMeetingTag(userId, meetingId, tag.id);
      changed = true;
    } catch (error) {
      if (!String(error.message || '').includes('already exists')) throw error;
    }
  }

  return changed;
}

async function callAiEditorWebhook({ system, user }) {
  const url = getAiEditorWebhookUrl();
  if (!url) throw httpError('آدرس وب‌هوک ویرایشگر هوشمند تنظیم نشده است', 500);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_EDITOR_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': getInternalSecret(),
      },
      body: JSON.stringify({ system, user }),
      signal: controller.signal,
    });

    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok || !body?.ok || !body?.edited || typeof body.edited !== 'object') {
      const message = response.status === 502 || body?.error
        ? 'مدل‌های هوش مصنوعی نتوانستند جلسه را ویرایش کنند. دوباره تلاش کنید.'
        : `خطای وب‌هوک ویرایشگر هوشمند (${response.status})`;
      throw httpError(message, 502);
    }

    return { edited: body.edited, model: body.model || null };
  } catch (error) {
    if (error.name === 'AbortError') {
      throw httpError('ویرایش هوشمند طولانی شد، دوباره تلاش کنید', 504);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

class AiEditorService {
  async editMeeting(userId, meetingId, prompt) {
    const instruction = String(prompt || '').trim();
    if (!instruction) throw httpError('درخواست ویرایش خالی است', 400);
    if (instruction.length > MAX_PROMPT_LENGTH) {
      throw httpError(`درخواست ویرایش نباید بیشتر از ${MAX_PROMPT_LENGTH} کاراکتر باشد`, 400);
    }
    if (pendingMeetings.has(meetingId)) {
      throw httpError('ویرایش قبلی این جلسه هنوز در حال انجام است', 409);
    }

    pendingMeetings.add(meetingId);
    try {
      const state = await loadMeetingState(userId, meetingId);
      const { edited, model } = await callAiEditorWebhook(buildPrompt(state, instruction));
      const next = normalizeEdited(edited, state.current);

      await persistMeetingFields(userId, meetingId, state, next);
      await syncParticipants(userId, meetingId, state.participants, next.participants);
      await syncTags(userId, meetingId, state.tags, next.tags);

      const [meetingRows, participants, tags] = await Promise.all([
        db.query('SELECT * FROM meetings WHERE id = ? AND user_id = ? LIMIT 1', [meetingId, userId]),
        meetingParticipantService.getParticipantsForMeeting(meetingId, userId),
        meetingTagService.getTagsForMeeting(meetingId, userId),
      ]);

      return {
        meeting: meetingRows[0],
        participants,
        tags,
        model_used: model,
        changes_summary: next.changes_summary || null,
      };
    } finally {
      pendingMeetings.delete(meetingId);
    }
  }
}

module.exports = new AiEditorService();
module.exports.buildPrompt = buildPrompt;
module.exports.normalizeEdited = normalizeEdited;
module.exports.mergeBullets = mergeBullets;
