const ADMIN_TOKEN_KEY = 'neshastyar_admin_token';

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

export class AdminApiError extends Error {
  status: number;
  data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.data = data;
  }
}

export async function adminFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/admin${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new AdminApiError(
      data.message || data.error || 'Admin request failed',
      response.status,
      data.data
    );
  }
  return data as T;
}

export type EmailDelivery = {
  type: 'verification' | 'password_reset' | null;
  status: 'sent' | 'failed' | null;
  sent_at: string | null;
  message_id: string | null;
  error: string | null;
};

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  baleID: string | null;
  email_verified: boolean;
  verification_status: 'verified' | 'unverified';
  verification_email_pending: boolean;
  email_verification_expires: string | null;
  password_status: 'set' | 'reset_pending';
  password_reset_pending: boolean;
  password_reset_expires: string | null;
  account_status: 'active' | 'pending_verification';
  email_delivery: EmailDelivery;
  usage: {
    meeting_count: number;
    last_meeting_at: string | null;
  };
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};
