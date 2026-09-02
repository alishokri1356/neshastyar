export interface EditableMeetingSummary {
  subject: string;
  summaryText: string;
  people: string[];
  bulletPoints: string[];
  tags: string[];
}

const PEOPLE_KEYS = ['People in meetings', 'People in Meetings', 'participants', 'Participants'];
const BULLET_KEYS = ['Bolet Points', 'Bullet Points'];
const TAG_KEYS = ['Tags', 'tags'];

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

/** Bullet points may be plain strings or structured objects from the AI (e.g. { تصمیم, مسئول }). */
export const formatBulletPoint = (point: unknown): string => {
  if (typeof point === 'string') return point.trim();
  if (point && typeof point === 'object' && !Array.isArray(point)) {
    return Object.entries(point as Record<string, unknown>)
      .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : String(value ?? '')}`)
      .join(' — ');
  }
  if (point == null) return '';
  return String(point).trim();
};

export const normalizeBulletPoints = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(formatBulletPoint).filter((item) => item.length > 0);
};

const firstBulletArray = (json: Record<string, unknown>): string[] => {
  for (const key of BULLET_KEYS) {
    const values = normalizeBulletPoints(json[key]);
    if (values.length > 0) return values;
  }
  return [];
};

const firstString = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const firstArray = (json: Record<string, unknown>, keys: string[]): string[] => {
  for (const key of keys) {
    const values = asStringArray(json[key]);
    if (values.length > 0) return values;
  }
  return [];
};

/** Strip markdown code fences the AI sometimes wraps around JSON. */
const stripMarkdownFences = (text: string): string => {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
};

/** Extract the first complete `{...}` object, respecting JSON string escaping. */
const extractFirstJsonObject = (text: string): string | null => {
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

/** Escape raw control characters inside JSON strings (common AI output issue). */
const sanitizeJsonControlChars = (text: string): string => {
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

const tryParseSummaryObject = (text: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};

export const parseMeetingSummaryJson = (summaryText: string): Record<string, unknown> | null => {
  if (!summaryText?.trim()) return null;

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

export const jsonToEditableSummary = (json: Record<string, unknown>): EditableMeetingSummary => ({
  subject: firstString(json.Subject),
  summaryText: firstString(json.Summary),
  people: firstArray(json, PEOPLE_KEYS),
  bulletPoints: firstBulletArray(json),
  tags: firstArray(json, TAG_KEYS),
});

export const editableSummaryToJson = (
  editable: EditableMeetingSummary,
  originalJson?: Record<string, unknown> | null,
): string => {
  const result: Record<string, unknown> = originalJson ? { ...originalJson } : {};

  result.Subject = editable.subject.trim();
  result.Summary = editable.summaryText.trim();
  result['People in meetings'] = editable.people;
  result['Bolet Points'] = editable.bulletPoints;
  result.Tags = editable.tags;

  PEOPLE_KEYS.forEach((key) => {
    if (key !== 'People in meetings') delete result[key];
  });
  BULLET_KEYS.forEach((key) => {
    if (key !== 'Bolet Points') delete result[key];
  });
  TAG_KEYS.forEach((key) => {
    if (key !== 'Tags') delete result[key];
  });

  return JSON.stringify(result);
};

export const linesToList = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

/** True when the text contains HTML tags (rich-text summary saved from the editor). */
export const isHtmlContent = (text: string): boolean => /<\/?[a-z][^>]*>/i.test(text);

/** Convert rich-text HTML back to readable plain text (for clipboard, excerpts, previews). */
export const htmlToPlainText = (html: string): string => {
  if (!html || !isHtmlContent(html)) return html;

  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi, '\n');

  return withBreaks
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const emptyEditableSummary = (): EditableMeetingSummary => ({
  subject: '',
  summaryText: '',
  people: [],
  bulletPoints: [],
  tags: [],
});

export const formatEditableSummaryForClipboard = (
  editable: EditableMeetingSummary,
): string | null => {
  const parts: string[] = [];

  if (editable.subject.trim()) {
    parts.push(`موضوع:\n${editable.subject.trim()}`);
  }
  const plainSummary = htmlToPlainText(editable.summaryText).trim();
  if (plainSummary) {
    parts.push(`خلاصه:\n${plainSummary}`);
  }
  if (editable.bulletPoints.length > 0) {
    parts.push(
      `نکات کلیدی:\n${editable.bulletPoints.map((point) => `• ${point}`).join('\n')}`,
    );
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
};

export const formatSummaryForClipboard = (summaryText: string): string | null => {
  if (!summaryText?.trim()) return null;

  const json = parseMeetingSummaryJson(summaryText);
  if (json) {
    return formatEditableSummaryForClipboard(jsonToEditableSummary(json));
  }

  return `خلاصه:\n${htmlToPlainText(summaryText).trim()}`;
};
