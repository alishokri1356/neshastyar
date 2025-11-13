const meetingService = require('../services/meetingService');

class ParticipantController {
  async listParticipants(req, res) {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication is required',
        });
      }

      const data = await meetingService.getParticipants(userId);
      return res.json(data);
    } catch (error) {
      console.error('List participants error:', error);
      return res.status(500).json({
        error: 'Failed to fetch participants',
        message: error.message || 'An unexpected error occurred while fetching participants',
      });
    }
  }

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

  async mergeParticipants(req, res) {
    try {
      const userId = req.user?.sub;
      const { sourceNames, targetName } = req.body || {};

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication is required',
        });
      }

      if (!Array.isArray(sourceNames) || sourceNames.length < 2) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'At least two participant names are required to merge',
        });
      }

      const trimmedSources = Array.from(
        new Set(
          sourceNames
            .map((name) => (typeof name === 'string' ? name.trim() : ''))
            .filter((name) => name.length > 0)
        )
      );

      const trimmedTarget = typeof targetName === 'string' ? targetName.trim() : '';

      if (trimmedSources.length < 2 || !trimmedTarget) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'A target name and at least two valid participant names are required',
        });
      }

      const result = await meetingService.mergeParticipants(userId, trimmedSources, trimmedTarget);

      return res.json(result);
    } catch (error) {
      const status =
        error.message === 'User ID is required' ||
        error.message === 'A target name is required' ||
        error.message === 'At least two participant names are required to merge'
          ? 400
          : 500;

      console.error('Merge participants error:', error);
      return res.status(status).json({
        error: 'Failed to merge participants',
        message: error.message || 'An unexpected error occurred while merging participants',
      });
    }
  }

  async removeParticipant(req, res) {
    try {
      const userId = req.user?.sub;
      const participantName = req.params.name ?? req.body?.name;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication is required',
        });
      }

      if (!participantName) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Participant name is required',
        });
      }

      const result = await meetingService.removeParticipant(userId, participantName);

      return res.json({
        updatedMeetings: result.updatedMeetings,
      });
    } catch (error) {
      const status =
        error.message === 'Participant name is required' || error.message === 'User ID is required'
          ? 400
          : 500;

      console.error('Remove participant error:', error);
      return res.status(status).json({
        error: 'Failed to remove participant',
        message: error.message || 'An unexpected error occurred while removing the participant',
      });
    }
  }
}

module.exports = new ParticipantController();
