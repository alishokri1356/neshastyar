class AnalyzeService {
  async requestMeetingAnalysis(meetingId) {
    const webhookUrl =
      process.env.ANALYZE_WEBHOOK_URL ||
      'https://n8nnew.teraxr.com/webhook/add5d58a-54b1-4459-96f2-ec17590e3cfd';
    const webhookTestUrl =
      process.env.ANALYZE_WEBHOOK_TEST_URL ||
      'https://n8nnew.teraxr.com/webhook-test/add5d58a-54b1-4459-96f2-ec17590e3cfd';

    const headers = {
      'Content-Type': 'application/json',
      'X-Meeting-Id': meetingId,
    };

    if (webhookTestUrl) {
      try {
        const testResponse = await fetch(webhookTestUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });

        if (testResponse.ok) {
          return { success: true, meetingId, usedTestWebhook: true };
        }
      } catch (error) {
        console.warn('Analyze test webhook failed, falling back to main webhook:', error.message);
      }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });

    if (!response.ok) {
      throw new Error(`Analyze webhook failed with status ${response.status}`);
    }

    return { success: true, meetingId, usedTestWebhook: false };
  }
}

module.exports = new AnalyzeService();
