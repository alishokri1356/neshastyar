const meetingTagService = require('../services/meetingTagService');

class MeetingTagController {
  // GET /api/meeting-tags
  async getMeetingTags(req, res) {
    try {
      const userId = req.user.sub;
      const { meeting_id, tag_id } = req.query;

      const options = {};
      if (meeting_id) options.meeting_id = meeting_id;
      if (tag_id) options.tag_id = tag_id;

      const meetingTags = await meetingTagService.getMeetingTags(userId, options);

      res.json(meetingTags);
    } catch (error) {
      console.error('Get meeting tags error:', error);
      res.status(500).json({
        error: 'Failed to fetch meeting tags',
        message: 'An error occurred while fetching meeting tags'
      });
    }
  }

  // POST /api/meeting-tags
  async createMeetingTag(req, res) {
    try {
      const userId = req.user.sub;
      const { meeting_id, tag_id } = req.body;

      if (!meeting_id || !tag_id) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'meeting_id and tag_id are required'
        });
      }

      const meetingTag = await meetingTagService.createMeetingTag(userId, meeting_id, tag_id);

      res.status(201).json(meetingTag);
    } catch (error) {
      console.error('Create meeting tag error:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'Relationship already exists',
          message: error.message
        });
      }

      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          error: 'Resource not found',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Failed to create meeting tag',
        message: 'An error occurred while creating the meeting tag relationship'
      });
    }
  }

  // DELETE /api/meeting-tags/:id
  async deleteMeetingTagById(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;

      const success = await meetingTagService.deleteMeetingTagById(userId, id);
      if (!success) {
        return res.status(404).json({
          error: 'Meeting tag not found',
          message: 'Meeting tag relationship not found or access denied'
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Delete meeting tag error:', error);
      res.status(500).json({
        error: 'Failed to delete meeting tag',
        message: 'An error occurred while deleting the meeting tag relationship'
      });
    }
  }

  // DELETE /api/meeting-tags
  async deleteMeetingTag(req, res) {
    try {
      const userId = req.user.sub;
      const { meeting_id, tag_id } = req.query;

      if (!meeting_id || !tag_id) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'meeting_id and tag_id query parameters are required'
        });
      }

      const success = await meetingTagService.deleteMeetingTag(userId, meeting_id, tag_id);
      if (!success) {
        return res.status(404).json({
          error: 'Meeting tag not found',
          message: 'Meeting tag relationship not found or access denied'
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Delete meeting tag error:', error);
      res.status(500).json({
        error: 'Failed to delete meeting tag',
        message: 'An error occurred while deleting the meeting tag relationship'
      });
    }
  }

  // GET /api/meeting-tags/meetings/:meetingId/tags
  async getTagsForMeeting(req, res) {
    try {
      const userId = req.user.sub;
      const { meetingId } = req.params;

      const tags = await meetingTagService.getTagsForMeeting(meetingId, userId);

      res.json(tags);
    } catch (error) {
      console.error('Get tags for meeting error:', error);
      res.status(500).json({
        error: 'Failed to fetch tags',
        message: 'An error occurred while fetching tags for this meeting'
      });
    }
  }

  // GET /api/meeting-tags/tags/:tagId/meetings
  async getMeetingsForTag(req, res) {
    try {
      const userId = req.user.sub;
      const { tagId } = req.params;

      const meetings = await meetingTagService.getMeetingsForTag(tagId, userId);

      res.json(meetings);
    } catch (error) {
      console.error('Get meetings for tag error:', error);
      res.status(500).json({
        error: 'Failed to fetch meetings',
        message: 'An error occurred while fetching meetings for this tag'
      });
    }
  }
}

module.exports = new MeetingTagController();
