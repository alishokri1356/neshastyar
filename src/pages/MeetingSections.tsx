import React, { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ListChecks, Loader2, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/store/useAuthStore";
import { mysqlClient } from "@/lib/mysql-client";
import {
  emptyEditableSummary,
  jsonToEditableSummary,
  parseMeetingSummaryJson,
} from "@/lib/meetingSummary";
import {
  applySummaryDecisionEdit,
  decisionRowsFromSummary,
  type DecisionEdit,
} from "@/lib/meetingDecisions";
import { DecisionRowsEditor } from "@/components/neshastyar/DecisionRowsEditor";
import { isErrorStatus } from "@/lib/neshastyarStatus";
import {
  NeshastyarCard,
  NeshastyarField,
  NeshastyarPrimaryButton,
  NeshastyarSectionHeader,
  NeshastyarSubHeader,
  NeshastyarTopBar,
} from "@/components/neshastyar/NeshastyarUi";
import {
  MeetingDetailBottomBar,
  MeetingTopSectionActions,
} from "@/components/neshastyar/MeetingDetailChrome";

interface TagItem {
  id: string;
  name: string;
  color?: string;
}

interface ParticipantItem {
  id: string;
  name: string;
  email?: string | null;
}

function useMeetingSectionData(meetingId?: string) {
  const { user } = useAuthStore();

  return useQuery({
    queryKey: ["meeting-detail", meetingId],
    queryFn: async () => {
      if (!meetingId || !user) return null;

      const [meetingRes, meetingTagsRes, allTagsRes, meetingPeopleRes, allPeopleRes] =
        await Promise.all([
          mysqlClient
            .from("meetings")
            .select("*")
            .eq("id", meetingId)
            .eq("user_id", user.id)
            .single(),
          fetch(
            `${import.meta.env.VITE_API_URL || "http://localhost:3001/api"}/meeting-tags/meetings/${meetingId}/tags`,
            { headers: mysqlClient.getAuthHeaders() },
          ).then((r) => (r.ok ? r.json() : [])),
          mysqlClient.from("tags").select("*").eq("user_id", user.id),
          mysqlClient.meetingParticipants.getForMeeting(meetingId),
          mysqlClient.participants.list(),
        ]);

      if (meetingRes.error || !meetingRes.data) {
        throw new Error(meetingRes.error?.message || "جلسه پیدا نشد");
      }

      const meeting = meetingRes.data;
      const parsedJson = parseMeetingSummaryJson(meeting.summary || "");
      const parsed = parsedJson ? jsonToEditableSummary(parsedJson) : emptyEditableSummary();

      const tags: TagItem[] = Array.isArray(meetingTagsRes)
        ? meetingTagsRes
        : [];
      const allTags: TagItem[] = Array.isArray(allTagsRes.data)
        ? allTagsRes.data
        : [];
      const participants: ParticipantItem[] = Array.isArray(meetingPeopleRes.data)
        ? meetingPeopleRes.data
        : [];
      const allParticipants: ParticipantItem[] = Array.isArray(
        allPeopleRes.data?.participants,
      )
        ? allPeopleRes.data.participants
        : [];

      return {
        meeting,
        parsed,
        tags,
        allTags,
        participants,
        allParticipants,
      };
    },
    enabled: Boolean(meetingId && user),
    staleTime: 10_000,
  });
}

function SectionScaffold({
  meetingId,
  title,
  backTo,
  loading,
  error,
  onRetry,
  showProcessedSections = true,
  headerActions,
  children,
}: {
  meetingId: string;
  title: string;
  backTo: string;
  loading: boolean;
  error?: string | null;
  onRetry: () => void;
  showProcessedSections?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#FBF9F4] text-[#1C1B18]">
      <NeshastyarTopBar />
      <main className="mx-auto w-full max-w-2xl overflow-x-hidden px-4 pb-24">
        <NeshastyarSubHeader title={title} onBack={backTo} actions={headerActions} />
        {loading ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
          </div>
        ) : error ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-[#B91C1C]">{error}</p>
            <button
              type="button"
              onClick={onRetry}
              className="text-sm font-semibold text-[#0F766E]"
            >
              تلاش مجدد
            </button>
          </div>
        ) : (
          <div className="mt-2 space-y-3">{children}</div>
        )}
      </main>
      <MeetingDetailBottomBar
        meetingId={meetingId}
        showProcessedSections={showProcessedSections}
      />
    </div>
  );
}

