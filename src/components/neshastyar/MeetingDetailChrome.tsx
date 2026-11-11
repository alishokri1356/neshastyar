import React, { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  ListChecks,
  Loader2,
  Menu,
  Mic,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  NeshastyarField,
  NeshastyarPrimaryButton,
  NeshastyarSecondaryButton,
  NeshastyarSectionHeader,
} from "@/components/neshastyar/NeshastyarUi";
import { useSpeechInput } from "@/components/neshastyar/SpeechInputSheet";
import { useToast } from "@/hooks/use-toast";
import { aiEditMeetingApi, type AiEditMeetingResponse } from "@/lib/neshastyarApi";
import { cn } from "@/lib/utils";

export function MeetingDetailBottomBar({
  meetingId,
  showProcessedSections = true,
  onAiEdit,
}: {
  meetingId: string;
  showProcessedSections?: boolean;
  onAiEdit?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const summaryPath = `/meeting/${meetingId}`;

  const openAiEdit = () => {
    if (onAiEdit) {
      onAiEdit();
    } else {
      navigate(`/meeting/${meetingId}?aiEdit=1`);
    }
  };

  return (
    <nav
      dir="rtl"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8E2D5]/60 bg-white pb-safe"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center px-1 py-1">
        <BarAction
          icon={<FileText className="h-5 w-5" />}
          label="خلاصه"
          active={path === summaryPath}
          onClick={() => {
            if (path !== summaryPath) navigate(summaryPath);
          }}
        />

        {showProcessedSections ? (
          <>
            <BarAction
              icon={<ListChecks className="h-5 w-5" />}
              label="نکات"
              active={path.includes(`/meeting/${meetingId}/points`)}
              onClick={() => navigate(`/meeting/${meetingId}/points`)}
            />
            <BarAction
              icon={<Sparkles className="h-5 w-5" />}
              label="ویرایش هوشمند"
              active={false}
              onClick={openAiEdit}
            />
          </>
        ) : null}

        <BarAction
          icon={<Menu className="h-5 w-5" />}
          label="گزینه‌ها"
          active={
            path.includes(`/meeting/${meetingId}/options`) ||
            path.includes(`/meeting/${meetingId}/meeting_details_options`) ||
            path.includes(`/meeting/${meetingId}/conversation`) ||
            path.includes(`/meeting/${meetingId}/transcription`)
          }
          onClick={() => navigate(`/meeting/${meetingId}/options`)}
        />
      </div>
    </nav>
  );
}

export function MeetingTopSectionActions({
  meetingId,
  showParticipants = true,
  participantsSelected = false,
  tagsSelected = false,
}: {
  meetingId: string;
  showParticipants?: boolean;
  participantsSelected?: boolean;
  tagsSelected?: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1.5">
      {showParticipants ? (
        <TopActionChip
          icon={<Users className="h-4 w-4" />}
          label="حاضرین"
          selected={participantsSelected}
          onClick={() => {
            if (!participantsSelected) {
              navigate(`/meeting/${meetingId}/participants`);
            }
          }}
        />
      ) : null}
      <TopActionChip
        icon={<Tag className="h-4 w-4" />}
        label="برچسب‌ها"
        selected={tagsSelected}
        onClick={() => {
          if (!tagsSelected) navigate(`/meeting/${meetingId}/tags`);
        }}
      />
    </div>
  );
}

