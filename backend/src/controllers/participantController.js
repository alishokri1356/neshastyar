const meetingService = require('../services/meetingService');

class ParticipantController {
  async renameParticipant(req, res) {
    try {
      const userId = req.user?.sub;
      const { oldName, newName } = req.body || {};

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication is required',
        });
      }

      if (!oldName || !newName) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Both old and new participant names are required',
        });
      }

      const result = await meetingService.renameParticipant(userId, oldName, newName);

      return res.json({
        updatedMeetings: result.updatedMeetings,
      });
    } catch (error) {
      const status =
        error.message === 'Both old and new participant names are required' ||
        error.message === 'User ID is required'
          ? 400
          : 500;

      console.error('Rename participant error:', error);
      return res.status(status).json({
        error: 'Failed to rename participant',
        message: error.message || 'An unexpected error occurred while renaming the participant',
      });
    }
  }
}

module.exports = new ParticipantController();
