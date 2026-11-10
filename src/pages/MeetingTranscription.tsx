import React from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { mysqlClient } from "@/lib/mysql-client";
import { htmlToPlainText, isHtmlContent } from "@/lib/meetingSummary";
import { isErrorStatus } from "@/lib/neshastyarStatus";
import {
  NeshastyarCard,
  NeshastyarSubHeader,
  NeshastyarTopBar,
} from "@/components/neshastyar/NeshastyarUi";
import { MeetingDetailBottomBar } from "@/components/neshastyar/MeetingDetailChrome";

const MeetingTranscription: React.FC = () => {
  const { meetingId = "" } = useParams<{ meetingId: string }>();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["meeting-transcription", meetingId],
    queryFn: async () => {
      if (!meetingId) return null;

      const {
        data: { user },
      } = await mysqlClient.auth.getUser();
      if (!user) return null;

      const { data: meetingData, error: fetchErr } = await mysqlClient
        .from("meetings")
        .select("id, title, status, transcription")
        .eq("id", meetingId)
        .eq("user_id", user.id)
        .single();

      if (fetchErr || !meetingData) {
        throw new Error(fetchErr?.message || "جلسه یافت نشد");
      }

      return {
        title: meetingData.title || "جلسه",
        status: meetingData.status || "",
        transcription: String(meetingData.transcription || ""),
      };
    },
    enabled: Boolean(meetingId),
    staleTime: 60_000,
  });

  const rawText = (data?.transcription ?? "").trim();
  const plain = isHtmlContent(rawText) ? htmlToPlainText(rawText) : rawText;

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#FBF9F4] text-[#1C1B18]">
      <NeshastyarTopBar />

      <main className="mx-auto w-full max-w-2xl px-4 pb-24">
        <NeshastyarSubHeader
          title="جزییات مکالمات"
          onBack={`/meeting/${meetingId}/options`}
        />

        {isLoading ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
          </div>
        ) : error ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-[#B91C1C]">{(error as Error).message}</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-sm font-semibold text-[#0F766E]"
            >
              تلاش مجدد
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <NeshastyarCard>
              <p
                className={`whitespace-pre-wrap break-words text-[15px] leading-8 ${
                  plain ? "text-[#1C1B18]" : "text-[#66625B]"
                }`}
              >
                {plain || "جزییات مکالمات این جلسه موجود نیست."}
              </p>
            </NeshastyarCard>
          </div>
        )}
      </main>

      <MeetingDetailBottomBar
        meetingId={meetingId}
        showProcessedSections={!isErrorStatus(data?.status)}
      />
    </div>
  );
};

export default MeetingTranscription;
