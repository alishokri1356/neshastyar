import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Edit3,
  Loader2,
  Save,
  Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { mysqlClient } from "@/lib/mysql-client";
import AnalyzeModelSelect from "@/components/AnalyzeModelSelect";
import { getModelLabel, useAnalyzeModels } from "@/lib/analyzeModels";
import {
  editableSummaryToJson,
  emptyEditableSummary,
  formatEditableSummaryForClipboard,
  htmlToPlainText,
  isHtmlContent,
  jsonToEditableSummary,
  parseMeetingSummaryJson,
  type EditableMeetingSummary,
} from "@/lib/meetingSummary";
import {
  formatJalaliDateTime,
  isErrorStatus,
  isProcessedStatus,
} from "@/lib/neshastyarStatus";
import {
  NeshastyarCard,
  NeshastyarField,
  NeshastyarPrimaryButton,
  NeshastyarSecondaryButton,
  NeshastyarSectionHeader,
  NeshastyarTopBar,
  StatusChip,
} from "@/components/neshastyar/NeshastyarUi";
import {
  AiEditBottomSheet,
  MeetingDetailBottomBar,
  MeetingTopSectionActions,
  ShareMinutesSheet,
} from "@/components/neshastyar/MeetingDetailChrome";

interface LinkedParticipant {
  id: string;
  name: string;
  email?: string | null;
}

