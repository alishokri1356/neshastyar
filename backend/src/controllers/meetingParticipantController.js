const meetingParticipantService = require('../services/meetingParticipantService');

class MeetingParticipantController {
  async getParticipantsForMeeting(req, res) {
    try {
      const userId = req.user.sub;
      const { meetingId } = req.params;

      const participants = await meetingParticipantService.getParticipantsForMeeting(
        meetingId,
        userId
      );

      res.json(participants);
    } catch (error) {
      console.error('Get participants for meeting error:', error);
      res.status(500).json({
        error: 'Failed to fetch participants',
        message: 'An error occurred while fetching participants for this meeting',
      });
    }
  }

  async createMeetingParticipant(req, res) {
    try {
      const userId = req.user.sub;
      const { meeting_id, participant_id, name } = req.body;

      if (!meeting_id) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'meeting_id is required',
        });
      }

      let relationship;

      if (name && !participant_id) {
        relationship = await meetingParticipantService.addParticipantByNameToMeeting(
          userId,
          meeting_id,
          name
        );
      } else if (participant_id) {
        relationship = await meetingParticipantService.addParticipantToMeeting(
          userId,
          meeting_id,
          participant_id
        );
      } else {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'participant_id or name is required',
        });
      }

      const participants = await meetingParticipantService.getParticipantsForMeeting(
        meeting_id,
        userId
      );

      res.status(201).json({ relationship, participants });
    } catch (error) {
      console.error('Create meeting participant error:', error);

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          error: 'Relationship already exists',
          message: error.message,
        });
      }

      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          error: 'Resource not found',
          message: error.message,
        });
      }

      res.status(500).json({
        error: 'Failed to create meeting participant',
        message: error.message,
      });
    }
  }

  async deleteMeetingParticipant(req, res) {
    try {
      const userId = req.user.sub;
      const { meeting_id, participant_id } = req.query;

      if (!meeting_id || !participant_id) {
        return res.status(400).json({
          error: 'Missing required parameters',
          message: 'meeting_id and participant_id query parameters are required',
        });
      }

      await meetingParticipantService.removeParticipantFromMeeting(
        userId,
        meeting_id,
        participant_id
      );

      const participants = await meetingParticipantService.getParticipantsForMeeting(
        meeting_id,
        userId
      );

      res.json({ success: true, participants });
    } catch (error) {
      console.error('Delete meeting participant error:', error);
      res.status(500).json({
        error: 'Failed to delete meeting participant',
        message: error.message,
      });
    }
  }

  async deleteMeetingParticipantById(req, res) {
    try {
      const userId = req.user.sub;
      const { id } = req.params;

      await meetingParticipantService.removeParticipantFromMeetingById(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete meeting participant by id error:', error);
      res.status(500).json({
        error: 'Failed to delete meeting participant',
        message: error.message,
      });
    }
  }
}

module.exports = new MeetingParticipantController();
