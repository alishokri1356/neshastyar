const dictationService = require('../services/dictationService');

class DictationController {
  async transcribe(req, res) {
    try {
      if (!req.user?.sub) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User authentication is required' });
      }

      const result = await dictationService.transcribe({
        buffer: req.file?.buffer,
        mimeType: req.file?.mimetype,
      });
      return res.json(result);
    } catch (error) {
      console.error('Dictation transcribe error:', error.message);
      return res.status(error.status || 500).json({
        error: 'Failed to transcribe dictation',
        message: error.message,
      });
    }
  }
}

module.exports = new DictationController();
