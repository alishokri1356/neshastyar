import moment from 'moment-jalaali';
import { mysqlClient } from '@/lib/mysql-client';

export interface MeetingDecision {
  text: string;
  assignee: string;
  deadline: string;
}

export interface MeetingReportData {
  title: string;
  meetingDate: string | null;
  participants: string[];
  decisions: MeetingDecision[];
  summaryText: string;
  location: string;
  orgName: string | null;
  logoUrl: string | null;
  canEdit?: boolean;
}

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function absoluteFromApiPath(apiPath: string): string {
  if (/^https?:\/\//i.test(apiPath)) return apiPath;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`;
}

export function withAbsoluteLogo(report: MeetingReportData): MeetingReportData {
  if (!report.logoUrl) return report;
  return { ...report, logoUrl: absoluteFromApiPath(report.logoUrl) };
}

export function formatReportDate(value: string | null): string {
  if (!value) return '';
  const parsed = moment(value);
  if (!parsed.isValid()) return '';
  return `${parsed.format('jYYYY/jMM/jDD')} - ${parsed.format('HH:mm')}`;
}

export async function fetchPublicReport(token: string): Promise<MeetingReportData> {
  const response = await fetch(`${API_BASE_URL}/public/reports/${encodeURIComponent(token)}`);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || 'صورتجلسه پیدا نشد');
  }
  return withAbsoluteLogo(data as MeetingReportData);
}

export type ReportEdit =
  | { field: 'title' | 'location' | 'participants' | 'orgName' | 'date'; value: string }
  | { field: 'decision'; index: number; part: 'text' | 'assignee' | 'deadline'; value: string }
  | { field: 'addDecision' }
  | { field: 'deleteDecision'; index: number };

const toAsciiDigits = (value: string) => value
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

/** Empty input clears the date. Invalid input returns null. */
export function parseReportDateInput(value: string): string | null {
  const digits = toAsciiDigits(value).trim();
  if (!digits) return '';
  const parsed = moment(digits, ['jYYYY/jMM/jDD - HH:mm', 'jYYYY/jM/jD - H:mm'], true);
  if (!parsed.isValid()) return null;
  return parsed.toDate().toISOString();
}

export async function uploadReportLogo(token: string, file: File): Promise<MeetingReportData> {
  const body = new FormData();
  body.append('logo', file);
  const response = await fetch(`${API_BASE_URL}/public/reports/${encodeURIComponent(token)}/logo`, {
    method: 'POST',
    body,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || 'ذخیره لوگو انجام نشد');
  }
  return withAbsoluteLogo(data as MeetingReportData);
}

export async function aiEditPublicReport(
  token: string,
  prompt: string,
): Promise<{ changes_summary?: string | null }> {
  const response = await fetch(
    `${API_BASE_URL}/public/reports/${encodeURIComponent(token)}/ai-edit`,
    {
      method: 'POST',
      headers: {
        ...mysqlClient.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    },
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || 'ویرایش هوشمند ناموفق بود');
  }
  return data || {};
}

export async function updatePublicReport(token: string, edit: ReportEdit): Promise<MeetingReportData> {
  const response = await fetch(`${API_BASE_URL}/public/reports/${encodeURIComponent(token)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(edit),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || 'ذخیره صورتجلسه انجام نشد');
  }
  return withAbsoluteLogo(data as MeetingReportData);
}
