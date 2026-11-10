import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Copy,
  History,
  Loader2,
  Mic,
  Plus,
  RefreshCw,
  SendHorizontal,
} from "lucide-react";
import { chatApi, type ChatMessageDto } from "@/lib/neshastyarApi";
import { useSpeechInput } from "@/components/neshastyar/SpeechInputSheet";
import { useToast } from "@/hooks/use-toast";

const GLOBAL_SUGGESTIONS = ["اقدامات باز اخیر", "جلسات این هفته", "تصمیم‌های مهم"];
const MEETING_SUGGESTIONS = ["فهرست اقدامات", "نوشتن ایمیل پیگیری", "خلاصه تصمیم‌ها"];

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const { sessionKey } = useParams<{ sessionKey?: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const initialMeetingId = searchParams.get("meetingId")?.trim() || null;
  const initialSessionId =
    sessionKey && sessionKey !== "new" && sessionKey !== "null" ? sessionKey : null;

  const [meetingId, setMeetingId] = useState<string | null>(initialMeetingId);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [scopeLabel, setScopeLabel] = useState<string>(
    initialMeetingId ? "این جلسه" : "همه جلسات",
  );
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [loadingSession, setLoadingSession] = useState<boolean>(Boolean(initialSessionId));
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomEndRef = useRef<HTMLDivElement>(null);

  const appendDictation = useCallback((text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setInput((prev) => [prev.trim(), cleaned].filter(Boolean).join(" "));
    setError(null);
  }, []);

  const { startSpeech, speechSheet } = useSpeechInput({
    prompt: "سؤال خود را بگویید",
    onResult: appendDictation,
  });

  useEffect(() => {
    setMeetingId(initialMeetingId);
    setSessionId(initialSessionId);
    setScopeLabel(initialMeetingId ? "این جلسه" : "همه جلسات");
    setError(null);

    if (!initialSessionId) {
      setMessages([]);
      setLoadingSession(false);
      return;
    }

    let cancelled = false;
    setLoadingSession(true);
    chatApi
      .getSession(initialSessionId)
      .then((data) => {
        if (cancelled) return;
        setSessionId(data.id);
        setMeetingId(data.meeting_id || initialMeetingId);
        setScopeLabel(data.scope === "meeting" || data.meeting_id ? "این جلسه" : "همه جلسات");
        setMessages(data.messages || []);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || "خطا در بارگذاری گفتگو");
      })
      .finally(() => {
        if (!cancelled) setLoadingSession(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialMeetingId, initialSessionId]);

  useEffect(() => {
    bottomEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, sending]);

  const send = async (overrideContent?: string) => {
    const question = (overrideContent ?? input).trim();
    if (!question || sending) return;

    setSending(true);
    setError(null);
    if (overrideContent === undefined) setInput("");

    try {
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const created = await chatApi.createSession(meetingId);
        currentSessionId = created.id;
        setSessionId(created.id);
        if (created.messages?.length) {
          setMessages(created.messages);
        }
      }

      const optimisticUser: ChatMessageDto = {
        id: `temp-user-${Date.now()}`,
        role: "user",
        content: question,
      };
      setMessages((prev) => [...prev, optimisticUser]);

      const result = await chatApi.sendMessage(currentSessionId, question);
      const nextSession = result.session;
      const nextMessages =
        nextSession?.messages ??
        [
          ...messages,
          ...(result.userMessage ? [result.userMessage] : [optimisticUser]),
          ...(result.assistantMessage ? [result.assistantMessage] : []),
        ];

      setMessages(nextMessages);
      if (nextSession?.id) setSessionId(nextSession.id);
      if (result.assistantMessage?.status === "error") {
        setError(result.assistantMessage.content || null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در گفتگو");
    } finally {
      setSending(false);
    }
  };

  const retryLast = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user" && messages[i].content.trim()) {
        void send(messages[i].content);
        return;
      }
    }
  };

  const copyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "کپی شد" });
    } catch {
      toast({ title: "کپی انجام نشد", variant: "destructive" });
    }
  };

  const handleBack = () => {
    if (meetingId) {
      navigate(`/meeting/${meetingId}`);
    } else {
      navigate("/home");
    }
  };

  const suggestions = meetingId ? MEETING_SUGGESTIONS : GLOBAL_SUGGESTIONS;
  const canSend = input.trim().length > 0 && !sending;

  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] flex-col bg-[#FBF9F4] text-[#1C1B18] safe-top safe-bottom"
    >
      {/* Chat Header matching Android ChatHeader */}
      <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-3.5 py-2.5">
        <button
          type="button"
          onClick={handleBack}
          aria-label="بازگشت"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E2D5] bg-[#FBF9F4] text-[#1C1B18] transition hover:bg-[#F5F2EB]"
        >
          <ArrowRight className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2">
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={() =>
                navigate(meetingId ? `/chat/new?meetingId=${encodeURIComponent(meetingId)}` : "/chat/new")
              }
              aria-label="گفتگوی جدید"
              title="گفتگوی جدید"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E2D5] bg-[#FBF9F4] text-[#1C1B18] transition hover:bg-[#F5F2EB]"
            >
              <Plus className="h-5 w-5" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              navigate(
                meetingId
                  ? `/chat-history?meetingId=${encodeURIComponent(meetingId)}`
                  : "/chat-history",
              )
            }
            aria-label="تاریخچه گفتگو"
            title="تاریخچه گفتگو"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E2D5] bg-[#FBF9F4] text-[#1C1B18] transition hover:bg-[#F5F2EB]"
          >
            <History className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Messages or Empty State */}
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col overflow-y-auto px-4 py-3">
        {loadingSession ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
          </div>
        ) : messages.length === 0 && !sending ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <h1
              className="text-[28px] font-medium leading-[42px] text-[#1C1B18]"
              style={{ fontFamily: "'Noto Naskh Arabic', 'Vazirmatn', Georgia, serif" }}
            >
              {meetingId
                ? "هر چیزی درباره این جلسه بپرسید"
                : "هر چیزی درباره جلسات‌تان بپرسید"}
            </h1>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-[14px] text-[#66625B]">گفتگو درباره</span>
              <span className="rounded-full border border-[#E8E2D5] px-3 py-1.5 text-[13px] text-[#1C1B18]">
                {scopeLabel}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-end space-y-2.5">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const failed = msg.role === "assistant" && msg.status === "error";
              return (
                <div
                  key={msg.id}
                  className={`flex w-full ${isUser ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`flex max-w-[85%] flex-col sm:max-w-[440px] ${
                      isUser ? "items-start" : "items-end"
                    }`}
                  >
                    <div
                      className={`whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-3 text-[15px] leading-6 ${
                        failed
                          ? "bg-[#FDF2F0] text-[#B91C1C]"
                          : isUser
                            ? "bg-[#D7EFED] text-[#1C1B18]"
                            : "border border-[#E8E2D5] bg-white text-[#1C1B18]"
                      }`}
                    >
                      {msg.content}
                    </div>
                    {!isUser ? (
                      <div className="mt-1 flex items-center gap-2.5 px-1">
                        {failed ? (
                          <button
                            type="button"
                            onClick={retryLast}
                            aria-label="تلاش مجدد"
                            className="text-[#66625B] hover:text-[#1C1B18]"
                          >
                            <RefreshCw className="h-[17px] w-[17px]" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => copyMessage(msg.content)}
                            aria-label="کپی"
                            className="text-[#66625B] hover:text-[#1C1B18]"
                          >
                            <Copy className="h-[17px] w-[17px]" />
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {sending ? (
              <div className="flex w-full justify-end">
                <div className="w-full max-w-[85%] rounded-[18px] border border-[#E8E2D5] bg-white px-3.5 py-3 text-[14px] text-[#66625B] sm:max-w-[440px]">
                  در حال فکر کردن…
                </div>
              </div>
            ) : null}

            <div ref={bottomEndRef} />
          </div>
        )}
      </div>

      {/* Error when empty */}
      {error && messages.length === 0 ? (
        <div className="mx-auto w-full max-w-2xl px-5 py-1 text-[13px] text-[#B91C1C]">
          {error}
        </div>
      ) : null}

      {/* Suggestion chips */}
      {messages.length === 0 && !sending ? (
        <div className="mx-auto flex w-full max-w-2xl gap-2 overflow-x-auto px-4 py-2 no-scrollbar">
          {suggestions.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => void send(text)}
              className="shrink-0 rounded-full border border-[#E8E2D5] bg-[#FBF9F4] px-3.5 py-2.5 text-[13px] text-[#1C1B18] transition hover:bg-[#F5F2EB]"
            >
              {text}
            </button>
          ))}
        </div>
      ) : null}

      {/* Chat Input Bar matching Android ChatInputBar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="mx-auto flex w-full max-w-2xl items-center gap-2.5 px-3.5 py-3"
      >
        <div className="flex h-[54px] flex-1 items-center rounded-[28px] border border-[#E8E2D5] bg-white px-4">
          <input
            type="text"
            value={input}
            disabled={sending}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder="هر چیزی بپرسید"
            className="w-full bg-transparent text-[15px] text-[#1C1B18] placeholder:text-[#66625B] focus:outline-none disabled:opacity-60"
          />
        </div>

        <button
          type="button"
          disabled={sending}
          onClick={startSpeech}
          aria-label="ورودی صوتی"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#E8E2D5] bg-[#FBF9F4] text-[#1C1B18] transition hover:bg-[#F5F2EB] disabled:opacity-50"
        >
          <Mic className="h-5 w-5" />
        </button>

        <button
          type="submit"
          disabled={!canSend}
          aria-label="ارسال"
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition ${
            canSend
              ? "bg-[#0D4D4D] text-white hover:bg-[#0F766E]"
              : "bg-[#E8E2D5] text-[#66625B]"
          }`}
        >
          <SendHorizontal className="h-5 w-5 rotate-180" />
        </button>
      </form>

      {speechSheet}
    </div>
  );
};

export default Chat;