const MeetingDetail: React.FC = () => {
  const { meetingId = "" } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: analyzeModelsData } = useAnalyzeModels();

  const API_BASE_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:3001/api"
  ).replace(/\/$/, "");

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editSummaryText, setEditSummaryText] = useState("");

  const [analyzeModel, setAnalyzeModel] = useState("auto");
  const [reprocessing, setReprocessing] = useState(false);
  const [summarySuppressed, setSummarySuppressed] = useState(false);

  const [showAiEditSheet, setShowAiEditSheet] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [feedbackErr, setFeedbackErr] = useState<string | null>(null);

  // Open AI Edit sheet automatically if navigated with ?aiEdit=1 from sub-screens
  useEffect(() => {
    if (searchParams.get("aiEdit") === "1") {
      setShowAiEditSheet(true);
      const next = new URLSearchParams(searchParams);
      next.delete("aiEdit");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["meeting-detail", meetingId],
    queryFn: async () => {
      if (!meetingId || !user) return null;

      const [meetingRes, peopleRes] = await Promise.all([
        mysqlClient
          .from("meetings")
          .select("*")
          .eq("id", meetingId)
          .eq("user_id", user.id)
          .single(),
        mysqlClient.meetingParticipants.getForMeeting(meetingId),
      ]);

      if (meetingRes.error || !meetingRes.data) {
        throw new Error(meetingRes.error?.message || "جلسه پیدا نشد");
      }

      const meeting = meetingRes.data;
      const participants: LinkedParticipant[] = Array.isArray(peopleRes.data)
        ? peopleRes.data
        : [];

      return { meeting, participants };
    },
    enabled: Boolean(meetingId && user),
    staleTime: 8_000,
    refetchInterval: 20_000,
  });

  const meeting = data?.meeting ?? null;
  const participants = data?.participants ?? [];

  useEffect(() => {
    if (meeting?.analyze_model) {
      setAnalyzeModel(meeting.analyze_model);
    }
  }, [meeting?.analyze_model]);

  const rawSummary = String(meeting?.summary || "");
  const parsedJson = useMemo(
    () => parseMeetingSummaryJson(rawSummary),
    [rawSummary],
  );

  const parsedSummary: EditableMeetingSummary = useMemo(() => {
    if (parsedJson) {
      return jsonToEditableSummary(parsedJson);
    }
    const plain = isHtmlContent(rawSummary)
      ? htmlToPlainText(rawSummary)
      : rawSummary.trim();
    return {
      ...emptyEditableSummary(),
      summaryText: plain,
      location: String(meeting?.location || ""),
    };
  }, [parsedJson, rawSummary, meeting?.location]);

  // Clear summarySuppressed once server finishes processing or fails
  useEffect(() => {
    if (!meeting) return;
    if (isProcessedStatus(meeting.status) || isErrorStatus(meeting.status)) {
      setSummarySuppressed(false);
    }
  }, [meeting?.status]);

  const startEditing = () => {
    if (!meeting) return;
    setEditTitle(meeting.title || "");
    setEditSubject(parsedSummary.subject);
    setEditLocation(parsedSummary.location || meeting.location || "");
    setEditSummaryText(
      isHtmlContent(parsedSummary.summaryText)
        ? htmlToPlainText(parsedSummary.summaryText)
        : parsedSummary.summaryText,
    );
    setFeedbackErr(null);
    setFeedbackMsg(null);
    setEditing(true);
  };

  const saveEditing = async () => {
    if (!meeting || saving) return;
    setSaving(true);
    setFeedbackErr(null);
    setFeedbackMsg(null);

    try {
      const nextJson = editableSummaryToJson(
        {
          subject: editSubject,
          location: editLocation,
          summaryText: editSummaryText,
          people: parsedSummary.people,
          bulletPoints: parsedSummary.bulletPoints,
          tags: parsedSummary.tags,
        },
        parsedJson,
      );

      const { error: updErr } = await mysqlClient
        .from("meetings")
        .update({
          title: editTitle.trim() || meeting.title,
          summary: nextJson,
          location: editLocation.trim() || null,
        } as Record<string, unknown>)
        .eq("id", meeting.id);

      if (updErr) throw new Error(updErr.message || "ذخیره تغییرات ناموفق بود");

      setEditing(false);
      setFeedbackMsg("ذخیره شد");
      await queryClient.invalidateQueries({ queryKey: ["meeting-detail", meetingId] });
      await queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } catch (err) {
      setFeedbackErr(err instanceof Error ? err.message : "ذخیره ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const requestReprocess = async () => {
    if (!meeting || reprocessing) return;
    setReprocessing(true);
    setFeedbackErr(null);
    setFeedbackMsg(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/meetings/${encodeURIComponent(meeting.id)}/analyze`,
        {
          method: "POST",
          headers: {
            ...mysqlClient.getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model: analyzeModel || "auto" }),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || "درخواست پردازش ناموفق بود");
      }

      setSummarySuppressed(true);
      setEditing(false);
      setFeedbackMsg("درخواست پردازش ارسال شد");
      await queryClient.invalidateQueries({ queryKey: ["meeting-detail", meetingId] });
      await queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } catch (err) {
      setFeedbackErr(
        err instanceof Error ? err.message : "درخواست پردازش ناموفق بود",
      );
    } finally {
      setReprocessing(false);
    }
  };

  const handleCopySummary = async () => {
    const approvedNames = participants.map((p) => p.name);
    const clip = formatEditableSummaryForClipboard(parsedSummary, approvedNames);
    if (!clip) {
      setFeedbackErr("خلاصه‌ای برای کپی وجود ندارد");
      return;
    }
    try {
      await navigator.clipboard.writeText(clip);
      setFeedbackMsg("موضوع، خلاصه، حاضرین تاییدشده و نکات کلیدی کپی شد");
      setFeedbackErr(null);
    } catch {
      setFeedbackErr("کپی به کلیپ‌بورد با خطا مواجه شد");
    }
  };

  const handleSendEmail = async () => {
    if (!meeting) return;
    setFeedbackErr(null);
    setFeedbackMsg(null);

    try {
      const emailWebhookBase =
        import.meta.env.VITE_EMAIL_WEBHOOK_URL ||
        `${API_BASE_URL.replace(/\/api\/?$/, "")}/sendmail`;
      const webhookUrl = `${emailWebhookBase.replace(/\/$/, "")}/${encodeURIComponent(
        meeting.id,
      )}`;

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
      setFeedbackMsg(
        json?.data?.userEmail
          ? `خلاصه جلسه به ایمیل ${json.data.userEmail} ارسال شد.`
          : "خلاصه جلسه به ایمیل شما ارسال شد.",
      );
    } catch (err) {
      setFeedbackErr(
        err instanceof Error ? err.message : "ارسال خلاصه به ایمیل ناموفق بود",
      );
    }
  };

  const ensureShareLink = async () => {
    if (!meeting || shareLoading) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const { data: shareData, error: shareErr } = await mysqlClient.shareMeeting(
        meeting.id,
      );
      if (shareErr || !shareData?.url) {
        throw new Error(
          (shareErr as { message?: string } | null)?.message ||
            "ساخت لینک صورتجلسه ناموفق بود",
        );
      }
      setShareUrl(shareData.url);
      const token =
        shareData.token ||
        shareData.url.split("/report/")[1]?.split("?")[0] ||
        "";
      setShareToken(token || null);
    } catch (err) {
      setShareError(
        err instanceof Error ? err.message : "ساخت لینک صورتجلسه ناموفق بود",
      );
    } finally {
      setShareLoading(false);
    }
  };

  const handleOpenShare = () => {
    if (!meeting) return;
    setShareSheetOpen(true);
    void ensureShareLink();
  };

  const handleDisableShare = async () => {
    if (!meeting || shareLoading) return;
    setShareLoading(true);
    setShareError(null);
    try {
      const { error: disErr } = await mysqlClient.disableMeetingShare(meeting.id);
      if (disErr) throw new Error(disErr.message || "غیرفعال کردن لینک ناموفق بود");
      setShareUrl(null);
      setShareToken(null);
      setFeedbackMsg("لینک صورتجلسه غیرفعال شد");
      setFeedbackErr(null);
    } catch (err) {
      setShareError(
        err instanceof Error ? err.message : "غیرفعال کردن لینک ناموفق بود",
      );
    } finally {
      setShareLoading(false);
    }
  };

  const status = meeting?.status || "";
  const processingFailed = isErrorStatus(status);
  const isProcessed = isProcessedStatus(status);
  const showProcessed = !processingFailed && !summarySuppressed;

  const analyzingModelKey = meeting?.analyzing_model || null;
  const analyzedByKey = meeting?.analyzed_by || null;
  const analyzingLabel = getModelLabel(
    analyzingModelKey,
    analyzeModelsData?.models,
    analyzeModelsData?.autoKey,
  );
  const analyzedByLabel = getModelLabel(
    analyzedByKey,
    analyzeModelsData?.models,
    analyzeModelsData?.autoKey,
  );

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#FBF9F4] text-[#1C1B18]">
      <NeshastyarTopBar />

      <main className="mx-auto w-full max-w-2xl px-4 pb-28">
        <div className="flex items-center gap-1 py-1">
          <button
            type="button"
            onClick={() => navigate("/home")}
            aria-label="بازگشت"
            className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#1C1B18] hover:bg-black/5"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          {meeting ? (
            <MeetingTopSectionActions
              meetingId={meetingId}
              showParticipants={showProcessed}
            />
          ) : null}
          <button
            type="button"
            disabled={!meeting || saving}
            onClick={() => {
              if (editing) void saveEditing();
              else startEditing();
            }}
            aria-label={editing ? "ذخیره" : "ویرایش"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#0D4D4D] hover:bg-[#D7EFED]/60 disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : editing ? (
              <Save className="h-5 w-5" />
            ) : (
              <Edit3 className="h-5 w-5" />
            )}
          </button>
        </div>

        {isLoading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
          </div>
        ) : error && !meeting ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-[#B91C1C]">{(error as Error).message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-sm font-semibold text-[#0F766E]"
            >
              تلاش مجدد
            </button>
          </div>
        ) : meeting ? (
          <div className="mt-1 space-y-3">
            {/* Header Info matching Android */}
            <div>
              <p className="text-[13px] text-[#66625B]">جزئیات جلسه ضبط شده</p>
              <div className="mt-1">
                {editing ? (
                  <NeshastyarField
                    label="عنوان جلسه"
                    value={editTitle}
                    onChange={setEditTitle}
                  />
                ) : (
                  <h1 className="text-[22px] font-bold leading-snug text-[#1C1B18]">
                    {meeting.title?.trim() ? meeting.title : "جلسه"}
                  </h1>
                )}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-[#66625B]">
                  {formatJalaliDateTime(meeting.meeting_date || meeting.created_at)}
                </span>
                <StatusChip status={status} />
                {!isProcessed && !processingFailed && analyzingModelKey ? (
                  <span className="text-[11px] text-[#66625B]">
                    • در حال تحلیل با {analyzingLabel}
                  </span>
                ) : isProcessed && analyzedByKey ? (
                  <span className="text-[11px] text-[#66625B]">
                    • تحلیل شده با {analyzedByLabel}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Error Banner if Processing Failed */}
            {processingFailed &&
            (parsedSummary.summaryText.trim() || rawSummary.trim()) ? (
              <div className="rounded-[12px] bg-[#FDF2F0] p-3.5 text-[14px] leading-7 text-[#B91C1C]">
                {parsedSummary.summaryText.trim() || rawSummary.trim()}
              </div>
            ) : null}

            {/* AI Executive Summary Card matching Android */}
            {showProcessed ? (
              <NeshastyarCard className="space-y-3.5">
                <NeshastyarSectionHeader
                  title="خلاصه اجرایی هوش مصنوعی"
                  icon={<Sparkles className="h-5 w-5" />}
                  iconColor="#C88A2E"
                />

                <DetailTextPart
                  label="موضوع"
                  value={parsedSummary.subject}
                  draft={editSubject}
                  editing={editing}
                  onChange={setEditSubject}
                />

                {editing ||
                parsedSummary.location.trim() ||
                editLocation.trim() ? (
                  <DetailTextPart
                    label="محل تشکیل جلسه"
                    value={parsedSummary.location}
                    draft={editLocation}
                    editing={editing}
                    onChange={setEditLocation}
                  />
                ) : null}

                <div>
                  {editing ? (
                    <NeshastyarField
                      label="خلاصه"
                      value={editSummaryText}
                      onChange={setEditSummaryText}
                      multiline
                      rows={6}
                    />
                  ) : (
                    <>
                      <p className="text-[14px] font-semibold text-[#404848]">
                        خلاصه
                      </p>
                      {!parsedSummary.summaryText.trim() ? (
                        <p className="mt-1 text-[15px] text-[#66625B]">—</p>
                      ) : isHtmlContent(parsedSummary.summaryText) ? (
                        <div
                          className="rich-text-body mt-1 text-[15px] text-[#1C1B18]"
                          dangerouslySetInnerHTML={{
                            __html: parsedSummary.summaryText,
                          }}
                        />
                      ) : (
                        <p className="mt-1 whitespace-pre-wrap text-[15px] leading-7 text-[#1C1B18]">
                          {parsedSummary.summaryText}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </NeshastyarCard>
            ) : null}

            {/* Action Buttons Row: Copy, Email, and Web's Shareable صورتجلسه */}
            {processingFailed ? (
              <div className="space-y-2.5">
                <AnalyzeModelSelect
                  value={analyzeModel}
                  onValueChange={setAnalyzeModel}
                  disabled={reprocessing}
                />
                <NeshastyarPrimaryButton
                  loading={reprocessing}
                  onClick={() => void requestReprocess()}
                >
                  درخواست پردازش مجدد
                </NeshastyarPrimaryButton>
              </div>
            ) : showProcessed ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <NeshastyarSecondaryButton onClick={() => void handleCopySummary()}>
                    کپی
                  </NeshastyarSecondaryButton>
                  <NeshastyarSecondaryButton onClick={() => void handleSendEmail()}>
                    ایمیل
                  </NeshastyarSecondaryButton>
                </div>
                {isProcessed ? (
                  <NeshastyarSecondaryButton onClick={handleOpenShare}>
                    صورتجلسه (مشاهده و اشتراک)
                  </NeshastyarSecondaryButton>
                ) : null}
              </div>
            ) : null}

            {feedbackMsg ? (
              <p className="text-[14px] text-[#0F766E]">{feedbackMsg}</p>
            ) : null}
            {feedbackErr ? (
              <p className="text-[14px] text-[#B91C1C]">{feedbackErr}</p>
            ) : null}
          </div>
        ) : null}
      </main>

      <MeetingDetailBottomBar
        meetingId={meetingId}
        showProcessedSections={showProcessed}
        onAiEdit={() => setShowAiEditSheet(true)}
      />

      {/* AI Smart Edit Sheet */}
      <AiEditBottomSheet
        open={showAiEditSheet}
        meetingId={meetingId}
        onOpenChange={setShowAiEditSheet}
        onEdited={(res) => {
          setSummarySuppressed(false);
          setEditing(false);
          setFeedbackMsg(
            res.changes_summary?.trim() || "ویرایش هوشمند انجام و ذخیره شد",
          );
          setFeedbackErr(null);
        }}
      />

      <ShareMinutesSheet
        open={shareSheetOpen}
        loading={shareLoading}
        shareUrl={shareUrl}
        shareToken={shareToken}
        error={shareError}
        onOpenChange={(open) => {
          if (!open) setShareError(null);
          setShareSheetOpen(open);
        }}
        onCreateLink={() => void ensureShareLink()}
        onDisableLink={() => void handleDisableShare()}
      />
    </div>
  );
};

export default MeetingDetail;

function DetailTextPart({
  label,
  value,
  draft,
  editing,
  onChange,
}: {
  label: string;
  value: string;
  draft: string;
  editing: boolean;
  onChange: (value: string) => void;
}) {
  if (editing) {
    return (
      <NeshastyarField
        label={label}
        value={draft}
        onChange={onChange}
      />
    );
  }
  return (
    <div>
      <p className="text-[14px] font-semibold text-[#404848]">{label}</p>
      <p
        className={`mt-1 text-[15px] leading-7 ${
          value.trim() ? "text-[#1C1B18]" : "text-[#66625B]"
        }`}
      >
        {value.trim() || "—"}
      </p>
    </div>
  );
}
