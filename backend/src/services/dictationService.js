const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const DICTATION_TIMEOUT_MS = 90_000;

// Gemini accepts these containers; Android records AAC in an MPEG-4 container.
const MIME_ALIASES = {
  'audio/mp4': 'audio/mp4',
  'audio/m4a': 'audio/mp4',
  'audio/x-m4a': 'audio/mp4',
  'audio/aac': 'audio/aac',
  'audio/mpeg': 'audio/mpeg',
  'audio/mp3': 'audio/mpeg',
  'audio/ogg': 'audio/ogg',
  'audio/webm': 'audio/webm',
  'audio/wav': 'audio/wav',
  'audio/x-wav': 'audio/wav',
  'audio/flac': 'audio/flac',
};

function httpError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getDictationWebhookUrl() {
  return process.env.DICTATION_WEBHOOK_URL || '';
}

function getInternalSecret() {
  return process.env.INTERNAL_WEBHOOK_SECRET || process.env.N8N_WEBHOOK_SECRET || '';
}

function normalizeMimeType(mimeType) {
  const base = String(mimeType || '').split(';')[0].trim().toLowerCase();
  return MIME_ALIASES[base] || null;
}

class DictationService {
  async transcribe({ buffer, mimeType }) {
    if (!buffer || !buffer.length) throw httpError('فایل صوتی ارسال نشده است', 400);
    if (buffer.length > MAX_AUDIO_BYTES) throw httpError('فایل صوتی بیش از حد بزرگ است', 413);

    const normalizedMime = normalizeMimeType(mimeType);
    if (!normalizedMime) throw httpError('قالب فایل صوتی پشتیبانی نمی‌شود', 415);

    const url = getDictationWebhookUrl();
    if (!url) throw httpError('آدرس وب‌هوک تبدیل گفتار تنظیم نشده است', 500);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DICTATION_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-secret': getInternalSecret(),
        },
        body: JSON.stringify({
          mimeType: normalizedMime,
          audio: buffer.toString('base64'),
        }),
        signal: controller.signal,
      });

      let body = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok || !body?.ok) {
        throw httpError('تبدیل گفتار به متن ناموفق بود. دوباره تلاش کنید.', 502);
      }

      return { text: String(body.text || '').trim(), model: body.model || null };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw httpError('تبدیل گفتار طولانی شد، دوباره تلاش کنید', 504);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

module.exports = new DictationService();
module.exports.MAX_AUDIO_BYTES = MAX_AUDIO_BYTES;
module.exports.normalizeMimeType = normalizeMimeType;
