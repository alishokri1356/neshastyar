const BULLET_KEYS = ['Bolet Points', 'Bullet Points'];
const PEOPLE_KEYS = ['People in meetings', 'People in Meetings', 'participants', 'Participants'];
const LOCATION_KEYS = ['Location', 'location', 'محل تشکیل جلسه', 'محل'];

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

const asStringList = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const toPlainText = (value) => {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const firstPeople = (json) => {
  for (const key of PEOPLE_KEYS) {
    const values = asStringList(json[key]);
    if (values.length > 0) return values;
  }
  return [];
};

const rawBulletItems = (json) => {
  if (!json || typeof json !== 'object') return [];
  for (const key of BULLET_KEYS) {
    if (Array.isArray(json[key]) && json[key].length > 0) return json[key];
  }
  return [];
};

const DECISION_LABELS = [
  'تصمیم اتخاذ شده',
  'زمان انجام',
  'مهلت زمانی',
  'تاریخ انجام',
  'مسئول پیگیری',
  'مسئول اجرا',
  'deadline',
  'تصمیم',
  'مسئول',
  'مهلت',
  'موعد',
  'زمان',
  'due',
];

const decisionLabelPattern = new RegExp(
  `(${DECISION_LABELS.join('|')})\\s*[:：]`,
  'gi'
);

const decisionLabelKind = (label) => {
  const key = String(label || '').trim().toLowerCase();
  if (key === 'deadline' || key === 'due' || /زمان|مهلت|موعد|تاریخ انجام/.test(label)) return 'deadline';
  if (/مسئول|assignee|owner/i.test(label)) return /پیگیری/.test(label) ? 'follower' : 'assignee';
  return 'text';
};

const cleanDecisionValue = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim();

const splitDecisionLabels = (source) => {
  const text = String(source || '');
  const found = [];
  decisionLabelPattern.lastIndex = 0;
  let match = decisionLabelPattern.exec(text);
  while (match) {
    found.push({
      label: match[1],
      start: match.index,
      valueStart: match.index + match[0].length,
    });
    match = decisionLabelPattern.exec(text);
  }
  if (!found.length) return [];

  return found.map((field, index) => {
    const end = index + 1 < found.length ? found[index + 1].start : text.length;
    return {
      kind: decisionLabelKind(field.label),
      value: cleanDecisionValue(text.slice(field.valueStart, end).replace(/[\s.،؛\-—]+$/g, '')),
    };
  }).filter((field) => field.value);
};

const decisionFromFields = (fields, fallbackText) => {
  let text = '';
  let assignee = '';
  let follower = '';
  let deadline = '';
  for (const field of fields) {
    if (field.kind === 'deadline') deadline = deadline || field.value;
    else if (field.kind === 'assignee') assignee = assignee || field.value;
    else if (field.kind === 'follower') follower = follower || field.value;
    else text = text || field.value;
  }
  if (!text) text = cleanDecisionValue(String(fallbackText || '').replace(/^\s*تصمیم(?:\s+اتخاذ\s+شده)?\s*[:：]\s*/, ''));
  return {
    text,
    assignee: assignee || follower,
    deadline,
  };
};

const decisionFromItem = (item) => {
  if (typeof item === 'string') {
    return decisionFromFields(splitDecisionLabels(item), item);
  }
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    const text = formatBulletPoint(item);
    return decisionFromFields(splitDecisionLabels(text), text);
  }

  const fields = [];
  for (const [key, value] of Object.entries(item)) {
    const text = value == null ? '' : String(value).trim();
    if (!text) continue;
    fields.push({ kind: decisionLabelKind(key), value: cleanDecisionValue(text) });
  }
  const joined = Object.entries(item)
    .map(([key, value]) => `${key}: ${value ?? ''}`)
    .join(' — ');
  const labeled = splitDecisionLabels(joined);
  return decisionFromFields(labeled.length ? labeled : fields, joined);
};

const extractDecisions = (json) => rawBulletItems(json)
  .map(decisionFromItem)
  .filter((item) => item.text);

const bulletArrayKey = (json) => {
  for (const key of BULLET_KEYS) {
    if (Array.isArray(json[key])) return key;
  }
  return BULLET_KEYS[0];
};

const canonicalDecision = ({ text, assignee, deadline }) => {
  const parts = [];
  if (text) parts.push(`تصمیم: ${text}`);
  if (assignee) parts.push(`مسئول: ${assignee}`);
  if (deadline) parts.push(`مهلت زمانی: ${deadline}`);
  return parts.join(' ');
};

const applyDecisionEdit = (json, index, part, value) => {
  const key = bulletArrayKey(json);
  const items = Array.isArray(json[key]) ? json[key].slice() : [];
  const visible = [];
  items.forEach((item, rawIndex) => {
    const decision = decisionFromItem(item);
    if (decision.text) visible.push({ rawIndex, decision });
  });
  const slot = visible[index];
  if (!slot) return false;

  const next = {
    text: slot.decision.text,
    assignee: slot.decision.assignee,
    deadline: slot.decision.deadline,
  };
  next[part] = cleanDecisionValue(value);
  if (!next.text) items.splice(slot.rawIndex, 1);
  else items[slot.rawIndex] = canonicalDecision(next);

  json[key] = items;
  for (const other of BULLET_KEYS) {
    if (other !== key) delete json[other];
  }
  return true;
};

const setPeople = (json, names) => {
  json['People in meetings'] = names;
  for (const key of PEOPLE_KEYS) {
    if (key !== 'People in meetings') delete json[key];
  }
};

const setLocation = (json, location) => {
  json.Location = location;
  for (const key of LOCATION_KEYS) {
    if (key !== 'Location') delete json[key];
  }
};

const extractLocation = (json) => {
  if (!json || typeof json !== 'object') return null;
  for (const key of LOCATION_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(json, key) || json[key] == null) continue;
    return String(json[key]).trim();
  }
  return null;
};

const buildReportContent = (summaryText, fallbackTitle) => {
  const json = parseMeetingSummaryJson(summaryText) || {};
  const subject = typeof json.Subject === 'string' ? json.Subject.trim() : '';
  const summary = toPlainText(typeof json.Summary === 'string' ? json.Summary : '');
  return {
    title: (fallbackTitle && String(fallbackTitle).trim()) || subject || 'صورتجلسه',
    summaryText: summary,
    suggestedParticipants: firstPeople(json),
    decisions: extractDecisions(json),
    location: extractLocation(json),
  };
};

module.exports = {
  formatBulletPoint,
  normalizeBulletPoints,
  getBulletPointsFromSummaryJson,
  parseMeetingSummaryJson,
  toPlainText,
  extractDecisions,
  extractLocation,
  buildReportContent,
  applyDecisionEdit,
  setPeople,
  setLocation,
};
