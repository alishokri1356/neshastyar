import moment from "moment-jalaali";

export const DraftStatus = {
  ON_RECORDING: "ON_RECORDING",
  ON_TAG_SELECTION: "ON_TAG_SELECTION",
  ON_UPLOADING: "ON_UPLOADING",
} as const;

export type DraftStatusType = (typeof DraftStatus)[keyof typeof DraftStatus];

export function isProcessedStatus(status?: string | null): boolean {
  return status === "Done" || status === "پردازش شده" || status === "تکمیل شده";
}

export function isAnalyzingStatus(status?: string | null): boolean {
  return (
    status === "On Process" ||
    status === "ارسال درخواست پردازش" ||
    status === "آماده پردازش" ||
    status === "در حال پردازش" ||
    status === "در حال تحلیل"
  );
}

export function isNeedReviewStatus(status?: string | null): boolean {
  return status === "Need Review";
}

export function isErrorStatus(status?: string | null): boolean {
  const value = (status ?? "").trim();
  if (!value) return false;
  return (
    /^error/i.test(value) ||
    /^failed/i.test(value) ||
    value.includes("خطا")
  );
}

export function statusDisplayLabel(status?: string | null): string {
  if (!status || !status.trim()) return "—";
  if (status === DraftStatus.ON_RECORDING) return "در حال ضبط";
  if (status === DraftStatus.ON_TAG_SELECTION) return "انتخاب برچسب";
  if (status === DraftStatus.ON_UPLOADING) return "در حال آپلود";
  if (status === "Done" || status === "پردازش شده") return "تکمیل شده";
  if (status === "Need Review") return "نیاز به بازبینی";
  if (isAnalyzingStatus(status)) return "در حال تحلیل";
  return status;
}

export function statusChipColors(status?: string | null): { bg: string; text: string } {
  if (status === DraftStatus.ON_RECORDING) {
    return { bg: "#D7EFED", text: "#0F766E" };
  }
  if (status === DraftStatus.ON_TAG_SELECTION) {
    return { bg: "#FEF7E6", text: "#B45309" };
  }
  if (status === DraftStatus.ON_UPLOADING || isAnalyzingStatus(status)) {
    return { bg: "#FEF7E6", text: "#B45309" };
  }
  if (isProcessedStatus(status)) {
    return { bg: "#EBF6F0", text: "#166534" };
  }
  if (isNeedReviewStatus(status) || isErrorStatus(status)) {
    return { bg: "#FDF2F0", text: "#B91C1C" };
  }
  return { bg: "#F2EDE8", text: "#66625B" };
}

const PERSIAN_DAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنج‌شنبه",
  "جمعه",
  "شنبه",
];

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

export function parseApiDate(raw?: string | number | Date | null): Date | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw === "number") {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const str = String(raw).trim();
  if (!str) return null;
  const isoCandidate = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(str)
    ? str.replace(" ", "T") + "Z"
    : str;
  const d = new Date(isoCandidate);
  if (!Number.isNaN(d.getTime())) return d;
  const fallback = new Date(str);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/** Matches Android JalaliDates.groupLabel: "سه‌شنبه، ۱۹ آبان" */
export function formatJalaliGroupLabel(raw?: string | number | Date | null): string {
  const date = parseApiDate(raw);
  if (!date) return "";
  try {
    const m = moment(date);
    const dayName = PERSIAN_DAYS[m.day()] ?? "";
    const month = PERSIAN_MONTHS[m.jMonth()] ?? "";
    const day = toPersianDigits(m.format("jD"));
    return `${dayName}، ${day} ${month}`;
  } catch {
    return "";
  }
}

/** Matches Android JalaliDates.formatDateTime: "19 آبان 1405 - 21:40" */
export function formatJalaliDateTime(raw?: string | number | Date | null): string {
  const date = parseApiDate(raw);
  if (!date) return "";
  try {
    const m = moment(date);
    const month = PERSIAN_MONTHS[m.jMonth()] ?? "";
    const day = toPersianDigits(m.format("jD"));
    const year = toPersianDigits(m.format("jYYYY"));
    const time = toPersianDigits(m.format("HH:mm"));
    return `${day} ${month} ${year} - ${time}`;
  } catch {
    return "";
  }
}

/** Matches Android formatHomeTime: "۲۱:۴۰" */
export function formatPersianClockTime(raw?: string | number | Date | null): string {
  const date = parseApiDate(raw);
  if (!date) return "";
  try {
    return toPersianDigits(moment(date).format("HH:mm"));
  } catch {
    return "";
  }
}
