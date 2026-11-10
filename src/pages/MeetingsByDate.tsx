import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Loader2, Mic } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { mysqlClient } from "@/lib/mysql-client";
import { useLocalDraft } from "@/hooks/useLocalDraft";
import {
  DraftStatus,
  formatJalaliDateTime,
  formatJalaliGroupLabel,
  parseApiDate,
} from "@/lib/neshastyarStatus";
import {
  MeetingListCard,
  NeshastyarCard,
  NeshastyarSubHeader,
  NeshastyarTopBar,
  StatusChip,
} from "@/components/neshastyar/NeshastyarUi";

interface DatabaseMeeting {
  id: string;
  title?: string | null;
  status?: string | null;
  meeting_date?: string | null;
  created_at?: string | null;
}

const MeetingsByDate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const localDraft = useLocalDraft();

  const {
    data: meetings = [],
    isLoading,
    error,
    refetch,
  } = useQuery<DatabaseMeeting[]>({
    queryKey: ["meetings", user?.id, "by-date"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error: fetchErr } = await mysqlClient
        .from("meetings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchErr) {
        throw new Error(fetchErr.message || "خطا در بارگذاری جلسات");
      }
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(user),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const groups = useMemo(() => {
    const sorted = [...meetings].sort((a, b) => {
      const ta =
        parseApiDate(a.created_at)?.getTime() ??
        parseApiDate(a.meeting_date)?.getTime() ??
        0;
      const tb =
        parseApiDate(b.created_at)?.getTime() ??
        parseApiDate(b.meeting_date)?.getTime() ??
        0;
      return tb - ta;
    });

    const map = new Map<string, DatabaseMeeting[]>();
    for (const meeting of sorted) {
      const d =
        parseApiDate(meeting.meeting_date) ??
        parseApiDate(meeting.created_at) ??
        new Date();
      const label = formatJalaliGroupLabel(d) || "امروز";
      const list = map.get(label) ?? [];
      list.push(meeting);
      map.set(label, list);
    }
    return Array.from(map.entries()).map(([label, list]) => ({ label, meetings: list }));
  }, [meetings]);

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#FBF9F4] text-[#1C1B18] pb-safe">
      <NeshastyarTopBar />

      <main className="mx-auto w-full max-w-2xl px-4 pb-10">
        <NeshastyarSubHeader title="لیست جلسات بر حسب تاریخ" onBack="/home" />

        {isLoading && !localDraft ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
          </div>
        ) : error && groups.length === 0 && !localDraft ? (
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
        ) : groups.length === 0 && !localDraft ? (
          <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
            <Mic className="h-10 w-10 text-[#0D4D4D]" />
            <p className="font-semibold text-[#1C1B18]">هنوز جلسه‌ای ندارید</p>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            {localDraft ? (
              <NeshastyarCard
                accentBar={
                  localDraft.status === DraftStatus.ON_UPLOADING ||
                  localDraft.status === DraftStatus.ON_RECORDING
                }
                onClick={() =>
                  navigate(
                    localDraft.status === DraftStatus.ON_RECORDING
                      ? "/record"
                      : "/tag-selection",
                  )
                }
                className="p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="line-clamp-2 flex-1 text-[15px] font-semibold text-[#1C1B18]">
                    {localDraft.title}
                  </span>
                  <StatusChip status={localDraft.status} />
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[12px] text-[#66625B]">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{formatJalaliDateTime(localDraft.createdAt)}</span>
                </div>
              </NeshastyarCard>
            ) : null}

            {groups.map((group) => (
              <div key={group.label} className="space-y-3">
                <h2 className="pt-2 text-[16px] font-semibold text-[#404848]">
                  {group.label}
                </h2>
                {group.meetings.map((meeting) => (
                  <MeetingListCard
                    key={meeting.id}
                    title={meeting.title}
                    status={meeting.status}
                    meetingDate={meeting.meeting_date}
                    createdAt={meeting.created_at}
                    onClick={() => navigate(`/meeting/${meeting.id}`)}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MeetingsByDate;
