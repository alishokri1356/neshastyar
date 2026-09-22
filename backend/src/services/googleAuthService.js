const { OAuth2Client } = require('google-auth-library');

class GoogleAuthService {
  constructor() {
    this.clientId = '';
    this.client = null;
  }

  ensureClient() {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    if (!clientId) {
      this.clientId = '';
      this.client = null;
      return null;
    }
    if (!this.client || this.clientId !== clientId) {
      this.clientId = clientId;
      this.client = new OAuth2Client(clientId);
    }
    return this.client;
  }

  isConfigured() {
    return Boolean(this.ensureClient());
  }

  async verifyIdToken(idToken) {
    const client = this.ensureClient();
    if (!client) {
      throw new Error('Google Sign-In is not configured');
    }

    const ticket = await client.verifyIdToken({
      idToken,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new Error('Invalid Google token payload');
    }

    if (!payload.email) {
      throw new Error('Google account email is required');
    }

    if (payload.email_verified === false) {
      throw new Error('Google email is not verified');
    }

    return {
      googleId: payload.sub,
      email: String(payload.email).trim().toLowerCase(),
      name: payload.name || null,
      picture: payload.picture || null,
      emailVerified: payload.email_verified !== false,
    };
  }
}

module.exports = new GoogleAuthService();