export const MeetingParticipantsPage: React.FC = () => {
  const { meetingId = "" } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useMeetingSectionData(meetingId);

  const [selectedPerson, setSelectedPerson] = useState<ParticipantItem | null>(null);
  const [draftName, setDraftName] = useState("");
  const [feedback, setFeedback] = useState<{ msg?: string; err?: string }>({});
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => {
    if (!data) return [];
    const linkedLower = new Set(
      data.participants.map((p) => p.name.trim().toLowerCase()),
    );
    const seen = new Set<string>();
    return data.parsed.people.filter((raw) => {
      const clean = raw.trim();
      const lower = clean.toLowerCase();
      if (!clean || linkedLower.has(lower) || seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, [data]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["meeting-detail", meetingId] });
  };

  const addSuggested = async (name: string) => {
    setFeedback({});
    const { error: addErr } = await mysqlClient.meetingParticipants.add({
      meetingId,
      name: name.trim(),
    });
    if (addErr) {
      setFeedback({ err: addErr.message || "افزودن فرد ناموفق بود" });
      return;
    }
    setFeedback({ msg: "فرد به جلسه اضافه شد" });
    await invalidate();
  };

  const saveRename = async () => {
    if (!selectedPerson || !draftName.trim()) return;
    setBusy(true);
    setFeedback({});
    const { error: renErr } = await mysqlClient.participants.rename({
      id: selectedPerson.id,
      newName: draftName.trim(),
    });
    setBusy(false);
    if (renErr) {
      setFeedback({ err: renErr.message || "ویرایش نام ناموفق بود" });
      return;
    }
    setSelectedPerson(null);
    setFeedback({ msg: "نام در خلاصه و متن اسکن‌شده هم اصلاح شد" });
    await invalidate();
  };

  const removePerson = async () => {
    if (!selectedPerson) return;
    setBusy(true);
    setFeedback({});
    const { error: remErr } = await mysqlClient.meetingParticipants.remove({
      meetingId,
      participantId: selectedPerson.id,
    });
    setBusy(false);
    if (remErr) {
      setFeedback({ err: remErr.message || "حذف فرد ناموفق بود" });
      return;
    }
    setSelectedPerson(null);
    setFeedback({ msg: "فرد از جلسه حذف شد" });
    await invalidate();
  };

  return (
    <SectionScaffold
      meetingId={meetingId}
      title="حاضرین در جلسه"
      backTo={`/meeting/${meetingId}`}
      loading={isLoading}
      error={error ? (error as Error).message : null}
      onRetry={() => void refetch()}
      showProcessedSections={!isErrorStatus(data?.meeting?.status)}
      headerActions={
        <MeetingTopSectionActions
          meetingId={meetingId}
          showParticipants
          participantsSelected
        />
      }
    >
      <NeshastyarCard>
        <NeshastyarSectionHeader
          title="حاضرین این جلسه"
          subtitle={`${data?.participants.length ?? 0} نفر`}
          icon={<Users className="h-5 w-5" />}
        />
        <p className="mt-1.5 mb-2.5 text-[13px] leading-6 text-[#66625B]">
          برای ویرایش نام یا حذف فرد از این جلسه، روی آن بزنید. با ویرایش نام، همان نام در متن اسکن‌شده و در خلاصه جلسه هم اصلاح می‌شود.
        </p>

        {!data?.participants.length ? (
          <p className="text-[14px] text-[#66625B]">فردی ثبت نشده</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.participants.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  setSelectedPerson(person);
                  setDraftName(person.name);
                }}
                className="rounded-lg bg-[#D7EFED] px-3 py-1.5 text-[13px] font-medium text-[#0F766E] transition hover:bg-[#c3e6e3]"
              >
                {person.name}
              </button>
            ))}
          </div>
        )}

        {suggestions.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-[13px] font-medium text-[#66625B]">
              شرکت‌کنندگان پیشنهادی:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => void addSuggested(name)}
                  className="rounded-lg border border-[#C88A2E] bg-[#FEF7E6] px-3 py-1.5 text-[13px] font-medium text-[#B45309] transition hover:bg-[#fdecc8]"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </NeshastyarCard>

      <NeshastyarPrimaryButton
        onClick={() => navigate(`/meeting/${meetingId}/participants/add`)}
      >
        اضافه کردن حاضر
      </NeshastyarPrimaryButton>

      {feedback.msg ? (
        <p className="text-[13px] text-[#0F766E]">{feedback.msg}</p>
      ) : null}
      {feedback.err ? (
        <p className="text-[13px] text-[#B91C1C]">{feedback.err}</p>
      ) : null}

      <Dialog
        open={Boolean(selectedPerson)}
        onOpenChange={(open) => {
          if (!open && !busy) setSelectedPerson(null);
        }}
      >
        <DialogContent dir="rtl" className="border-[#E8E2D5] bg-white text-right">
          <DialogHeader>
            <DialogTitle className="text-right text-[#1C1B18]">ویرایش حاضر</DialogTitle>
            <DialogDescription className="text-right text-[13px] leading-6 text-[#404848]">
              نام را تغییر دهید یا فرد را از این جلسه حذف کنید. با ذخیره، این نام در متن اسکن‌شده و هر جای خلاصه که آمده هم عوض می‌شود.
            </DialogDescription>
          </DialogHeader>
          <NeshastyarField
            label="نام"
            value={draftName}
            onChange={setDraftName}
            disabled={busy}
          />
          <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:justify-between">
            <button
              type="button"
              disabled={busy || !draftName.trim()}
              onClick={() => void saveRename()}
              className="rounded-xl bg-[#0D4D4D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F766E] disabled:opacity-50"
            >
              ذخیره
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void removePerson()}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[#B91C1C] hover:bg-[#FDF2F0]"
              >
                حذف
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelectedPerson(null)}
                className="rounded-xl px-3 py-2 text-sm text-[#66625B] hover:bg-[#F5F2EB]"
              >
                انصراف
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionScaffold>
  );
};

