const meetingService = require('../services/meetingService');

class MeetingController {
  // GET /api/meetings
  async getMeetings(req, res) {
    try {
      const userId = req.user.sub;
      const { status, limit, orderBy, orderDirection } = req.query;

      const options = {};
      if (status) options.status = status;
      if (limit) options.limit = parseInt(limit);
      if (orderBy) options.orderBy = orderBy;
      if (orderDirection) options.orderDirection = orderDirection;

      const meetings = await meetingService.getMeetings(userId, options);

      res.json(meetings);
    } catch (error) {
      console.error('Get meetings error:', error);
      res.status(500).json({
        error: 'Failed to fetch meetings',
        message: 'An error occurred while fetching meetings'
      });
    }
  }

  // GET /api/meetings/:id
  async getMeetingById(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;

      const meeting = await meetingService.getMeetingById(id, userId);
      if (!meeting) {
        return res.status(404).json({
          error: 'Meeting not found',
          message: 'Meeting not found or access denied'
        });
      }

      res.json(meeting);
    } catch (error) {
      console.error('Get meeting error:', error);
      res.status(500).json({
        error: 'Failed to fetch meeting',
        message: 'An error occurred while fetching the meeting'
      });
    }
  }

  // POST /api/meetings
  async createMeeting(req, res) {
    try {
      const userId = req.user.sub;
      const meetingData = req.body;

      const meeting = await meetingService.createMeeting(userId, meetingData);

      res.status(201).json(meeting);
    } catch (error) {
      console.error('Create meeting error:', error);
      res.status(500).json({
        error: 'Failed to create meeting',
        message: 'An error occurred while creating the meeting'
      });
    }
  }

  // PUT /api/meetings/:id
  async updateMeeting(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;
      const updates = req.body;

      const meeting = await meetingService.updateMeeting(id, userId, updates);
      if (!meeting) {
        return res.status(404).json({
          error: 'Meeting not found',
          message: 'Meeting not found or access denied'
        });
      }

      res.json(meeting);
    } catch (error) {
      console.error('Update meeting error:', error);
      res.status(500).json({
        error: 'Failed to update meeting',
        message: 'An error occurred while updating the meeting'
      });
    }
  }

  // DELETE /api/meetings/:id
  async deleteMeeting(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;

      const success = await meetingService.deleteMeeting(id, userId);
      if (!success) {
        return res.status(404).json({
          error: 'Meeting not found',
          message: 'Meeting not found or access denied'
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Delete meeting error:', error);
      res.status(500).json({
        error: 'Failed to delete meeting',
        message: 'An error occurred while deleting the meeting'
      });
    }
  }

  // GET /api/meetings/untagged
  async getUntaggedMeetings(req, res) {
    try {
      const userId = req.user.sub;

      const meetings = await meetingService.getUntaggedMeetings(userId);

      res.json(meetings);
    } catch (error) {
      console.error('Get untagged meetings error:', error);
      res.status(500).json({
        error: 'Failed to fetch untagged meetings',
        message: 'An error occurred while fetching untagged meetings'
      });
    }
  }
}

module.exports = new MeetingController();
