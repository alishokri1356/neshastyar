import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Menu } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { mysqlClient } from "@/lib/mysql-client";
import {
  MeetingListCard,
  NeshastyarField,
  NeshastyarTopBar,
} from "@/components/neshastyar/NeshastyarUi";

interface SearchMeeting {
  id: string;
  title?: string | null;
  status?: string | null;
  meeting_date?: string | null;
  created_at?: string | null;
}

const Search: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [query, setQuery] = useState("");

  const {
    data: meetings = [],
    isLoading,
    error,
  } = useQuery<SearchMeeting[]>({
    queryKey: ["meetings", user?.id, "search-200"],
    queryFn: async () => {
      if (!user) return [];
      const { data, error: fetchErr } = await mysqlClient
        .from("meetings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (fetchErr) {
        throw new Error(fetchErr.message || "خطا در دریافت جلسات");
      }
      return Array.isArray(data) ? data : [];
    },
    enabled: Boolean(user),
    staleTime: 60_000,
  });

  const trimmed = query.trim();
  const results = useMemo(() => {
    if (!trimmed) return [];
    const lower = trimmed.toLowerCase();
    return meetings.filter((m) =>
      (m.title || "").toLowerCase().includes(lower),
    );
  }, [meetings, trimmed]);

  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] flex-col bg-[#FBF9F4] text-[#1C1B18]"
    >
      <NeshastyarTopBar />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-20 pt-3">
        <h1 className="mb-3 text-[22px] font-bold text-[#1C1B18]">جستجو</h1>

        <NeshastyarField
          label="نام جلسه"
          placeholder="نام جلسه را بنویسید"
          value={query}
          onChange={setQuery}
          autoFocus
        />

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
          </div>
        ) : error ? (
          <div className="flex flex-1 items-center justify-center py-16 text-center text-[#B91C1C]">
            {(error as Error).message}
          </div>
        ) : !trimmed ? (
          <div className="flex flex-1 items-center justify-center py-16 text-center text-[#66625B]">
            برای دیدن نتیجه، نام جلسه را بنویسید
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-16 text-center text-[#66625B]">
            جلسه‌ای با این نام پیدا نشد
          </div>
        ) : (
          <div className="mt-4 space-y-3 pb-6">
            {results.map((meeting) => (
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
        )}
      </main>

      {/* Matches Android NeshastyarBottomBar shown on Search route */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8E2D5]/70 bg-white pb-safe">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-center">
          <button
            type="button"
            onClick={() => navigate("/account/manage")}
            aria-label="تنظیمات"
            className="flex h-12 w-12 items-center justify-center rounded-full text-[#66625B] transition hover:bg-black/5 hover:text-[#0D4D4D]"
          >
            <Menu className="h-[26px] w-[26px]" />
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Search;
