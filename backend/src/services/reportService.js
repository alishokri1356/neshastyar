const crypto = require('crypto');
const db = require('../config/database');
const { buildReportContent } = require('../utils/summaryUtils');

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

  async enableShare(meetingId, userId) {
    const owned = await db.query(
      'SELECT id FROM meetings WHERE id = ? AND user_id = ? LIMIT 1',
      [meetingId, userId]
    );
    if (!owned[0]) {
      throw new Error('Meeting not found or access denied');
    }
    const token = await this.ensureShareToken(meetingId);
    return {
      token,
      url: this.shareReportUrl(token),
      enabled: true,
    };
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
      `SELECT m.id, m.title, m.meeting_date, m.summary, m.user_id,
              u.org_name, u.org_logo_path
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
    }

    return {
      title: content.title,
      meetingDate: meeting.meeting_date || null,
      participants,
      decisions: content.decisions,
      summaryText: content.summaryText,
      orgName: meeting.org_name || null,
      logoUrl: meeting.org_logo_path ? `/api/public/logos/${meeting.user_id}` : null,
    };
  }
}

module.exports = new ReportService();
