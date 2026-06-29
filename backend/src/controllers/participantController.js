const participantService = require('../services/participantService');
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

  async getParticipantById(req, res) {
    try {
      const userId = req.user?.sub;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication is required',
        });
      }

      const participant = await participantService.getParticipantById(id, userId);
      if (!participant) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Participant not found',
        });
      }

      return res.json({
        id: participant.id,
        name: participant.name,
      });
    } catch (error) {
      console.error('Get participant error:', error);
      return res.status(500).json({
        error: 'Failed to fetch participant',
        message: error.message,
      });
    }
  }

  async createParticipant(req, res) {
    try {
      const userId = req.user?.sub;
      const { name } = req.body || {};

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication is required',
        });
      }

      const participant = await participantService.createParticipant(userId, name);

      return res.status(201).json({
        id: participant.id,
        name: participant.name,
      });
    } catch (error) {
      console.error('Create participant error:', error);

      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          error: 'Duplicate participant',
          message: error.message,
        });
      }

      return res.status(400).json({
        error: 'Failed to create participant',
        message: error.message,
      });
    }
  }

  async renameParticipant(req, res) {
    try {
      const userId = req.user?.sub;
      const { id } = req.params;
      const { name, newName, oldName } = req.body || {};

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication is required',
        });
      }

      const targetName = name || newName;

      if (id) {
        const result = await meetingService.renameParticipant(userId, id, targetName);
        return res.json({
          updatedMeetings: result.updatedMeetings,
          participant: {
            id: result.participant.id,
            name: result.participant.name,
          },
        });
      }

      if (!oldName || !targetName) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'Both old and new participant names are required',
        });
      }

      const result = await meetingService.renameParticipant(
        userId,
        null,
        targetName,
        oldName
      );

      return res.json({
        updatedMeetings: result.updatedMeetings,
        participant: {
          id: result.participant.id,
          name: result.participant.name,
        },
      });
    } catch (error) {
      const status =
        error.message === 'Participant not found' ||
        error.message === 'New participant name is required'
          ? 400
          : error.code === 'ER_DUP_ENTRY'
            ? 409
            : 500;

      console.error('Rename participant error:', error);
      return res.status(status).json({
        error: 'Failed to rename participant',
        message: error.message,
      });
    }
  }

  async mergeParticipants(req, res) {
    try {
      const userId = req.user?.sub;
      const { sourceIds, sourceNames, targetName } = req.body || {};

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication is required',
        });
      }

      const trimmedTarget = typeof targetName === 'string' ? targetName.trim() : '';

      if (!trimmedTarget) {
        return res.status(400).json({
          error: 'Invalid input',
          message: 'A target name is required',
        });
      }

      if (Array.isArray(sourceIds) && sourceIds.length >= 2) {
        const result = await meetingService.mergeParticipants(
          userId,
          sourceIds,
          trimmedTarget
        );
        return res.json(result);
      }

      if (Array.isArray(sourceNames) && sourceNames.length >= 2) {
        const trimmedSources = Array.from(
          new Set(
            sourceNames
              .map((name) => (typeof name === 'string' ? name.trim() : ''))
              .filter((name) => name.length > 0)
          )
        );

        if (trimmedSources.length < 2) {
          return res.status(400).json({
            error: 'Invalid input',
            message: 'At least two valid participant names are required',
          });
        }

        const result = await meetingService.mergeParticipants(
          userId,
          null,
          trimmedTarget,
          trimmedSources
        );
        return res.json(result);
      }

      return res.status(400).json({
        error: 'Invalid input',
        message: 'At least two participants are required to merge',
      });
    } catch (error) {
      const status =
        error.message.includes('required') || error.message.includes('not found')
          ? 400
          : 500;

      console.error('Merge participants error:', error);
      return res.status(status).json({
        error: 'Failed to merge participants',
        message: error.message,
      });
    }
  }

  async removeParticipant(req, res) {
    try {
      const userId = req.user?.sub;
      const { id } = req.params;
      const legacyName = req.body?.name;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication is required',
        });
      }

      const result = await meetingService.removeParticipant(userId, id, legacyName);

      return res.json({
        updatedMeetings: result.updatedMeetings,
      });
    } catch (error) {
      const status = error.message === 'Participant not found' ? 404 : 500;

      console.error('Remove participant error:', error);
      return res.status(status).json({
        error: 'Failed to remove participant',
        message: error.message,
      });
    }
  }

  async getMeetingsForParticipant(req, res) {
    try {
      const userId = req.user?.sub;
      const { id } = req.params;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication is required',
        });
      }

      const participant = await participantService.getParticipantById(id, userId);
      if (!participant) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Participant not found',
        });
      }

      const meetings = await participantService.getMeetingsByParticipant(id, userId);

      return res.json({
        participant: {
          id: participant.id,
          name: participant.name,
        },
        meetings,
      });
    } catch (error) {
      console.error('Get meetings for participant error:', error);
      return res.status(500).json({
        error: 'Failed to fetch meetings',
        message: error.message,
      });
    }
  }

  async getMeetingsWithoutParticipants(req, res) {
    try {
      const userId = req.user?.sub;

      if (!userId) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User authentication is required',
        });
      }

      const meetings = await participantService.getMeetingsWithoutParticipants(userId);
      return res.json({ meetings });
    } catch (error) {
      console.error('Get meetings without participants error:', error);
      return res.status(500).json({
        error: 'Failed to fetch meetings',
        message: error.message,
      });
    }
  }
}

module.exports = new ParticipantController();
