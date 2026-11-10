import { mysqlClient } from "@/lib/mysql-client";

const API_BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001/api").replace(/\/$/, "");

export interface ChatMessageDto {
  id: string;
  session_id?: string;
  role: "user" | "assistant" | string;
  content: string;
  status?: string | null;
  created_at?: string | null;
}

export interface ChatSessionDto {
  id: string;
  user_id?: string;
  meeting_id?: string | null;
  scope?: "all" | "meeting" | string;
  title?: string | null;
  last_message_preview?: string | null;
  last_message_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  messages?: ChatMessageDto[];
}

export interface SendChatMessageResponse {
  session?: ChatSessionDto;
  userMessage?: ChatMessageDto;
  assistantMessage?: ChatMessageDto;
  error?: string;
  message?: string;
}

export interface AiEditMeetingResponse {
  meeting?: {
    id: string;
    title?: string | null;
    meeting_date?: string | null;
    status?: string | null;
    summary?: string | null;
    transcription?: string | null;
    people?: unknown;
    location?: string | null;
    [key: string]: unknown;
  };
  participants?: Array<{ id: string; name: string; email?: string | null }>;
  tags?: Array<{ id: string; name: string; color?: string | null }>;
  model_used?: string | null;
  changes_summary?: string | null;
}

function friendlyHttpError(status: number, fallback: string, serverMessage?: string): string {
  if (serverMessage && serverMessage.trim()) return serverMessage.trim();
  if (status === 401 || status === 403) return "نشست منقضی شده؛ دوباره وارد شوید";
  if (status === 404) return "مورد درخواستی پیدا نشد";
  if (status === 409) return "پاسخ قبلی هنوز در حال آماده‌سازی است";
  if (status === 429) return "تعداد درخواست‌ها زیاد است؛ کمی بعد تلاش کنید";
  return `${fallback} (${status})`;
}

export const chatApi = {
  async listSessions(params?: { meetingId?: string | null; scope?: string }): Promise<ChatSessionDto[]> {
    const search = new URLSearchParams();
    if (params?.meetingId) search.set("meetingId", params.meetingId);
    if (params?.scope) search.set("scope", params.scope);
    const qs = search.toString();
    const res = await fetch(`${API_BASE_URL}/chats${qs ? `?${qs}` : ""}`, {
      headers: {
        ...mysqlClient.getAuthHeaders(),
        "Content-Type": "application/json",
      },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(friendlyHttpError(res.status, "خطا در دریافت تاریخچه گفتگو", body?.message));
    }
    return Array.isArray(body) ? body : [];
  },

  async createSession(meetingId?: string | null): Promise<ChatSessionDto> {
    const res = await fetch(`${API_BASE_URL}/chats`, {
      method: "POST",
      headers: {
        ...mysqlClient.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ meetingId: meetingId || null }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body) {
      throw new Error(friendlyHttpError(res.status, "خطا در ایجاد گفتگو", body?.message));
    }
    return body as ChatSessionDto;
  },

  async getSession(sessionId: string): Promise<ChatSessionDto> {
    const res = await fetch(`${API_BASE_URL}/chats/${encodeURIComponent(sessionId)}`, {
      headers: {
        ...mysqlClient.getAuthHeaders(),
        "Content-Type": "application/json",
      },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body) {
      throw new Error(
        res.status === 404
          ? "گفتگو پیدا نشد"
          : friendlyHttpError(res.status, "خطا در بارگذاری گفتگو", body?.message),
      );
    }
    return body as ChatSessionDto;
  },

  async deleteSession(sessionId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/chats/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
      headers: {
        ...mysqlClient.getAuthHeaders(),
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(friendlyHttpError(res.status, "خطا در حذف گفتگو", body?.message));
    }
  },

  async sendMessage(sessionId: string, content: string): Promise<SendChatMessageResponse> {
    const res = await fetch(`${API_BASE_URL}/chats/${encodeURIComponent(sessionId)}/messages`, {
      method: "POST",
      headers: {
        ...mysqlClient.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body) {
      throw new Error(friendlyHttpError(res.status, "خطا در ارسال پیام", body?.message || body?.error));
    }
    return body as SendChatMessageResponse;
  },
};

export async function transcribeDictationBlob(blob: Blob): Promise<string> {
  const mime = (blob.type || "audio/webm").split(";")[0].trim().toLowerCase();
  const ext = mime.includes("mp4") || mime.includes("m4a")
    ? "m4a"
    : mime.includes("ogg")
      ? "ogg"
      : mime.includes("wav")
        ? "wav"
        : "webm";

  const form = new FormData();
  const file = new File([blob], `dictation.${ext}`, { type: mime || "audio/webm" });
  form.append("audio", file);

  const res = await fetch(`${API_BASE_URL}/dictation/transcribe`, {
    method: "POST",
    headers: {
      ...mysqlClient.getAuthHeaders(),
    },
    body: form,
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body) {
    throw new Error(friendlyHttpError(res.status, "تبدیل گفتار به متن ناموفق بود", body?.message));
  }
  return String(body.text || "").trim();
}

export async function aiEditMeetingApi(meetingId: string, prompt: string): Promise<AiEditMeetingResponse> {
  const res = await fetch(`${API_BASE_URL}/meetings/${encodeURIComponent(meetingId)}/ai-edit`, {
    method: "POST",
    headers: {
      ...mysqlClient.getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body) {
    throw new Error(friendlyHttpError(res.status, "ویرایش هوشمند ناموفق بود", body?.message));
  }
  return body as AiEditMeetingResponse;
}
