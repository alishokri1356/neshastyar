import { formatBulletPoint, parseMeetingSummaryJson } from "@/lib/meetingSummary";

export interface DecisionRow {
  text: string;
  assignee: string;
  deadline: string;
}

export type DecisionEdit =
  | { type: "edit"; index: number; part: "text" | "assignee" | "deadline"; value: string }
  | { type: "add" }
  | { type: "delete"; index: number };

const BULLET_KEYS = ["Bolet Points", "Bullet Points"];

const DECISION_LABELS = [
  "تصمیم اتخاذ شده",
  "زمان انجام",
  "مهلت زمانی",
  "تاریخ انجام",
  "مسئول پیگیری",
  "مسئول اجرا",
  "deadline",
  "تصمیم",
  "مسئول",
  "مهلت",
  "موعد",
  "زمان",
  "due",
];

const decisionLabelPattern = new RegExp(
  `(${DECISION_LABELS.join("|")})\\s*[:：]`,
  "gi",
);

const decisionLabelStartPattern = new RegExp(
  `^\\s*(${DECISION_LABELS.join("|")})\\s*[:：]`,
  "i",
);

const decisionLabelKind = (label: string): "text" | "assignee" | "follower" | "deadline" => {
  const key = label.trim().toLowerCase();
  if (key === "deadline" || key === "due" || /زمان|مهلت|موعد|تاریخ انجام/.test(label)) {
    return "deadline";
  }
  if (/مسئول|assignee|owner/i.test(label)) {
    return /پیگیری/.test(label) ? "follower" : "assignee";
  }
  return "text";
};

const cleanDecisionValue = (value: string) => String(value || "").replace(/\s+/g, " ").trim();

const splitDecisionLabels = (source: string) => {
  const text = String(source || "");
  const found: { label: string; start: number; valueStart: number }[] = [];
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

  return found
    .map((field, index) => {
      const end = index + 1 < found.length ? found[index + 1].start : text.length;
      return {
        kind: decisionLabelKind(field.label),
        value: cleanDecisionValue(text.slice(field.valueStart, end).replace(/[\s.،؛\-—]+$/g, "")),
      };
    })
    .filter((field) => field.value);
};

const decisionFromFields = (
  fields: { kind: string; value: string }[],
  fallbackText: string,
): DecisionRow => {
  let text = "";
  let assignee = "";
  let follower = "";
  let deadline = "";
  for (const field of fields) {
    if (field.kind === "deadline") deadline = deadline || field.value;
    else if (field.kind === "assignee") assignee = assignee || field.value;
    else if (field.kind === "follower") follower = follower || field.value;
    else text = text || field.value;
  }
  const onlyLabeledFields =
    fields.length > 0 && decisionLabelStartPattern.test(String(fallbackText || ""));
  if (!text && !onlyLabeledFields) {
    text = cleanDecisionValue(
      String(fallbackText || "").replace(/^\s*تصمیم(?:\s+اتخاذ\s+شده)?\s*[:：]\s*/, ""),
    );
  }
  return {
    text,
    assignee: assignee || follower,
    deadline,
  };
};

const decisionFromItem = (item: unknown): DecisionRow => {
  if (typeof item === "string") {
    return decisionFromFields(splitDecisionLabels(item), item);
  }
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    const text = formatBulletPoint(item);
    return decisionFromFields(splitDecisionLabels(text), text);
  }
  const record = item as Record<string, unknown>;
  const fields = Object.entries(record)
    .map(([key, value]) => ({ key, text: value == null ? "" : String(value).trim() }))
    .filter((field) => field.text)
    .map((field) => ({ kind: decisionLabelKind(field.key), value: cleanDecisionValue(field.text) }));
  const joined = Object.entries(record)
    .map(([key, value]) => `${key}: ${value ?? ""}`)
    .join(" — ");
  const labeled = splitDecisionLabels(joined);
  return decisionFromFields(labeled.length ? labeled : fields, joined);
};

const bulletArrayKey = (json: Record<string, unknown>) =>
  BULLET_KEYS.find((key) => Array.isArray(json[key]) && (json[key] as unknown[]).length > 0) ||
  BULLET_KEYS.find((key) => Array.isArray(json[key])) ||
  BULLET_KEYS[0];

const rawBulletItems = (json: Record<string, unknown>): unknown[] => {
  const items = json[bulletArrayKey(json)];
  return Array.isArray(items) ? items : [];
};

const decisionSlots = (items: unknown[]) => {
  const slots: { rawIndex: number; decision: DecisionRow }[] = [];
  items.forEach((item, rawIndex) => {
    const decision = decisionFromItem(item);
    if (item === "" || decision.text || decision.assignee || decision.deadline) {
      slots.push({ rawIndex, decision });
    }
  });
  return slots;
};

const writeDecisionItems = (json: Record<string, unknown>, key: string, items: unknown[]) => {
  json[key] = items;
  for (const other of BULLET_KEYS) {
    if (other !== key) delete json[other];
  }
};

const canonicalDecision = ({ text, assignee, deadline }: DecisionRow) => {
  const parts = [];
  if (text) parts.push(`تصمیم: ${text}`);
  if (assignee) parts.push(`مسئول: ${assignee}`);
  if (deadline) parts.push(`مهلت زمانی: ${deadline}`);
  return parts.join(" ");
};

const summaryObject = (summary: string | null | undefined): Record<string, unknown> => {
  const parsed = summary ? parseMeetingSummaryJson(summary) : null;
  if (parsed) return JSON.parse(JSON.stringify(parsed)) as Record<string, unknown>;
  const created: Record<string, unknown> = {};
  if (summary?.trim()) created.Summary = summary.trim();
  return created;
};

export function decisionRowsFromSummary(summary: string | null | undefined): DecisionRow[] {
  const parsed = summary ? parseMeetingSummaryJson(summary) : null;
  if (!parsed) return [];
  return decisionSlots(rawBulletItems(parsed)).map((slot) => slot.decision);
}

export function applySummaryDecisionEdit(
  summary: string | null | undefined,
  edit: DecisionEdit,
): string {
  const json = summaryObject(summary);
  const key = bulletArrayKey(json);
  const items = rawBulletItems(json).slice();

  if (edit.type === "add") {
    writeDecisionItems(json, key, [...items, ""]);
    return JSON.stringify(json);
  }

  const slot = decisionSlots(items)[edit.index];
  if (!slot) return summary?.trim() ? summary : JSON.stringify(json);

  if (edit.type === "delete") {
    items.splice(slot.rawIndex, 1);
    writeDecisionItems(json, key, items);
    return JSON.stringify(json);
  }

  const next: DecisionRow = { ...slot.decision };
  next[edit.part] = cleanDecisionValue(edit.value);
  items[slot.rawIndex] = canonicalDecision(next);
  writeDecisionItems(json, key, items);
  return JSON.stringify(json);
}

/** Keep structured نکته rows when another screen rewrites the summary text. */
export function preserveDecisionRows(
  original: Record<string, unknown> | null | undefined,
  serialized: string,
): string {
  if (!original) return serialized;
  const key = BULLET_KEYS.find((name) => Array.isArray(original[name]));
  if (!key) return serialized;
  const next = JSON.parse(serialized) as Record<string, unknown>;
  writeDecisionItems(next, "Bolet Points", original[key] as unknown[]);
  return JSON.stringify(next);
}
