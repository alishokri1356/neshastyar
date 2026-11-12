const crypto = require('crypto');
const db = require('../config/database');
const authService = require('./authService');
const participantService = require('./participantService');
const {
  buildReportContent,
  parseMeetingSummaryJson,
  applyDecisionEdit,
  addDecisionRow,
  deleteDecisionRow,
  extractDecisions,
  setPeople,
  setLocation,
} = require('../utils/summaryUtils');

const MAX_DECISION_ROWS = 100;

const badRequest = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const forbidden = (message) => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};

const canEditShare = (row) => !row || Number(row.share_can_edit) !== 0;

const cleanText = (value, max) => {
  const text = String(value ?? '').replace(/\u0000/g, '').trim();
  if (text.length > max) {
    throw badRequest(`متن نباید بیشتر از ${max} نویسه باشد`);
  }
  return text;
};

const splitParticipantNames = (value) => {
  const seen = new Set();
  const names = [];
  for (const part of String(value ?? '').split(/[،,\n]+/)) {
    const name = part.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    if (name.length > 200) throw badRequest('نام حاضرین بیش از حد طولانی است');
    seen.add(key);
    names.push(name);
    if (names.length > 80) throw badRequest('تعداد حاضرین بیش از حد مجاز است');
  }
  return names;
};

const sameNameSet = (left, right) => {
  const norm = (list) => list.map((name) => name.trim().toLowerCase()).filter(Boolean).sort();
  const a = norm(left);
  const b = norm(right);
  return a.length === b.length && a.every((name, index) => name === b[index]);
};

class ReportService {
  shareReportUrl(token) {
    const base = (process.env.FRONTEND_URL || 'https://www.neshastyar.com').replace(/\/$/, '');
    return `${base}/report/${token}`;
  }

  createToken() {
    return crypto.randomBytes(24).toString('base64url');
  }

  async ensureShareToken(meetingId) {
    const rows = await db.query(
      'SELECT share_token, share_enabled FROM meetings WHERE id = ? LIMIT 1',
      [meetingId]
    );
    const meeting = rows[0];
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const enabled = Number(meeting.share_enabled) !== 0;
    if (meeting.share_token && enabled) {
      return meeting.share_token;
    }

    const token = this.createToken();
    await db.query(
      'UPDATE meetings SET share_token = ?, share_enabled = 1, updated_at = NOW() WHERE id = ?',
      [token, meetingId]
    );
    return token;
  }

  async readShareRow(meetingId) {
    const rows = await db.query(
      'SELECT share_token, share_enabled, share_can_edit FROM meetings WHERE id = ? LIMIT 1',
      [meetingId]
    );
    return rows[0] || null;
  }

  sharePayload(token, row) {
    return {
      token,
      url: this.shareReportUrl(token),
      enabled: true,
      canEdit: canEditShare(row),
    };
  }

  async enableShare(meetingId, userId) {
    const owned = await db.query(
      'SELECT id FROM meetings WHERE id = ? AND user_id = ? LIMIT 1',
      [meetingId, userId]
    );
    if (!owned[0]) {
      throw new Error('Meeting not found or access denied');
    }
    const token = await this.ensureShareToken(meetingId);
    const row = await this.readShareRow(meetingId);
    return this.sharePayload(token, row);
  }

  async setShareCanEdit(meetingId, userId, canEdit) {
    const owned = await db.query(
      'SELECT id FROM meetings WHERE id = ? AND user_id = ? LIMIT 1',
      [meetingId, userId]
    );
    if (!owned[0]) {
      throw new Error('Meeting not found or access denied');
    }
    const token = await this.ensureShareToken(meetingId);
    await db.query(
      'UPDATE meetings SET share_can_edit = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [canEdit ? 1 : 0, meetingId, userId]
    );
    const row = await this.readShareRow(meetingId);
    return this.sharePayload(token, row);
  }

  async disableShare(meetingId, userId) {
    const result = await db.query(
      'UPDATE meetings SET share_enabled = 0, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [meetingId, userId]
    );
    if (!result.affectedRows) {
      throw new Error('Meeting not found or access denied');
    }
    return { enabled: false };
  }

  async getPublicReport(token) {
    if (!token || typeof token !== 'string' || token.length > 64) return null;

    const rows = await db.query(
      `SELECT m.id, m.title, m.meeting_date, m.summary, m.location, m.user_id, m.share_can_edit,
              u.org_name, u.org_logo_path, u.updated_at AS user_updated_at
       FROM meetings m
       INNER JOIN users u ON u.id = m.user_id
       WHERE m.share_token = ? AND m.share_enabled = 1
       LIMIT 1`,
      [token]
    );
    const meeting = rows[0];
    if (!meeting) return null;

    const content = buildReportContent(meeting.summary, meeting.title);
    let participants = [];
    try {
      const people = await db.query(
        `SELECT p.name
         FROM participants p
         INNER JOIN meeting_participants mp ON p.id = mp.participant_id
         WHERE mp.meeting_id = ?
         ORDER BY p.name ASC`,
        [meeting.id]
      );
      participants = people.map((row) => row.name).filter(Boolean);
    } catch (error) {
      console.warn('Public report participants lookup failed:', error.message);
    }
    if (participants.length === 0) {
      participants = content.suggestedParticipants;
    } else if (sameNameSet(participants, content.suggestedParticipants)) {
      participants = content.suggestedParticipants;
    }

    return {
      title: content.title,
      meetingDate: meeting.meeting_date || null,
      participants,
      decisions: content.decisions,
      summaryText: content.summaryText,
      location: content.location != null ? content.location : (meeting.location || ''),
      canEdit: canEditShare(meeting),
      orgName: meeting.org_name || null,
      logoUrl: meeting.org_logo_path
        ? `/api/public/logos/${meeting.user_id}?v=${new Date(meeting.user_updated_at || 0).getTime()}`
        : null,
    };
  }

