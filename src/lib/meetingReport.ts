import moment from 'moment-jalaali';

export interface MeetingDecision {
  text: string;
  assignee: string;
}

export interface MeetingReportData {
  title: string;
  meetingDate: string | null;
  participants: string[];
  decisions: MeetingDecision[];
  summaryText: string;
  orgName: string | null;
  logoUrl: string | null;
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
