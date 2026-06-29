const db = require('../config/database');
const meetingParticipantService = require('./meetingParticipantService');
const meetingTagService = require('./meetingTagService');
const tagService = require('./tagService');
const {
  safeJsonParse,
  normalizeAndFilterNames,
  extractParticipantsFromMeeting,
} = require('../utils/participantUtils');

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

    const userId = meeting.user_id;

    const participantResult = await meetingParticipantService.syncParticipantsFromSummary(
      meetingId,
      userId
    );

    const tagResult = await this.syncTagsFromSummary(meetingId, userId, meeting);

    return {
      meetingId,
      userId,
      participants: participantResult,
      tags: tagResult,
    };
  }

  async syncTagsFromSummary(meetingId, userId, meetingRow = null) {
    const meeting = meetingRow || (await this.getMeetingById(meetingId));

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const summaryData = safeJsonParse(meeting.summary);
    const tagNames = normalizeAndFilterNames(summaryData?.Tags);

    const personNames = new Set(
      extractParticipantsFromMeeting(meeting).map((name) => name.toLowerCase().trim())
    );

    let linked = 0;
    let skippedAsPerson = 0;
    let alreadyLinked = 0;

    for (const tagName of tagNames) {
      if (personNames.has(tagName.toLowerCase().trim())) {
        skippedAsPerson += 1;
        continue;
      }

      let tag = await tagService.getTagByName(userId, tagName);
      if (!tag) {
        tag = await tagService.createTag(userId, { name: tagName });
      }

      try {
        await meetingTagService.createMeetingTag(userId, meetingId, tag.id);
        linked += 1;
      } catch (error) {
        if (error.message.includes('already exists')) {
          alreadyLinked += 1;
          continue;
        }
        throw error;
      }
    }

    return {
      tagCount: tagNames.length,
      linked,
      alreadyLinked,
      skippedAsPerson,
    };
  }
}

module.exports = new MeetingSyncService();
