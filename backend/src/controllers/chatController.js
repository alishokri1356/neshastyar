const chatService = require('../services/chatService');

function getUserId(req) {
  return req.user?.sub || null;
}

class ChatController {
  async listSessions(req, res) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User authentication is required' });
      }

      const { meetingId, scope } = req.query || {};
      const sessions = await chatService.listSessions(userId, {
        meetingId: meetingId || undefined,
        scope: scope || undefined,
      });
      return res.json(sessions);
    } catch (error) {
      console.error('List chat sessions error:', error);
      return res.status(error.status || 500).json({
        error: 'Failed to list chat sessions',
        message: error.message,
      });
    }
  }

  async createSession(req, res) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User authentication is required' });
      }

      const meetingId = req.body?.meetingId || null;
      const session = await chatService.createSession(userId, { meetingId });
      return res.status(201).json(session);
    } catch (error) {
      console.error('Create chat session error:', error);
      return res.status(error.status || 500).json({
        error: 'Failed to create chat session',
        message: error.message,
      });
    }
  }

  async getSession(req, res) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User authentication is required' });
      }

      const session = await chatService.getSession(userId, req.params.id);
      return res.json(session);
    } catch (error) {
      console.error('Get chat session error:', error);
      return res.status(error.status || 500).json({
        error: 'Failed to get chat session',
        message: error.message,
      });
    }
  }

  async deleteSession(req, res) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User authentication is required' });
      }

      const result = await chatService.deleteSession(userId, req.params.id);
      return res.json(result);
    } catch (error) {
      console.error('Delete chat session error:', error);
      return res.status(error.status || 500).json({
        error: 'Failed to delete chat session',
        message: error.message,
      });
    }
  }

  async sendMessage(req, res) {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', message: 'User authentication is required' });
      }

      const result = await chatService.sendMessage(userId, req.params.id, req.body?.content);
      return res.json(result);
    } catch (error) {
      console.error('Send chat message error:', error);
      return res.status(error.status || 500).json({
        error: 'Failed to send chat message',
        message: error.message,
      });
    }
  }
}

module.exports = new ChatController();
