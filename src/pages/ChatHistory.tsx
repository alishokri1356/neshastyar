import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, FileText, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { chatApi, type ChatSessionDto } from "@/lib/neshastyarApi";
import { formatJalaliDateTime } from "@/lib/neshastyarStatus";

const ChatHistory: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const meetingId = searchParams.get("meetingId")?.trim() || null;

  const [sessions, setSessions] = useState<ChatSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ChatSessionDto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = meetingId
        ? await chatApi.listSessions({ meetingId })
        : await chatApi.listSessions({ scope: "all" });
      setSessions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت تاریخچه گفتگو");
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const confirmDelete = async () => {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await chatApi.deleteSession(pendingDelete.id);
      setSessions((prev) => prev.filter((s) => s.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در حذف گفتگو");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] flex-col bg-[#FBF9F4] text-[#1C1B18] safe-top safe-bottom"
    >
      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-3.5 py-2.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="بازگشت"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#E8E2D5] bg-[#FBF9F4] text-[#1C1B18] transition hover:bg-[#F5F2EB]"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-[18px] font-bold text-[#1C1B18]">تاریخچه گفتگو</h1>
      </header>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-2">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
          </div>
        ) : error && sessions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-[14px] text-[#B91C1C]">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="text-[14px] font-semibold text-[#0F766E]"
            >
              تلاش مجدد
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center">
            <FileText className="h-10 w-10 text-[#66625B]" />
            <p className="text-[15px] text-[#66625B]">هنوز گفتگویی ندارید</p>
          </div>
        ) : (
          <div className="space-y-2.5 pb-6">
            {sessions.map((session) => {
              const whenText = formatJalaliDateTime(
                session.last_message_at || session.created_at,
              );
              const targetMeeting = session.meeting_id || meetingId;

              return (
                <div
                  key={session.id}
                  onClick={() =>
                    navigate(
                      targetMeeting
                        ? `/chat/${encodeURIComponent(session.id)}?meetingId=${encodeURIComponent(targetMeeting)}`
                        : `/chat/${encodeURIComponent(session.id)}`,
                    )
                  }
                  className="group flex cursor-pointer items-start justify-between gap-3 rounded-[18px] border border-[#E8E2D5] bg-white px-4 py-3.5 transition hover:border-[#0D4D4D]/40"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-[15px] font-semibold text-[#1C1B18]">
                      {session.title?.trim() ? session.title : "گفتگو"}
                    </h2>
                    {session.last_message_preview ? (
                      <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-[#66625B]">
                        {session.last_message_preview}
                      </p>
                    ) : null}
                    {whenText ? (
                      <p className="mt-1.5 text-[12px] text-[#66625B]">{whenText}</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    aria-label="حذف گفتگو"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(session);
                    }}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#66625B] transition hover:bg-[#FDF2F0] hover:text-[#B91C1C]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <DialogContent dir="rtl" className="border-[#E8E2D5] bg-white text-right">
          <DialogHeader>
            <DialogTitle className="text-right text-[#1C1B18]">حذف گفتگو</DialogTitle>
            <DialogDescription className="text-right text-[#404848]">
              این گفتگو حذف شود؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-start">
            <button
              type="button"
              disabled={deleting}
              onClick={() => void confirmDelete()}
              className="rounded-xl bg-[#B91C1C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#991B1B] disabled:opacity-50"
            >
              {deleting ? "..." : "حذف"}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
              className="rounded-xl border border-[#E8E2D5] px-4 py-2 text-sm text-[#1C1B18] hover:bg-[#F5F2EB]"
            >
              انصراف
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatHistory;
