const db = require('../config/database');

class MeetingSyncService {
  async getMeetingById(meetingId) {
    const meetings = await db.query('SELECT * FROM meetings WHERE id = ?', [meetingId]);
    return meetings[0] || null;
  }

  async syncMeetingDataFromSummary(meetingId) {
    const meeting = await this.getMeetingById(meetingId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Suggestions are already written to meetings.summary and meetings.people by n8n.
    // Approved participants/tags are managed separately via meeting_participants and meeting_tags.
    return {
      meetingId,
      userId: meeting.user_id,
      participants: { skipped: true },
      tags: { skipped: true },
    };
  }
}

module.exports = new MeetingSyncService();
