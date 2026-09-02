const meetingService = require('../services/meetingService');

class MeetingController {
  // GET /api/meetings
  async getMeetings(req, res) {
    try {
      // Get user ID from JWT token or query parameter
      const userId = req.user?.sub || req.query.user_id;
      
      if (!userId) {
        return res.status(400).json({
          error: 'User ID required',
          message: 'User ID is required to fetch meetings'
        });
      }

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
      // Get user ID from JWT token or request body
      const userId = req.user?.sub || req.body.user_id;
      
      if (!userId) {
        return res.status(400).json({
          error: 'User ID required',
          message: 'User ID is required to create meeting'
        });
      }

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
      const userId = req.user?.sub || req.query.user_id;

      if (!userId) {
        return res.status(400).json({
          error: 'User ID required',
          message: 'User ID is required to fetch untagged meetings'
        });
      }

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

  // POST /api/meetings/:id/analyze
  async triggerAnalyze(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;

      const result = await meetingService.triggerAnalyze(id, userId);

      res.json(result);
    } catch (error) {
      console.error('Trigger analyze error:', error);

      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          error: 'Meeting not found',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Failed to trigger analysis',
        message: error.message || 'An error occurred while requesting meeting analysis',
      });
    }
  }

  // PUT /api/meetings/:id/participants/rename-suggested
  async renameSuggestedParticipantInMeeting(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;
      const { oldName, newName } = req.body || {};

      if (!oldName || !newName) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Both old and new participant names are required',
        });
      }

      const meeting = await meetingService.renameSuggestedParticipantInMeeting(
        id,
        userId,
        oldName,
        newName
      );

      return res.json(meeting);
    } catch (error) {
      const status =
        error.message === 'Both old and new participant names are required' ||
        error.message === 'User ID is required'
          ? 400
          : error.message === 'Meeting not found'
            ? 404
            : 500;

      console.error('Rename suggested participant error:', error);
      return res.status(status).json({
        error: 'Failed to rename participant',
        message: error.message || 'An unexpected error occurred while renaming the participant',
      });
    }
  }

}

module.exports = new MeetingController();
