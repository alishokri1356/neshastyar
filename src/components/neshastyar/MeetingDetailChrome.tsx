import React, { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  ListChecks,
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
  NeshastyarSectionHeader,
} from "@/components/neshastyar/NeshastyarUi";
import { useSpeechInput } from "@/components/neshastyar/SpeechInputSheet";
import { aiEditMeetingApi, type AiEditMeetingResponse } from "@/lib/neshastyarApi";

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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8E2D5]/70 bg-white pb-safe"
    >
      <div className="mx-auto flex w-full max-w-2xl items-center px-1 py-1.5">
        {showProcessedSections ? (
          <BarAction
            icon={<Users className="h-5 w-5" />}
            label="حاضرین"
            active={path.includes(`/meeting/${meetingId}/participants`)}
            onClick={() => navigate(`/meeting/${meetingId}/participants`)}
          />
        ) : null}

        <BarAction
          icon={<Tag className="h-5 w-5" />}
          label="برچسب‌ها"
          active={path.includes(`/meeting/${meetingId}/tags`)}
          onClick={() => navigate(`/meeting/${meetingId}/tags`)}
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
      className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition ${
        active ? "font-bold text-[#0D4D4D]" : "text-[#404848] hover:text-[#0D4D4D]"
      }`}
    >
      <span className="text-[#0D4D4D]">{icon}</span>
      <span className="text-[11px] leading-[13px]">{label}</span>
    </button>
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