  async loadEditableMeeting(token) {
    if (!token || typeof token !== 'string' || token.length > 64) return null;
    const rows = await db.query(
      `SELECT id, user_id, title, summary, location, share_can_edit
       FROM meetings
       WHERE share_token = ? AND share_enabled = 1
       LIMIT 1`,
      [token]
    );
    return rows[0] || null;
  }

  async syncParticipantLinks(userId, meetingId, names) {
    const current = await db.query(
      `SELECT p.id, p.name
       FROM participants p
       INNER JOIN meeting_participants mp ON p.id = mp.participant_id
       WHERE mp.meeting_id = ?`,
      [meetingId]
    );
    const wanted = new Set(names.map((name) => name.toLowerCase()));
    for (const row of current) {
      if (!wanted.has(String(row.name || '').trim().toLowerCase())) {
        await db.query(
          'DELETE FROM meeting_participants WHERE meeting_id = ? AND participant_id = ?',
          [meetingId, row.id]
        );
      }
    }

    const linked = new Set(current.map((row) => String(row.name || '').trim().toLowerCase()));
    for (const name of names) {
      if (linked.has(name.toLowerCase())) continue;
      const participant = await participantService.upsertParticipantByName(userId, name);
      if (!participant) continue;
      const existing = await db.query(
        'SELECT id FROM meeting_participants WHERE meeting_id = ? AND participant_id = ? LIMIT 1',
        [meetingId, participant.id]
      );
      if (existing.length > 0) continue;
      await db.query(
        'INSERT INTO meeting_participants (id, meeting_id, participant_id) VALUES (?, ?, ?)',
        [authService.generateId(), meetingId, participant.id]
      );
      linked.add(name.toLowerCase());
    }
  }

  async updatePublicReport(token, edit) {
    const meeting = await this.loadEditableMeeting(token);
    if (!meeting) return null;
    if (!canEditShare(meeting)) {
      throw forbidden('ویرایش این صورتجلسه برای دارنده لینک بسته است');
    }

    const field = edit && edit.field;
    const parsed = parseMeetingSummaryJson(meeting.summary);
    const json = parsed || {
      Summary: typeof meeting.summary === 'string' ? meeting.summary.trim() : '',
    };
    let title = meeting.title;
    let location = meeting.location || '';
    let meetingDateSql;
    let writeSummary = false;

    if (field === 'title') {
      title = cleanText(edit.value, 300);
      if (!title) throw badRequest('عنوان جلسه نمی‌تواند خالی باشد');
      json.Subject = title;
      writeSummary = true;
    } else if (field === 'date') {
      const raw = String(edit.value ?? '').trim();
      if (!raw) {
        meetingDateSql = null;
      } else {
        const parsed = new Date(raw);
        if (Number.isNaN(parsed.getTime())) throw badRequest('تاریخ جلسه معتبر نیست');
        meetingDateSql = parsed.toISOString().slice(0, 19).replace('T', ' ');
      }
    } else if (field === 'location') {
      location = cleanText(edit.value, 500);
      setLocation(json, location);
      writeSummary = true;
    } else if (field === 'participants') {
      const names = splitParticipantNames(edit.value);
      setPeople(json, names);
      writeSummary = true;
      await this.syncParticipantLinks(meeting.user_id, meeting.id, names);
      await db.query(
        'UPDATE meetings SET people = ?, updated_at = NOW() WHERE id = ?',
        [names.length ? JSON.stringify(names) : null, meeting.id]
      );
    } else if (field === 'orgName') {
      const orgName = cleanText(edit.value, 255);
      await db.query(
        'UPDATE users SET org_name = ?, updated_at = NOW() WHERE id = ?',
        [orgName || null, meeting.user_id]
      );
    } else if (field === 'decision') {
      const index = Number(edit.index);
      const part = edit.part;
      if (!Number.isInteger(index) || index < 0) throw badRequest('ردیف تصمیم معتبر نیست');
      if (part !== 'text' && part !== 'assignee' && part !== 'deadline') {
        throw badRequest('بخش تصمیم معتبر نیست');
      }
      const updated = applyDecisionEdit(json, index, part, cleanText(edit.value, 2000));
      if (!updated) throw badRequest('این تصمیم پیدا نشد');
      writeSummary = true;
    } else if (field === 'addDecision') {
      if (extractDecisions(json).length >= MAX_DECISION_ROWS) {
        throw badRequest(`حداکثر ${MAX_DECISION_ROWS} ردیف تصمیم مجاز است`);
      }
      addDecisionRow(json);
      writeSummary = true;
    } else if (field === 'deleteDecision') {
      const index = Number(edit.index);
      if (!Number.isInteger(index) || index < 0) throw badRequest('ردیف تصمیم معتبر نیست');
      if (!deleteDecisionRow(json, index)) throw badRequest('این تصمیم پیدا نشد');
      writeSummary = true;
    } else {
      throw badRequest('این بخش قابل ویرایش نیست');
    }

    const fields = ['title = ?', 'updated_at = NOW()'];
    const params = [title || null];
    if (writeSummary) {
      fields.push('summary = ?');
      params.push(JSON.stringify(json));
    }
    if (field === 'location') {
      fields.push('location = ?');
      params.push(location || null);
    }
    if (meetingDateSql !== undefined) {
      fields.push('meeting_date = ?');
      params.push(meetingDateSql);
    }
    params.push(meeting.id);
    await db.query(`UPDATE meetings SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.getPublicReport(token);
  }
}

module.exports = new ReportService();
