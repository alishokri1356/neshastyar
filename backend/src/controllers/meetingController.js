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

      console.log('Fetching meetings for user:', userId, 'with options:', options);
      const meetings = await meetingService.getMeetings(userId, options);
      console.log('Found meetings:', meetings.length);

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

      console.log('Creating meeting for user:', userId, 'with data:', meetingData);
      const meeting = await meetingService.createMeeting(userId, meetingData);
      console.log('Created meeting:', meeting.id);

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

  // POST /api/meetings/create-sample - Create sample meetings for testing
  async createSampleMeetings(req, res) {
    try {
      const userId = req.user?.sub || req.body.user_id;
      
      if (!userId) {
        return res.status(400).json({
          error: 'User ID required',
          message: 'User ID is required to create sample meetings'
        });
      }

      const sampleMeetings = [
        {
          title: 'جلسه تیم توسعه',
          audio_file_name: 'team-meeting-1.wav',
          summary: 'بحث در مورد پیشرفت پروژه\nبررسی مشکلات فنی\nبرنامه‌ریزی برای هفته آینده',
          status: 'Done',
          audio_duration: 1800, // 30 minutes
          meeting_date: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        },
        {
          title: 'مشاوره با مشتری',
          audio_file_name: 'client-consultation.wav',
          summary: 'بررسی نیازهای مشتری\nپیشنهاد راه‌حل‌ها\nتوافق بر روی قیمت',
          status: 'Need Review',
          audio_duration: 2400, // 40 minutes
          meeting_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        {
          title: 'جلسه هفتگی',
          audio_file_name: 'weekly-meeting.wav',
          summary: 'بررسی عملکرد هفته گذشته\nاهداف هفته آینده\nهماهنگی تیم',
          status: 'On Process',
          audio_duration: 1200, // 20 minutes
          meeting_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 1 week ago
        }
      ];

      const createdMeetings = [];
      for (const meetingData of sampleMeetings) {
        const meeting = await meetingService.createMeeting(userId, meetingData);
        createdMeetings.push(meeting);
      }

      console.log('Created sample meetings for user:', userId);
      res.status(201).json({
        message: 'Sample meetings created successfully',
        meetings: createdMeetings
      });
    } catch (error) {
      console.error('Create sample meetings error:', error);
      res.status(500).json({
        error: 'Failed to create sample meetings',
        message: 'An error occurred while creating sample meetings'
      });
    }
  }
}

module.exports = new MeetingController();