export const MeetingAddParticipantsPage: React.FC = () => {
  const { meetingId = "" } = useParams<{ meetingId: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useMeetingSectionData(meetingId);

  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ msg?: string; err?: string }>({});

  const query = search.trim();
  const lowerQuery = query.toLowerCase();

  const suggestions = useMemo(() => {
    if (!data) return [];
    const linkedLower = new Set(
      data.participants.map((p) => p.name.trim().toLowerCase()),
    );
    return data.parsed.people
      .map((s) => s.trim())
      .filter((s) => s && !linkedLower.has(s.toLowerCase()));
  }, [data]);

  const visibleSuggestions = suggestions.filter(
    (s) => !lowerQuery || s.toLowerCase().includes(lowerQuery),
  );

  const visiblePeople = (data?.allParticipants ?? []).filter((p) => {
    const shownAsSuggestion = suggestions.some(
      (s) => s.toLowerCase() === p.name.trim().toLowerCase(),
    );
    return !shownAsSuggestion && (!lowerQuery || p.name.toLowerCase().includes(lowerQuery));
  });

  const canAddTyped =
    query.length > 0 &&
    visiblePeople.every((p) => p.name.trim().toLowerCase() !== lowerQuery) &&
    visibleSuggestions.every((s) => s.toLowerCase() !== lowerQuery) &&
    (data?.participants ?? []).every((p) => p.name.trim().toLowerCase() !== lowerQuery);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["meeting-detail", meetingId] });
  };

  const addByName = async (name: string) => {
    setFeedback({});
    const { error: addErr } = await mysqlClient.meetingParticipants.add({
      meetingId,
      name: name.trim(),
    });
    if (addErr) {
      setFeedback({ err: addErr.message || "افزودن فرد ناموفق بود" });
      return;
    }
    setSearch("");
    setFeedback({ msg: "فرد به جلسه اضافه شد" });
    await invalidate();
  };

  const linkPerson = async (personId: string) => {
    setFeedback({});
    const { error: addErr } = await mysqlClient.meetingParticipants.add({
      meetingId,
      participantId: personId,
    });
    if (addErr) {
      setFeedback({ err: addErr.message || "افزودن فرد ناموفق بود" });
      return;
    }
    setFeedback({ msg: "فرد به جلسه اضافه شد" });
    await invalidate();
  };

  return (
    <SectionScaffold
      meetingId={meetingId}
      title="افزودن حاضر"
      backTo={`/meeting/${meetingId}/participants`}
      loading={isLoading}
      error={error ? (error as Error).message : null}
      onRetry={() => void refetch()}
      showProcessedSections={!isErrorStatus(data?.meeting?.status)}
    >
      <NeshastyarField
        label="جستجوی فرد"
        placeholder="بخشی از نام"
        value={search}
        onChange={setSearch}
        autoFocus
      />

      {(data?.allParticipants.length ?? 0) === 0 &&
      visibleSuggestions.length === 0 &&
      !canAddTyped ? (
        <p className="pt-2 text-[14px] text-[#66625B]">فردی برای این کاربر وجود ندارد</p>
      ) : visiblePeople.length === 0 && visibleSuggestions.length === 0 && !canAddTyped ? (
        <p className="pt-2 text-[14px] text-[#66625B]">فردی با این عبارت پیدا نشد</p>
      ) : (
        <div className="flex flex-wrap gap-2 pt-2">
          {canAddTyped ? (
            <button
              type="button"
              onClick={() => void addByName(query)}
              className="rounded-lg bg-[#D7EFED] px-3 py-1.5 text-[13px] font-medium text-[#0F766E] hover:bg-[#c3e6e3]"
            >
              {`افزودن «${query}»`}
            </button>
          ) : null}

          {visibleSuggestions.map((name) => (
            <button
              key={`sug-${name}`}
              type="button"
              onClick={() => void addByName(name)}
              className="rounded-lg border border-[#C88A2E] bg-[#FEF7E6] px-3 py-1.5 text-[13px] font-medium text-[#B45309] hover:bg-[#fdecc8]"
            >
              {name}
            </button>
          ))}

          {visiblePeople.map((person) => {
            const already = (data?.participants ?? []).some((p) => p.id === person.id);
            return (
              <button
                key={person.id}
                type="button"
                disabled={already}
                onClick={() => void linkPerson(person.id)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                  already
                    ? "bg-[#D7EFED] text-[#0F766E]"
                    : "border border-[#E8E2D5] bg-[#F5F2EB] text-[#404848] hover:bg-[#E8E2D5]/60"
                }`}
              >
                {person.name}
              </button>
            );
          })}
        </div>
      )}

      {feedback.msg ? <p className="text-[13px] text-[#0F766E]">{feedback.msg}</p> : null}
      {feedback.err ? <p className="text-[13px] text-[#B91C1C]">{feedback.err}</p> : null}
    </SectionScaffold>
  );
};

export const MeetingTagsPage: React.FC = () => {
  const { meetingId = "" } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data, isLoading, error, refetch } = useMeetingSectionData(meetingId);

  const [selectedTag, setSelectedTag] = useState<TagItem | null>(null);
  const [draftName, setDraftName] = useState("");
  const [feedback, setFeedback] = useState<{ msg?: string; err?: string }>({});
  const [busy, setBusy] = useState(false);

  const suggestions = useMemo(() => {
    if (!data) return [];
    const linkedLower = new Set(data.tags.map((t) => t.name.trim().toLowerCase()));
    const seen = new Set<string>();
    return data.parsed.tags.filter((raw) => {
      const clean = raw.trim();
      const lower = clean.toLowerCase();
      if (!clean || linkedLower.has(lower) || seen.has(lower)) return false;
      seen.add(lower);
      return true;
    });
  }, [data]);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["meeting-detail", meetingId] });
  };

  const addSuggestedTag = async (name: string) => {
    if (!user) return;
    setFeedback({});
    const trimmed = name.trim();
    let tagToLink = data?.allTags.find(
      (t) => t.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );

    if (!tagToLink) {
      const { data: created, error: createErr } = await mysqlClient
        .from("tags")
        .insert({ name: trimmed, color: "#0D4D4D", user_id: user.id });
      if (createErr || !created) {
        setFeedback({ err: createErr?.message || "ایجاد برچسب ناموفق بود" });
        return;
      }
      tagToLink = created;
    }

    const { error: linkErr } = await mysqlClient
      .from("meeting_tags")
      .insert({ meeting_id: meetingId, tag_id: tagToLink!.id });

    if (linkErr) {
      setFeedback({ err: linkErr.message || "افزودن برچسب ناموفق بود" });
      return;
    }
    setFeedback({ msg: "برچسب به جلسه اضافه شد" });
    await invalidate();
  };

  const saveRenameTag = async () => {
    if (!selectedTag || !draftName.trim()) return;
    setBusy(true);
    setFeedback({});
    const { error: updErr } = await mysqlClient
      .from("tags")
      .update({ name: draftName.trim() })
      .eq("id", selectedTag.id);
    setBusy(false);
    if (updErr) {
      setFeedback({ err: updErr.message || "ویرایش برچسب ناموفق بود" });
      return;
    }
    setSelectedTag(null);
    setFeedback({ msg: "نام برچسب ذخیره شد" });
    await invalidate();
  };

  const unlinkTag = async () => {
    if (!selectedTag) return;
    setBusy(true);
    setFeedback({});
    const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
    const res = await fetch(
      `${API_BASE_URL}/meeting-tags?meeting_id=${encodeURIComponent(meetingId)}&tag_id=${encodeURIComponent(selectedTag.id)}`,
      { method: "DELETE", headers: mysqlClient.getAuthHeaders() },
    );
    setBusy(false);
    if (!res.ok) {
      setFeedback({ err: "حذف برچسب ناموفق بود" });
      return;
    }
    setSelectedTag(null);
    setFeedback({ msg: "برچسب از جلسه حذف شد" });
    await invalidate();
  };

  return (
    <SectionScaffold
      meetingId={meetingId}
      title="برچسب‌ها"
      backTo={`/meeting/${meetingId}`}
      loading={isLoading}
      error={error ? (error as Error).message : null}
      onRetry={() => void refetch()}
      showProcessedSections={!isErrorStatus(data?.meeting?.status)}
      headerActions={
        <MeetingTopSectionActions
          meetingId={meetingId}
          showParticipants={
            Boolean(data?.meeting) && !isErrorStatus(data?.meeting?.status)
          }
          tagsSelected
        />
      }
    >
      <NeshastyarCard>
        <NeshastyarSectionHeader
          title="برچسب‌های این جلسه"
          icon={<ListChecks className="h-5 w-5" />}
        />
        <p className="mt-1.5 mb-2.5 text-[13px] text-[#66625B]">
          برای ویرایش نام یا حذف برچسب از این جلسه، روی آن بزنید.
        </p>

        {!data?.tags.length ? (
          <p className="text-[14px] text-[#66625B]">برچسبی ثبت نشده</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  setSelectedTag(tag);
                  setDraftName(tag.name);
                }}
                className="rounded-lg border border-[#166534] bg-[#EBF6F0] px-3 py-1.5 text-[13px] font-medium text-[#166534] transition hover:bg-[#dcf0e4]"
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

        {suggestions.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-[13px] font-medium text-[#66625B]">
              برچسب‌های پیشنهادی:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => void addSuggestedTag(name)}
                  className="rounded-lg border border-[#C88A2E] bg-[#FEF7E6] px-3 py-1.5 text-[13px] font-medium text-[#B45309] hover:bg-[#fdecc8]"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </NeshastyarCard>

      <NeshastyarPrimaryButton
        onClick={() => navigate(`/meeting/${meetingId}/tags/add`)}
      >
        اضافه کردن برچسب
      </NeshastyarPrimaryButton>

      {feedback.msg ? <p className="text-[13px] text-[#0F766E]">{feedback.msg}</p> : null}
      {feedback.err ? <p className="text-[13px] text-[#B91C1C]">{feedback.err}</p> : null}

      <Dialog
        open={Boolean(selectedTag)}
        onOpenChange={(open) => {
          if (!open && !busy) setSelectedTag(null);
        }}
      >
        <DialogContent dir="rtl" className="border-[#E8E2D5] bg-white text-right">
          <DialogHeader>
            <DialogTitle className="text-right text-[#1C1B18]">ویرایش برچسب</DialogTitle>
            <DialogDescription className="text-right text-[13px] text-[#404848]">
              نام را تغییر دهید، یا برچسب را از این جلسه حذف کنید.
            </DialogDescription>
          </DialogHeader>
          <NeshastyarField
            label="نام برچسب"
            value={draftName}
            onChange={setDraftName}
            disabled={busy}
          />
          <DialogFooter className="flex flex-row items-center justify-between gap-2 sm:justify-between">
            <button
              type="button"
              disabled={busy || !draftName.trim()}
              onClick={() => void saveRenameTag()}
              className="rounded-xl bg-[#0D4D4D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0F766E] disabled:opacity-50"
            >
              ذخیره
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void unlinkTag()}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-[#B91C1C] hover:bg-[#FDF2F0]"
              >
                حذف
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setSelectedTag(null)}
                className="rounded-xl px-3 py-2 text-sm text-[#66625B] hover:bg-[#F5F2EB]"
              >
                انصراف
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionScaffold>
  );
};

export const MeetingAddTagsPage: React.FC = () => {
  const { meetingId = "" } = useParams<{ meetingId: string }>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data, isLoading, error, refetch } = useMeetingSectionData(meetingId);

  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ msg?: string; err?: string }>({});

  const query = search.trim();
  const lowerQuery = query.toLowerCase();

  const suggestions = useMemo(() => {
    if (!data) return [];
    const linkedLower = new Set(data.tags.map((t) => t.name.trim().toLowerCase()));
    return data.parsed.tags
      .map((s) => s.trim())
      .filter((s) => s && !linkedLower.has(s.toLowerCase()));
  }, [data]);

  const visibleSuggestions = suggestions.filter(
    (s) => !lowerQuery || s.toLowerCase().includes(lowerQuery),
  );

  const visibleTags = (data?.allTags ?? []).filter((t) => {
    const shownAsSug = visibleSuggestions.some(
      (s) => s.toLowerCase() === t.name.trim().toLowerCase(),
    );
    return !shownAsSug && (!lowerQuery || t.name.toLowerCase().includes(lowerQuery));
  });

  const canCreateTyped =
    query.length > 0 &&
    visibleTags.every((t) => t.name.trim().toLowerCase() !== lowerQuery) &&
    visibleSuggestions.every((s) => s.toLowerCase() !== lowerQuery) &&
    (data?.tags ?? []).every((t) => t.name.trim().toLowerCase() !== lowerQuery);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["meeting-detail", meetingId] });
  };

  const createAndLink = async (name: string) => {
    if (!user) return;
    setFeedback({});
    let tag = data?.allTags.find(
      (t) => t.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (!tag) {
      const { data: created, error: createErr } = await mysqlClient
        .from("tags")
        .insert({ name: name.trim(), color: "#0D4D4D", user_id: user.id });
      if (createErr || !created) {
        setFeedback({ err: createErr?.message || "ایجاد برچسب ناموفق بود" });
        return;
      }
      tag = created;
    }
    const { error: linkErr } = await mysqlClient
      .from("meeting_tags")
      .insert({ meeting_id: meetingId, tag_id: tag!.id });
    if (linkErr) {
      setFeedback({ err: linkErr.message || "افزودن برچسب ناموفق بود" });
      return;
    }
    setSearch("");
    setFeedback({ msg: "برچسب به جلسه اضافه شد" });
    await invalidate();
  };

  const linkTag = async (tagId: string) => {
    setFeedback({});
    const { error: linkErr } = await mysqlClient
      .from("meeting_tags")
      .insert({ meeting_id: meetingId, tag_id: tagId });
    if (linkErr) {
      setFeedback({ err: linkErr.message || "افزودن برچسب ناموفق بود" });
      return;
    }
    setFeedback({ msg: "برچسب به جلسه اضافه شد" });
    await invalidate();
  };

  return (
    <SectionScaffold
      meetingId={meetingId}
      title="افزودن برچسب"
      backTo={`/meeting/${meetingId}/tags`}
      loading={isLoading}
      error={error ? (error as Error).message : null}
      onRetry={() => void refetch()}
      showProcessedSections={!isErrorStatus(data?.meeting?.status)}
    >
      <NeshastyarField
        label="جستجوی برچسب"
        placeholder="بخشی از نام برچسب"
        value={search}
        onChange={setSearch}
        autoFocus
      />

      {(data?.allTags.length ?? 0) === 0 &&
      visibleSuggestions.length === 0 &&
      !canCreateTyped ? (
        <p className="pt-2 text-[14px] text-[#66625B]">برچسبی برای این کاربر وجود ندارد</p>
      ) : visibleTags.length === 0 && visibleSuggestions.length === 0 && !canCreateTyped ? (
        <p className="pt-2 text-[14px] text-[#66625B]">برچسبی با این عبارت پیدا نشد</p>
      ) : (
        <div className="flex flex-wrap gap-2 pt-2">
          {canCreateTyped ? (
            <button
              type="button"
              onClick={() => void createAndLink(query)}
              className="rounded-lg bg-[#D7EFED] px-3 py-1.5 text-[13px] font-medium text-[#0F766E] hover:bg-[#c3e6e3]"
            >
              {`افزودن «${query}»`}
            </button>
          ) : null}

          {visibleSuggestions.map((name) => (
            <button
              key={`sug-${name}`}
              type="button"
              onClick={() => void createAndLink(name)}
              className="rounded-lg border border-[#C88A2E] bg-[#FEF7E6] px-3 py-1.5 text-[13px] font-medium text-[#B45309] hover:bg-[#fdecc8]"
            >
              {name}
            </button>
          ))}

          {visibleTags.map((tag) => {
            const linked = (data?.tags ?? []).some((t) => t.id === tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                disabled={linked}
                onClick={() => void linkTag(tag.id)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                  linked
                    ? "border border-[#166534] bg-[#EBF6F0] text-[#166534]"
                    : "border border-[#E8E2D5] bg-[#F5F2EB] text-[#404848] hover:bg-[#E8E2D5]/60"
                }`}
              >
                {tag.name}
              </button>
            );
          })}
        </div>
      )}

      {feedback.msg ? <p className="text-[13px] text-[#0F766E]">{feedback.msg}</p> : null}
      {feedback.err ? <p className="text-[13px] text-[#B91C1C]">{feedback.err}</p> : null}
    </SectionScaffold>
  );
};