function TopActionChip({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-[5px] rounded-full border px-2.5 py-1.5 text-[12px] leading-none",
        selected
          ? "border-[#0D4D4D]/50 bg-[#D7EFED] font-bold text-[#0D4D4D]"
          : "border-[#E8E2D5] bg-white font-medium text-[#1C1B18]",
      )}
    >
      <span className="text-[#0D4D4D]">{icon}</span>
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function BarAction({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center py-[3px]"
    >
      <span
        className={cn(
          "rounded-full px-3 py-0.5 text-[#0D4D4D]",
          active ? "bg-[#D7EFED]" : "bg-transparent",
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          "max-w-full truncate text-[11px] leading-[13px]",
          active ? "font-bold text-[#0D4D4D]" : "font-normal text-[#404848]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

export function ShareMinutesSheet({
  open,
  loading,
  shareUrl,
  shareToken,
  error,
  onOpenChange,
  onCreateLink,
  onDisableLink,
}: {
  open: boolean;
  loading: boolean;
  shareUrl: string | null;
  shareToken: string | null;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  onCreateLink: () => void;
  onDisableLink: () => void;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();

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

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (loading && !next) return;
        onOpenChange(next);
      }}
    >
      <DrawerContent
        dir="rtl"
        className="rounded-t-[24px] border-[#E8E2D5] bg-[#FBF9F4] text-[#1C1B18]"
      >
        <div className="mx-auto w-full max-w-lg px-5 pb-6 pt-4">
          <DrawerTitle className="sr-only">صورتجلسه قابل اشتراک</DrawerTitle>
          <NeshastyarSectionHeader
            title="صورتجلسه قابل اشتراک"
            subtitle="مشاهده، ویرایش جدول تصمیمات، ذخیره PDF و اشتراک‌گذاری لینک"
            icon={<FileText className="h-5 w-5" />}
            iconColor="#0F766E"
          />
          <DrawerDescription className="sr-only">
            مشاهده، ویرایش جدول تصمیمات، ذخیره PDF و اشتراک‌گذاری لینک
          </DrawerDescription>

          <div className="mt-3.5">
            {loading ? (
              <div className="flex justify-center py-5">
                <Loader2 className="h-6 w-6 animate-spin text-[#0D4D4D]" />
              </div>
            ) : shareUrl ? (
              <div className="space-y-3">
                <NeshastyarField
                  label="لینک عمومی صورتجلسه"
                  value={shareUrl}
                  onChange={() => undefined}
                  dir="ltr"
                  disabled
                />
                {shareToken ? (
                  <NeshastyarPrimaryButton
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/report/${encodeURIComponent(shareToken)}`);
                    }}
                  >
                    باز کردن و ویرایش صورتجلسه
                  </NeshastyarPrimaryButton>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <NeshastyarSecondaryButton onClick={() => void copyLink()}>
                    کپی لینک
                  </NeshastyarSecondaryButton>
                  <NeshastyarSecondaryButton onClick={() => void shareLink()}>
                    اشتراک‌گذاری
                  </NeshastyarSecondaryButton>
                </div>
                <button
                  type="button"
                  onClick={onDisableLink}
                  className="mx-auto block px-3 py-1.5 text-[13px] text-[#B91C1C]"
                >
                  غیرفعال کردن لینک
                </button>
              </div>
            ) : (
              <NeshastyarPrimaryButton onClick={onCreateLink}>
                ساخت لینک جدید صورتجلسه
              </NeshastyarPrimaryButton>
            )}
          </div>

          {error ? <p className="mt-2 text-[13px] text-[#B91C1C]">{error}</p> : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function AiEditBottomSheet({
  open,
  meetingId,
  onOpenChange,
  onEdited,
}: {
  open: boolean;
  meetingId: string;
  onOpenChange: (open: boolean) => void;
  onEdited?: (result: AiEditMeetingResponse) => void;
}) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendDictation = useCallback((text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setPrompt((prev) => [prev.trim(), cleaned].filter(Boolean).join(" "));
    setError(null);
  }, []);

  const { startSpeech, speechSheet } = useSpeechInput({
    prompt: "تغییرات مورد نظر را بگویید",
    onResult: appendDictation,
  });

  const submit = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await aiEditMeetingApi(meetingId, trimmed);
      setPrompt("");
      onOpenChange(false);
      await queryClient.invalidateQueries({ queryKey: ["meeting-detail", meetingId] });
      await queryClient.invalidateQueries({ queryKey: ["meetings"] });
      onEdited?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "ویرایش هوشمند ناموفق بود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (loading && !next) return;
          if (!next) setError(null);
          onOpenChange(next);
        }}
      >
        <DrawerContent
          dir="rtl"
          className="rounded-t-[24px] border-[#E8E2D5] bg-[#FBF9F4] text-[#1C1B18]"
        >
          <div className="mx-auto w-full max-w-lg px-5 pb-6 pt-4">
            <DrawerTitle className="sr-only">ویرایش با هوش مصنوعی</DrawerTitle>
            <NeshastyarSectionHeader
              title="ویرایش با هوش مصنوعی"
              icon={<Sparkles className="h-5 w-5" />}
              iconColor="#C88A2E"
            />
            <DrawerDescription className="mt-2 mb-3 text-right text-[13px] leading-6 text-[#66625B]">
              بنویسید یا بگویید چه چیزی تغییر کند؛ مثلاً تاریخ یا عنوان جلسه، محل، خلاصه، نکات، حاضرین یا برچسب‌ها. تغییرات مستقیم روی جلسه ذخیره می‌شود.
            </DrawerDescription>

            <NeshastyarField
              label="درخواست ویرایش"
              placeholder="مثلاً: رضا احمدی را به حاضرین اضافه کن و تاریخ را ۱۵ آبان بگذار"
              value={prompt}
              onChange={(v) => {
                setPrompt(v);
                if (error) setError(null);
              }}
              multiline
              rows={3}
              disabled={loading}
              trailingIcon={
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => void startSpeech()}
                  aria-label="ورودی صوتی"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-[#0D4D4D] hover:bg-[#D7EFED]/60"
                >
                  <Mic className="h-5 w-5" />
                </button>
              }
            />

            {loading ? (
              <p className="mt-2.5 text-[12px] text-[#66625B]">
                در حال اعمال تغییرات… ممکن است تا دو دقیقه طول بکشد
              </p>
            ) : null}

            {error ? (
              <p className="mt-2.5 text-[13px] text-[#B91C1C]">{error}</p>
            ) : null}

            <div className="mt-4">
              <NeshastyarPrimaryButton
                loading={loading}
                disabled={!prompt.trim() || loading}
                onClick={() => void submit()}
              >
                اعمال تغییرات
              </NeshastyarPrimaryButton>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {speechSheet}
    </>
  );
}
