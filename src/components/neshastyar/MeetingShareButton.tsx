import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Share2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { mysqlClient } from "@/lib/mysql-client";
import {
  emptyEditableSummary,
  formatEditableSummaryForClipboard,
  htmlToPlainText,
  isHtmlContent,
  jsonToEditableSummary,
  parseMeetingSummaryJson,
} from "@/lib/meetingSummary";
import { isErrorStatus, isProcessedStatus } from "@/lib/neshastyarStatus";
import { useAuthStore } from "@/store/useAuthStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CachedMeeting = {
  id?: string;
  status?: string | null;
  summary?: string | null;
  location?: string | null;
};

type CachedDetail = {
  meeting?: CachedMeeting;
  participants?: { name?: string | null }[];
};

export function MeetingShareButton({ meetingId }: { meetingId: string }) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [shareLoading, setShareLoading] = useState(false);
  const [minutesOpen, setMinutesOpen] = useState(false);
  const [minutesUrl, setMinutesUrl] = useState<string | null>(null);
  const [canEditLink, setCanEditLink] = useState(true);
  const [minutesError, setMinutesError] = useState<string | null>(null);
  const [savingPermission, setSavingPermission] = useState(false);

  const [cached, setCached] = useState<CachedDetail | undefined>(() =>
    queryClient.getQueryData<CachedDetail>(["meeting-detail", meetingId]),
  );
  useEffect(() => {
    const read = () =>
      setCached(queryClient.getQueryData<CachedDetail>(["meeting-detail", meetingId]));
    read();
    return queryClient.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey;
      if (key[0] === "meeting-detail" && key[1] === meetingId) read();
    });
  }, [queryClient, meetingId]);

  const meeting = cached?.meeting;
  const failed = Boolean(meeting && isErrorStatus(meeting.status));
  const processed = Boolean(meeting && isProcessedStatus(meeting.status));
  const canCopy = !failed;
  const canEmail = !failed;
  const canMinutes = !meeting || processed;

  const notify = (message: string, error = false) => {
    toast({
      title: message,
      variant: error ? "destructive" : "default",
    });
  };

  const loadDetail = async (): Promise<CachedDetail | null> => {
    const stored = queryClient.getQueryData<CachedDetail>(["meeting-detail", meetingId]);
    let current = stored?.meeting;
    let people = stored?.participants;
    if (!current) {
      if (!user) return null;
      const meetingRes = await mysqlClient
        .from("meetings")
        .select("*")
        .eq("id", meetingId)
        .eq("user_id", user.id)
        .single();
      if (meetingRes.error || !meetingRes.data) return null;
      current = meetingRes.data;
    }
    if (!people) {
      const peopleRes = await mysqlClient.meetingParticipants.getForMeeting(meetingId);
      people = Array.isArray(peopleRes.data) ? peopleRes.data : [];
    }
    return { meeting: current, participants: people };
  };

  const copySummary = async () => {
    try {
      const detail = await loadDetail();
      const current = detail?.meeting;
      if (!current) {
        notify("خلاصه‌ای برای کپی وجود ندارد", true);
        return;
      }
      const rawSummary = String(current.summary || "");
      const parsedJson = parseMeetingSummaryJson(rawSummary);
      const parsed = parsedJson
        ? jsonToEditableSummary(parsedJson)
        : {
            ...emptyEditableSummary(),
            summaryText: isHtmlContent(rawSummary)
              ? htmlToPlainText(rawSummary)
              : rawSummary.trim(),
            location: String(current.location || ""),
          };
      const names = (detail?.participants ?? [])
        .map((person) => person.name || "")
        .filter(Boolean);
      const clip = formatEditableSummaryForClipboard(parsed, names);
      if (!clip) {
        notify("خلاصه‌ای برای کپی وجود ندارد", true);
        return;
      }
      await navigator.clipboard.writeText(clip);
      notify("موضوع، خلاصه، حاضرین تاییدشده و نکات کلیدی کپی شد");
    } catch {
      notify("کپی به کلیپ‌بورد با خطا مواجه شد", true);
    }
  };

  const sendEmail = async () => {
    try {
      const apiBase = (
        import.meta.env.VITE_API_URL || "http://localhost:3001/api"
      ).replace(/\/$/, "");
      const emailWebhookBase =
        import.meta.env.VITE_EMAIL_WEBHOOK_URL ||
        `${apiBase.replace(/\/api\/?$/, "")}/sendmail`;
      const webhookUrl = `${emailWebhookBase.replace(/\/$/, "")}/${encodeURIComponent(meetingId)}`;
      const res = await fetch(webhookUrl, {
        method: "GET",
        headers: mysqlClient.getAuthHeaders(),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 429 && json?.cooldownRemaining) {
          throw new Error(
            `برای ارسال ایمیل بعدی ${json.cooldownRemaining} ثانیه صبر کنید.`,
          );
        }
        throw new Error(json?.message || "ارسال ایمیل ناموفق بود");
      }
      notify(
        json?.data?.userEmail
          ? `خلاصه جلسه به ایمیل ${json.data.userEmail} ارسال شد.`
          : "خلاصه جلسه به ایمیل شما ارسال شد.",
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : "ارسال خلاصه به ایمیل ناموفق بود", true);
    }
  };

  const openMinutes = async () => {
    if (shareLoading) return;
    setMinutesOpen(true);
    setShareLoading(true);
    setMinutesError(null);
    try {
      const { data: shareData, error: shareErr } = await mysqlClient.shareMeeting(meetingId);
      if (shareErr || !shareData?.url) {
        throw new Error(
          (shareErr as { message?: string } | null)?.message ||
            "ساخت لینک صورتجلسه ناموفق بود",
        );
      }
      setMinutesUrl(shareData.url);
      setCanEditLink(shareData.canEdit !== false);
    } catch (err) {
      setMinutesUrl(null);
      setMinutesError(err instanceof Error ? err.message : "ساخت لینک صورتجلسه ناموفق بود");
    } finally {
      setShareLoading(false);
    }
  };

  const changeLinkEdit = async (next: boolean) => {
    const previous = canEditLink;
    setCanEditLink(next);
    setSavingPermission(true);
    setMinutesError(null);
    try {
      const { data, error } = await mysqlClient.setMeetingShareCanEdit(meetingId, next);
      if (error || !data) {
        throw new Error(
          (error as { message?: string } | null)?.message || "ذخیره اجازه ویرایش ناموفق بود",
        );
      }
      if (data.url) setMinutesUrl(data.url);
      setCanEditLink(data.canEdit !== false);
    } catch (err) {
      setCanEditLink(previous);
      setMinutesError(err instanceof Error ? err.message : "ذخیره اجازه ویرایش ناموفق بود");
    } finally {
      setSavingPermission(false);
    }
  };

  const copyMinutesLink = async () => {
    if (!minutesUrl) return;
    try {
      await navigator.clipboard.writeText(minutesUrl);
      notify("لینک صورتجلسه کپی شد");
    } catch {
      notify("کپی لینک ناموفق بود", true);
    }
  };

  const viewMinutes = () => {
    if (!minutesUrl) return;
    window.open(minutesUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="اشتراک"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#0D4D4D] transition hover:bg-[#0D4D4D]/10"
        >
          <Share2 className="h-[24px] w-[24px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40 text-right">
        <DropdownMenuItem disabled={!canCopy} onSelect={() => void copySummary()}>
          کپی
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canEmail} onSelect={() => void sendEmail()}>
          ایمیل
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!canMinutes || shareLoading}
          onSelect={() => {
            window.setTimeout(() => {
              void openMinutes();
            }, 0);
          }}
        >
          {shareLoading ? "در حال باز کردن..." : "صورتجلسه"}
        </DropdownMenuItem>
      </DropdownMenuContent>
      <Dialog open={minutesOpen} onOpenChange={setMinutesOpen}>
        <DialogContent
          dir="rtl"
          className="border-[#E8E2D5] bg-[#FBF9F4] text-right text-[#1C1B18] [&>button.absolute]:hidden"
        >
          <DialogTitle className="text-right text-[#0D4D4D]">صورتجلسه</DialogTitle>
          <DialogDescription className="sr-only">
            لینک صورتجلسه، کپی، نمایش و اجازه ویرایش
          </DialogDescription>
          {shareLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-[#0D4D4D]" />
            </div>
          ) : (
            <div className="space-y-3">
              <div
                dir="ltr"
                className="break-all rounded-[12px] border border-[#E8E2D5] bg-white px-3 py-2.5 text-left text-[13px] leading-6 text-[#1C1B18]"
              >
                {minutesUrl || "لینکی ساخته نشد"}
              </div>
              <label className="flex items-center gap-2 text-[14px] text-[#1C1B18]">
                <Checkbox
                  checked={canEditLink}
                  disabled={!minutesUrl || savingPermission}
                  onCheckedChange={(value) => void changeLinkEdit(value === true)}
                />
                <span>دارنده لینک می‌تواند صورتجلسه را ویرایش کند</span>
              </label>
              {minutesError ? (
                <p className="text-[13px] text-[#B91C1C]">{minutesError}</p>
              ) : null}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={!minutesUrl}
                  onClick={() => void copyMinutesLink()}
                  className="h-11 rounded-[12px] border border-[#0D4D4D]/40 text-[14px] font-medium text-[#0F766E] disabled:opacity-40"
                >
                  کپی
                </button>
                <button
                  type="button"
                  disabled={!minutesUrl}
                  onClick={viewMinutes}
                  className="h-11 rounded-[12px] bg-[#0D4D4D] text-[14px] font-semibold text-white disabled:opacity-40"
                >
                  نمایش
                </button>
                <button
                  type="button"
                  onClick={() => setMinutesOpen(false)}
                  className="h-11 rounded-[12px] border border-[#E8E2D5] text-[14px] text-[#404848]"
                >
                  بستن
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DropdownMenu>
  );
}