export const MeetingBulletPointsPage: React.FC = () => {
  const { meetingId = "" } = useParams<{ meetingId: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useMeetingSectionData(meetingId);
  const [saving, setSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const rows = decisionRowsFromSummary(String(data?.meeting?.summary || ""));

  const applyEdit = async (edit: DecisionEdit) => {
    if (!data?.meeting || saving) return;
    setSaving(true);
    setRowError(null);
    try {
      const next = applySummaryDecisionEdit(String(data.meeting.summary || ""), edit);
      const { error: updErr } = await mysqlClient
        .from("meetings")
        .update({ summary: next } as Record<string, unknown>)
        .eq("id", meetingId);
      if (updErr) throw new Error(updErr.message || "ذخیره انجام نشد");
      await queryClient.invalidateQueries({ queryKey: ["meeting-detail", meetingId] });
      await queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } catch (err) {
      const message = err instanceof Error ? err.message : "ذخیره انجام نشد";
      setRowError(message);
      throw err instanceof Error ? err : new Error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionScaffold
      meetingId={meetingId}
      title="نکات"
      backTo={`/meeting/${meetingId}`}
      loading={isLoading}
      error={error ? (error as Error).message : null}
      onRetry={() => void refetch()}
      showProcessedSections={!isErrorStatus(data?.meeting?.status)}
      headerActions={
        <MeetingTopSectionActions
          meetingId={meetingId}
          showParticipants={
            Boolean(data?.meeting) && !isErrorStatus(data?.meeting?.status)
          }
        />
      }
    >
      <div className="flex items-center justify-between px-1">
        <NeshastyarSectionHeader
          title="نکات کلیدی"
          subtitle={rows.length ? `${rows.length.toLocaleString("fa-IR")} مورد` : undefined}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        {saving ? <Loader2 className="h-4 w-4 animate-spin text-[#0D4D4D]" /> : null}
      </div>
      <DecisionRowsEditor
        rows={rows}
        disabled={saving}
        onEdit={(index, part, value) => applyEdit({ type: "edit", index, part, value })}
        onAdd={() => applyEdit({ type: "add" })}
        onDelete={(index) => applyEdit({ type: "delete", index })}
      />
      {rowError ? <p className="text-[13px] text-[#B91C1C]">{rowError}</p> : null}
    </SectionScaffold>
  );
};
