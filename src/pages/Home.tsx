import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  FileText,
  Loader2,
  Mic,
  Phone,
  RefreshCw,
  Search,
  Tag,
  User,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { mysqlClient } from "@/lib/mysql-client";
import { useLocalDraft, type LocalDraftUi } from "@/hooks/useLocalDraft";
import {
  DraftStatus,
  formatJalaliGroupLabel,
  formatPersianClockTime,
  isAnalyzingStatus,
  isErrorStatus,
  parseApiDate,
} from "@/lib/neshastyarStatus";
import { StatusChip } from "@/components/neshastyar/NeshastyarUi";

interface DatabaseMeeting {
  id: string;
  meeting_date?: string | null;
  created_at?: string | null;
  status?: string | null;
  title?: string | null;
}

interface MeetingDateGroup {
  label: string;
  meetings: DatabaseMeeting[];
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const localDraft = useLocalDraft();

  const {
    data: meetings = [],
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<DatabaseMeeting[]>({
    queryKey: ["meetings", user?.id, "home-timeline"],
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
    refetchOnWindowFocus: true,
  });

  const groups: MeetingDateGroup[] = useMemo(() => {
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
    return Array.from(map.entries()).map(([label, list]) => ({
      label,
      meetings: list,
    }));
  }, [meetings]);

  const avatarChar =
    user?.name?.trim()?.charAt(0) ||
    user?.email?.trim()?.charAt(0)?.toUpperCase() ||
    "ک";

  const draftLabel = localDraft ? formatJalaliGroupLabel(localDraft.createdAt) : "";
  const openLocalDraft = (draft: LocalDraftUi) => {
    if (draft.status === DraftStatus.ON_RECORDING) {
      navigate("/record");
    } else {
      navigate("/tag-selection");
    }
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] flex-col bg-[#FBF9F4] text-[#1C1B18] safe-top safe-bottom"
    >
      {/* Android HomeHeader */}
      <header className="mx-auto w-full max-w-2xl px-[18px] pt-[18px] pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <RoundHomeButton
              onClick={() => navigate("/account/manage")}
              ariaLabel="تنظیمات و حساب کاربری"
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-[#D7EFED] text-[18px] font-bold text-[#0D4D4D]">
                {avatarChar}
              </span>
            </RoundHomeButton>

            <RoundHomeButton
              onClick={() => navigate("/search")}
              ariaLabel="جست‌وجو"
            >
              <Search className="h-[25px] w-[25px] text-[#66625B]" />
            </RoundHomeButton>
          </div>

          <div className="flex items-center gap-2">
            {isFetching && !isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[#66625B]" />
            ) : null}
            <RoundHomeButton
              onClick={() => navigate("/record")}
              ariaLabel="یادداشت صوتی جدید"
            >
              <Phone className="h-[23px] w-[23px] text-[#66625B]" />
            </RoundHomeButton>
          </div>
        </div>

        {/* Subtle editorial browse pills so Tags, Participants & By-Date remain 1-tap away on Web */}
        <div className="mt-3.5 flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <BrowsePill
            icon={<Tag className="h-3.5 w-3.5" />}
            label="برچسب‌ها"
            onClick={() => navigate("/tags")}
          />
          <BrowsePill
            icon={<Users className="h-3.5 w-3.5" />}
            label="شرکت‌کنندگان"
            onClick={() => navigate("/participants")}
          />
          <BrowsePill
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="بر حسب تاریخ"
            onClick={() => navigate("/meetings-by-date")}
          />
        </div>
      </header>

      {/* Main Timeline Body */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-[18px] pb-32 pt-1">
        {isLoading && !localDraft ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
          </div>
        ) : error && groups.length === 0 && !localDraft ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <p className="text-[14px] text-[#66625B]">
              {(error as Error).message || "خطا در بارگذاری جلسات"}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-[14px] font-bold text-[#0F766E]"
            >
              تلاش مجدد
            </button>
          </div>
        ) : groups.length === 0 && !localDraft ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 text-center">
            <User className="h-9 w-9 text-[#66625B]" />
            <p className="text-[15px] text-[#66625B]">هنوز یادداشتی ندارید</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {localDraft && !groups.some((g) => g.label === draftLabel) ? (
              <div className="space-y-2.5">
                <TimelineHeader label={draftLabel} />
                <DraftTimelineCard
                  draft={localDraft}
                  onClick={() => openLocalDraft(localDraft)}
                />
              </div>
            ) : null}

            {groups.map((group) => (
              <div key={group.label} className="space-y-2.5">
                <TimelineHeader label={group.label} />

                {localDraft && group.label === draftLabel ? (
                  <DraftTimelineCard
                    draft={localDraft}
                    onClick={() => openLocalDraft(localDraft)}
                  />
                ) : null}

                {group.meetings.map((meeting) => {
                  const failed = isErrorStatus(meeting.status);
                  const analyzing = isAnalyzingStatus(meeting.status);
                  const subtitle = failed
                    ? "مشکلی پیش آمد"
                    : formatPersianClockTime(meeting.meeting_date || meeting.created_at);

                  return (
                    <TimelineCard
                      key={meeting.id}
                      title={meeting.title?.trim() ? meeting.title : "یادداشت جلسه"}
                      subtitle={subtitle}
                      isDraft={false}
                      failed={failed}
                      badge={analyzing ? <StatusChip status={meeting.status} /> : undefined}
                      onClick={() => navigate(`/meeting/${meeting.id}`)}
                      onRetry={() => void refetch()}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Fixed Bottom HomeActions matching Android HomeActions */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-[#FBF9F4]/95 backdrop-blur-sm pb-safe">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2.5 px-[18px] py-[18px]">
          <button
            type="button"
            onClick={() => navigate("/record")}
            className="flex h-[60px] flex-[1.12] items-center justify-center gap-2.5 rounded-[30px] bg-[#0D4D4D] px-[18px] text-[15px] font-medium text-white shadow-sm transition hover:bg-[#0F766E] active:scale-[0.99]"
          >
            <Mic className="h-[22px] w-[22px]" />
            <span>ضبط جدید</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="flex h-[60px] flex-1 items-center justify-center gap-2.5 rounded-[30px] border border-[#E8E2D5] bg-white px-[18px] text-[15px] font-medium text-[#1C1B18] transition hover:bg-[#F5F2EB] active:scale-[0.99]"
          >
            <Search className="h-[22px] w-[22px] text-[#1C1B18]" />
            <span>هر چیزی بپرس</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;

function RoundHomeButton({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[#E8E2D5] bg-[#FBF9F4] p-1 transition hover:bg-[#F5F2EB] active:scale-95"
    >
      {children}
    </button>
  );
}

function BrowsePill({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E8E2D5] bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#404848] transition hover:border-[#0D4D4D]/40 hover:text-[#0D4D4D]"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function TimelineHeader({ label }: { label: string }) {
  return (
    <h2 className="pt-3.5 pb-0.5 text-[15px] font-normal text-[#66625B]">
      {label}
    </h2>
  );
}

function DraftTimelineCard({
  draft,
  onClick,
}: {
  draft: LocalDraftUi;
  onClick: () => void;
}) {
  const status =
    draft.status === DraftStatus.ON_RECORDING
      ? "در حال ضبط"
      : draft.status === DraftStatus.ON_UPLOADING
        ? "در حال بارگذاری"
        : draft.status === DraftStatus.ON_TAG_SELECTION
          ? "آماده تکمیل"
          : formatPersianClockTime(draft.createdAt);

  return (
    <TimelineCard
      title={`پیش‌نویس: ${draft.title}`}
      subtitle={status}
      isDraft
      failed={false}
      onClick={onClick}
    />
  );
}

function TimelineCard({
  title,
  subtitle,
  isDraft,
  failed,
  badge,
  onClick,
  onRetry,
}: {
  title: string;
  subtitle: string;
  isDraft: boolean;
  failed: boolean;
  badge?: React.ReactNode;
  onClick: () => void;
  onRetry?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="flex w-full cursor-pointer items-center gap-4 rounded-[28px] border border-[#E8E2D5] bg-white px-[18px] py-[17px] transition hover:border-[#0D4D4D]/35 active:scale-[0.995]"
    >
      <div
        className={`flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[14px] ${
          isDraft ? "bg-[#F5F2EB] text-[#66625B]" : "bg-[#D7EFED] text-[#0D4D4D]"
        }`}
      >
        {isDraft ? (
          <FileText className="h-[29px] w-[29px]" />
        ) : (
          <Mic className="h-[29px] w-[29px]" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-bold text-[#1C1B18]">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 truncate text-[14px] text-[#66625B]">{subtitle}</p>
        ) : null}
      </div>

      {badge}

      {failed && onRetry ? (
        <button
          type="button"
          aria-label="تلاش مجدد"
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#66625B] hover:bg-black/5"
        >
          <RefreshCw className="h-5 w-5" />
        </button>
      ) : null}
    </div>
  );
}
