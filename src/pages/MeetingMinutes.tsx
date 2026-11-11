import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useParams } from "react-router-dom";
import { Copy, Download, Loader2, Printer, Share2 } from "lucide-react";
import MeetingMinutesReport from "@/components/report/MeetingMinutesReport";
import {
  MeetingDetailBottomBar,
  MeetingTopSectionActions,
} from "@/components/neshastyar/MeetingDetailChrome";
import {
  NeshastyarCard,
  NeshastyarField,
  NeshastyarPrimaryButton,
  NeshastyarSecondaryButton,
  NeshastyarSubHeader,
  NeshastyarTopBar,
} from "@/components/neshastyar/NeshastyarUi";
import { useToast } from "@/hooks/use-toast";
import { downloadMeetingDocx } from "@/lib/exportMeetingDocx";
import {
  fetchPublicReport,
  parseReportDateInput,
  updatePublicReport,
  uploadReportLogo,
  type MeetingReportData,
  type ReportEdit,
} from "@/lib/meetingReport";
import { mysqlClient } from "@/lib/mysql-client";
import { isErrorStatus } from "@/lib/neshastyarStatus";

const SHEET_PX = 210 * 3.779527559;

function FitMinutes({
  contentKey,
  children,
}: {
  contentKey: string;
  children: React.ReactNode;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const measure = useCallback(() => {
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    if (!frame || !sheet) return;
    const next = Math.min(1, frame.clientWidth / SHEET_PX);
    setScale(next);
    setHeight(sheet.scrollHeight * next);
  }, []);

  useLayoutEffect(() => {
    measure();
    const frame = frameRef.current;
    const sheet = sheetRef.current;
    if (!frame || !sheet) return;
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, [measure, contentKey]);

  return (
    <div ref={frameRef} className="minutes-fit relative w-full overflow-hidden print:overflow-visible">
      <div className="print:!h-auto" style={{ height }}>
        <div
          ref={sheetRef}
          className="absolute right-0 top-0 print:static print:!w-auto print:!transform-none"
          style={{
            width: "210mm",
            transform: `scale(${scale})`,
            transformOrigin: "top right",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

const MeetingMinutesPage: React.FC = () => {
  const { meetingId = "" } = useParams<{ meetingId: string }>();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [report, setReport] = useState<MeetingReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [meetingStatus, setMeetingStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!meetingId) return;
    setLoading(true);
    setError(null);
    try {
      const meetingRes = await mysqlClient
        .from("meetings")
        .select("status")
        .eq("id", meetingId)
        .eq("user_id", user?.id || "")
        .single();
      setMeetingStatus(
        meetingRes.data && typeof meetingRes.data.status === "string"
          ? meetingRes.data.status
          : null,
      );
      const { data, error: shareErr } = await mysqlClient.shareMeeting(meetingId);
      if (shareErr || !data?.url) {
        throw new Error(
          (shareErr as { message?: string } | null)?.message ||
            "ساخت لینک صورتجلسه ناموفق بود",
        );
      }
      const nextToken =
        data.token || data.url.split("/report/")[1]?.split("?")[0] || "";
      if (!nextToken) throw new Error("ساخت لینک صورتجلسه ناموفق بود");
      const nextReport = await fetchPublicReport(nextToken);
      setToken(nextToken);
      setShareUrl(data.url);
      setReport(nextReport);
    } catch (err) {
      setToken(null);
      setShareUrl(null);
      setReport(null);
      setError(err instanceof Error ? err.message : "صورتجلسه پیدا نشد");
    } finally {
      setLoading(false);
    }
  }, [meetingId, user?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveCell = async (edit: ReportEdit) => {
    if (!token) return;
    let payload = edit;
    if (edit.field === "date") {
      const parsed = parseReportDateInput(edit.value);
      if (parsed == null) {
        throw new Error("تاریخ را مثل 1405/08/11 - 16:54 وارد کنید");
      }
      payload = { field: "date", value: parsed };
    }
    setReport(await updatePublicReport(token, payload));
  };

  const uploadLogo = async (file: File) => {
    if (!token) return;
    setReport(await uploadReportLogo(token, file));
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "لینک صورتجلسه کپی شد" });
    } catch {
      toast({ title: "کپی لینک ناموفق بود", variant: "destructive" });
    }
  };

  const shareLink = async () => {
    if (!shareUrl) return;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "صورتجلسه", text: shareUrl, url: shareUrl });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    await copyLink();
  };

  const disableLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: disErr } = await mysqlClient.disableMeetingShare(meetingId);
      if (disErr) throw new Error(disErr.message || "غیرفعال کردن لینک ناموفق بود");
      setToken(null);
      setShareUrl(null);
      setReport(null);
      toast({ title: "لینک صورتجلسه غیرفعال شد" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "غیرفعال کردن لینک ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  const showParticipants = meetingStatus != null && !isErrorStatus(meetingStatus);

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#FBF9F4] text-[#1C1B18] print:bg-white">
      <div className="print:hidden">
        <NeshastyarTopBar />
      </div>
      <main className="mx-auto w-full max-w-2xl px-4 pb-24 print:max-w-none print:p-0">
        <div className="print:hidden">
          <NeshastyarSubHeader
            title="صورتجلسه"
            onBack={`/meeting/${meetingId}`}
            actions={
              <MeetingTopSectionActions
                meetingId={meetingId}
                showParticipants={showParticipants}
              />
            }
          />
        </div>

        {loading ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
          </div>
        ) : error ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-[#B91C1C]">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="text-sm font-semibold text-[#0F766E]"
            >
              تلاش مجدد
            </button>
          </div>
        ) : report && shareUrl ? (
          <div className="mt-2 space-y-3">
            <NeshastyarCard className="space-y-3 print:hidden">
              <NeshastyarField
                label="لینک عمومی صورتجلسه"
                value={shareUrl}
                onChange={() => undefined}
                dir="ltr"
                disabled
              />
              <div className="grid grid-cols-2 gap-2">
                <NeshastyarSecondaryButton onClick={() => void copyLink()}>
                  <Copy className="h-4 w-4" />
                  کپی لینک
                </NeshastyarSecondaryButton>
                <NeshastyarSecondaryButton onClick={() => void shareLink()}>
                  <Share2 className="h-4 w-4" />
                  اشتراک‌گذاری
                </NeshastyarSecondaryButton>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NeshastyarSecondaryButton onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  چاپ / PDF
                </NeshastyarSecondaryButton>
                <NeshastyarSecondaryButton
                  disabled={downloading}
                  onClick={() => {
                    setDownloading(true);
                    void downloadMeetingDocx(report).finally(() => setDownloading(false));
                  }}
                >
                  <Download className="h-4 w-4" />
                  {downloading ? "در حال ساخت..." : "دانلود Word"}
                </NeshastyarSecondaryButton>
              </div>
              <button
                type="button"
                onClick={() => void disableLink()}
                className="mx-auto block px-3 py-1 text-[13px] text-[#B91C1C]"
              >
                غیرفعال کردن لینک
              </button>
            </NeshastyarCard>

            <FitMinutes
              contentKey={`${report.title}|${report.decisions.length}|${report.logoUrl ?? ""}`}
            >
              <MeetingMinutesReport
                report={report}
                onSave={saveCell}
                onUploadLogo={uploadLogo}
              />
            </FitMinutes>
          </div>
        ) : (
          <div className="mt-4">
            <NeshastyarPrimaryButton onClick={() => void load()}>
              ساخت لینک جدید صورتجلسه
            </NeshastyarPrimaryButton>
          </div>
        )}
      </main>
      <div className="print:hidden">
        <MeetingDetailBottomBar
          meetingId={meetingId}
          showProcessedSections={showParticipants}
        />
      </div>
    </div>
  );
};

export default MeetingMinutesPage;
