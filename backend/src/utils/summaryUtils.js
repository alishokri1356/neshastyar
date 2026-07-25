const BULLET_KEYS = ['Bolet Points', 'Bullet Points'];

const stripMarkdownFences = (text) => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
};

const extractFirstJsonObject = (text) => {
  const start = text.indexOf('{');
  if (start < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return null;
};

const sanitizeJsonControlChars = (text) => {
  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = ch.charCodeAt(0);

    if (inString) {
      if (escaped) {
        result += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        result += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        result += ch;
        inString = false;
        continue;
      }
      if (code < 0x20) {
        if (ch === '\n') result += '\\n';
        else if (ch === '\r') result += '\\r';
        else if (ch === '\t') result += '\\t';
        else result += `\\u${code.toString(16).padStart(4, '0')}`;
        continue;
      }
      result += ch;
      continue;
    }

    if (ch === '"') inString = true;
    result += ch;
  }

  return result;
};

const tryParseSummaryObject = (text) => {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const parseMeetingSummaryJson = (summaryText) => {
  if (!summaryText || typeof summaryText !== 'string' || !summaryText.trim()) return null;

  const cleaned = stripMarkdownFences(summaryText);

  const direct = tryParseSummaryObject(cleaned);
  if (direct) return direct;

  const extracted = extractFirstJsonObject(cleaned);
  if (extracted) {
    const fromExtract = tryParseSummaryObject(extracted);
    if (fromExtract) return fromExtract;

    const sanitizedExtract = tryParseSummaryObject(sanitizeJsonControlChars(extracted));
    if (sanitizedExtract) return sanitizedExtract;
  }

  return tryParseSummaryObject(sanitizeJsonControlChars(cleaned));
};

const formatBulletPoint = (point) => {
  if (typeof point === 'string') return point.trim();
  if (point && typeof point === 'object' && !Array.isArray(point)) {
    return Object.entries(point)
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : String(value ?? '')}`)
      .join(' — ');
  }
  if (point == null) return '';
  return String(point).trim();
};

const normalizeBulletPoints = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map(formatBulletPoint).filter((item) => item.length > 0);
};

const getBulletPointsFromSummaryJson = (jsonData) => {
  if (!jsonData || typeof jsonData !== 'object') return [];
  for (const key of BULLET_KEYS) {
    const values = normalizeBulletPoints(jsonData[key]);
    if (values.length > 0) return values;
  }
  return [];
};

module.exports = {
  formatBulletPoint,
  normalizeBulletPoints,
  getBulletPointsFromSummaryJson,
  parseMeetingSummaryJson,
};
