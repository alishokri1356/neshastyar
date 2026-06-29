const meetingSyncService = require('../services/meetingSyncService');

const getInternalSecret = () => process.env.INTERNAL_WEBHOOK_SECRET || process.env.N8N_WEBHOOK_SECRET;

class MeetingSyncController {
  async syncMeetingDataWebhook(req, res) {
    try {
      const configuredSecret = getInternalSecret();
      const providedSecret =
        req.headers['x-internal-secret'] ||
        req.query.secret ||
        req.body?.secret;

      if (configuredSecret && providedSecret !== configuredSecret) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid internal webhook secret',
        });
      }

      const { meetingId } = req.params;
      if (!meetingId) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'meetingId is required',
        });
      }

      const result = await meetingSyncService.syncMeetingDataFromSummary(meetingId);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Sync meeting data webhook error:', error);
      return res.status(500).json({
        error: 'Sync failed',
        message: error.message || 'Failed to sync meeting participants and tags',
      });
    }
  }
}

module.exports = new MeetingSyncController();
