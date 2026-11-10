import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Search, Settings, Tag } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { mysqlClient } from "@/lib/mysql-client";
import { useToast } from "@/components/ui/use-toast";
import AppShell from "@/components/layout/AppShell";
import EmptyState from "@/components/EmptyState";
import { NeshastyarCard } from "@/components/neshastyar/NeshastyarUi";

interface DatabaseTag {
  id: string;
  name: string;
  color: string;
  meetingCount: number;
}

const TagList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [tags, setTags] = useState<DatabaseTag[]>([]);
  const [untaggedCount, setUntaggedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredTags = useMemo(() => {
    if (!normalizedSearchQuery) return tags;
    return tags.filter((tag) =>
      tag.name.toLowerCase().includes(normalizedSearchQuery),
    );
  }, [tags, normalizedSearchQuery]);

  const showUntaggedCard =
    untaggedCount > 0 &&
    (!normalizedSearchQuery || "بدون برچسب".includes(normalizedSearchQuery));

  useEffect(() => {
    const fetchTagsAndUntagged = async () => {
      try {
        if (!user) return;

        const { data: mgmtData, error: mgmtErr } = await mysqlClient.tags.management();
        if (!mgmtErr && mgmtData && Array.isArray(mgmtData.tags)) {
          const withMeetings = mgmtData.tags
            .map((t: { id: string; name: string; color?: string; meeting_count?: number; meetingCount?: number }) => ({
              id: t.id,
              name: t.name || t.id,
              color: t.color || "#0D4D4D",
              meetingCount: Number(t.meeting_count ?? t.meetingCount ?? 0),
            }))
            .filter((t: DatabaseTag) => t.meetingCount > 0);

          setTags(withMeetings);
          setUntaggedCount(Number(mgmtData.untaggedMeetingsCount ?? 0));
          return;
        }

        // Fallback if management endpoint isn't available
        const { data: tagsData, error: tagsError } = await mysqlClient
          .from("tags")
          .select("id, name, color")
          .eq("user_id", user.id);

        if (tagsError) {
          toast({
            title: "خطا در بارگذاری برچسب‌ها",
            description: tagsError.message,
            variant: "destructive",
          });
          return;
        }

        const API_BASE_URL =
          import.meta.env.VITE_API_URL || "http://localhost:3001/api";
        const authHeaders = mysqlClient.getAuthHeaders();
        const taggedIds = new Set<string>();

        const formatted = await Promise.all(
          (tagsData || []).map(async (tag: { id: string; name: string; color: string }) => {
            try {
              const res = await fetch(
                `${API_BASE_URL}/meeting-tags/tags/${tag.id}/meetings`,
                { headers: authHeaders },
              );
              if (res.ok) {
                const meetings = await res.json();
                if (Array.isArray(meetings)) {
                  meetings.forEach((m: { id?: string }) => {
                    if (m.id) taggedIds.add(m.id);
                  });
                  return {
                    id: tag.id,
                    name: tag.name,
                    color: tag.color,
                    meetingCount: meetings.length,
                  };
                }
              }
            } catch {
              // ignore
            }
            return { id: tag.id, name: tag.name, color: tag.color, meetingCount: 0 };
          }),
        );

        setTags(formatted.filter((t) => t.meetingCount > 0));
        const { data: allMeetings } = await mysqlClient
          .from("meetings")
          .select("id")
          .eq("user_id", user.id);

        if (Array.isArray(allMeetings)) {
          setUntaggedCount(
            allMeetings.filter((m: { id: string }) => !taggedIds.has(m.id)).length,
          );
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchTagsAndUntagged();
  }, [user, toast]);

  const headerActions = (
    <>
      {!searchOpen && (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="جستجوی برچسب‌ها"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#0D4D4D] hover:bg-black/5"
        >
          <Search className="h-5 w-5" />
        </button>
      )}
      <button
        type="button"
        onClick={() => navigate("/tags/manage")}
        aria-label="مدیریت"
        className="flex h-10 w-10 items-center justify-center rounded-full text-[#0F766E] hover:bg-black/5"
      >
        <Settings className="h-5 w-5" />
      </button>
    </>
  );

  return (
    <AppShell
      title="لیست جلسات بر حسب برچسب"
      onBack="/home"
      actions={headerActions}
      searchActive={searchOpen}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchClose={() => {
        setSearchOpen(false);
        setSearchQuery("");
      }}
      searchPlaceholder="جستجوی برچسب..."
    >
      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
        </div>
      ) : (
        <div className="space-y-2">
          {showUntaggedCard ? (
            <NeshastyarCard
              onClick={() => navigate("/tag/untagged")}
              className="p-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-[#1C1B18]">
                  {`بدون برچسب (${untaggedCount})`}
                </span>
                <ArrowLeft className="h-5 w-5 text-[#66625B]" />
              </div>
            </NeshastyarCard>
          ) : null}

          {filteredTags.map((tag) => (
            <NeshastyarCard
              key={tag.id}
              onClick={() => navigate(`/tag/${tag.id}`)}
              className="p-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-[#1C1B18]">
                  {`${tag.name} (${tag.meetingCount})`}
                </span>
                <ArrowLeft className="h-5 w-5 text-[#66625B]" />
              </div>
            </NeshastyarCard>
          ))}

          {filteredTags.length === 0 && !showUntaggedCard ? (
            <EmptyState
              icon={Tag}
              title={normalizedSearchQuery ? "نتیجه‌ای یافت نشد" : "هنوز برچسبی ندارید"}
              description={
                normalizedSearchQuery
                  ? "عبارت جستجو را تغییر دهید"
                  : "جلسه‌ای ضبط کنید و برچسب اضافه کنید"
              }
            />
          ) : null}
        </div>
      )}
    </AppShell>
  );
};

export default TagList;
