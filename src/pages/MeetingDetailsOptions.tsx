import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FastForward,
  Loader2,
  Pause,
  Play,
  Rewind,
  Square,
} from "lucide-react";
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
import AnalyzeModelSelect from "@/components/AnalyzeModelSelect";
import { isErrorStatus, isProcessedStatus } from "@/lib/neshastyarStatus";
import {
  NeshastyarCard,
  NeshastyarField,
  NeshastyarPrimaryButton,
  NeshastyarSecondaryButton,
  NeshastyarSubHeader,
  NeshastyarTopBar,
} from "@/components/neshastyar/NeshastyarUi";
import {
  MeetingDetailBottomBar,
  MeetingTopSectionActions,
} from "@/components/neshastyar/MeetingDetailChrome";

interface AudioFileItem {
  id: string;
  fileName: string;
  duration?: number;
  urls: string[];
}

function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
  const s = String(totalSec % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const MeetingDetailsOptions: React.FC = () => {
  const { meetingId = "" } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const API_BASE_URL = (
    import.meta.env.VITE_API_URL || "http://localhost:3001/api"
  ).replace(/\/$/, "");

  const [comment, setComment] = useState("");
  const [analyzeModel, setAnalyzeModel] = useState("auto");
  const [reanalyzing, setReanalyzing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [preparingFileId, setPreparingFileId] = useState<string | null>(null);
  const [playingFileId, setPlayingFileId] = useState<string | null>(null);
  const [playbackPaused, setPlaybackPaused] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["meeting-options", meetingId],
    queryFn: async () => {
      if (!meetingId || !user) return null;

      const [{ data: meeting }, { data: sessionData }] = await Promise.all([
        mysqlClient
          .from("meetings")
          .select("*")
          .eq("id", meetingId)
          .eq("user_id", user.id)
          .single(),
        mysqlClient.auth.getSession(),
      ]);

      if (!meeting) return null;

      const token =
        (sessionData.session as { access_token?: string; token?: string } | null)
          ?.access_token || sessionData.session?.token;

      let rawFiles: Array<{
        id: string;
        file_name: string;
        duration?: number;
      }> = [];

      if (token) {
        try {
          const res = await fetch(
            `${API_BASE_URL}/meetings/${encodeURIComponent(meetingId)}/audio-files`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );
          const json = await res.json().catch(() => null);
          if (res.ok && Array.isArray(json?.data)) {
            rawFiles = json.data;
          }
        } catch {
          // ignore
        }
      }

      const files: AudioFileItem[] = rawFiles.map((f) => {
        const urls: string[] = [];
        if (token && f.file_name) {
          const encodedName = encodeURIComponent(f.file_name);
          const encodedToken = encodeURIComponent(token);
          urls.push(
            `${API_BASE_URL}/audio/${encodeURIComponent(user.id)}/${encodedName}?token=${encodedToken}`,
          );
        }
        if (f.id && token) {
          urls.push(
            `${API_BASE_URL}/audio/${encodeURIComponent(f.id)}?token=${encodeURIComponent(token)}`,
          );
        }
        return {
          id: f.id,
          fileName: f.file_name || f.id,
          duration: f.duration,
          urls,
        };
      });

      return {
        meeting,
        files,
      };
    },
    enabled: Boolean(meetingId && user),
    staleTime: 30_000,
  });

  useEffect(() => {
    if (data?.meeting) {
      setComment(data.meeting.CommentText || "");
      if (data.meeting.analyze_model) {
        setAnalyzeModel(data.meeting.analyze_model);
      }
    }
  }, [data?.meeting]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPreparingFileId(null);
    setPlayingFileId(null);
    setPlaybackPaused(false);
    setPositionMs(0);
    setDurationMs(0);
  };

  const togglePlay = (file: AudioFileItem) => {
    if (preparingFileId === file.id) {
      stopPlayback();
      return;
    }
    if (playingFileId === file.id) {
      if (playbackPaused && audioRef.current) {
        void audioRef.current.play();
        setPlaybackPaused(false);
      }
      return;
    }

    stopPlayback();
    if (!file.urls.length) {
      setPlaybackError("آدرس پخش فایل در دسترس نیست");
      return;
    }

    setPreparingFileId(file.id);
    setPlaybackError(null);

    let urlIdx = 0;
    const tryPlayUrl = () => {
      const url = file.urls[urlIdx];
      if (!url) {
        stopPlayback();
        setPlaybackError("پخش فایل ناموفق بود");
        return;
      }

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("loadedmetadata", () => {
        const dMs = Number.isFinite(audio.duration)
          ? audio.duration * 1000
          : (file.duration ?? 0) * 1000;
        setDurationMs(Math.max(1000, dMs));
      });

      audio.addEventListener("playing", () => {
        setPreparingFileId(null);
        setPlayingFileId(file.id);
        setPlaybackPaused(false);
        const dMs = Number.isFinite(audio.duration)
          ? audio.duration * 1000
          : (file.duration ?? 0) * 1000;
        if (dMs > 0) setDurationMs(dMs);
      });

      audio.addEventListener("timeupdate", () => {
        setPositionMs(audio.currentTime * 1000);
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          setDurationMs(audio.duration * 1000);
        }
      });

      audio.addEventListener("ended", () => {
        stopPlayback();
      });

      audio.addEventListener("error", () => {
        urlIdx += 1;
        tryPlayUrl();
      });

      void audio.play().catch(() => {
        urlIdx += 1;
        tryPlayUrl();
      });
    };

    tryPlayUrl();
  };

  const pauseOrResume = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      setPlaybackPaused(true);
    } else {
      void audio.play();
      setPlaybackPaused(false);
    }
  };

  const seekTo = (ms: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(durationMs || 1, ms));
    audio.currentTime = clamped / 1000;
    setPositionMs(clamped);
  };

  const seekBy = (deltaMs: number) => {
    seekTo(positionMs + deltaMs);
  };

  const handleReanalyze = async () => {
    if (reanalyzing || !meetingId) return;
    setReanalyzing(true);
    setMessage(null);
    setErrorMsg(null);

    try {
      const { error: updErr } = await mysqlClient
        .from("meetings")
        .update({ CommentText: comment } as Record<string, unknown>)
        .eq("id", meetingId);

      if (updErr) throw new Error(updErr.message || "ذخیره توضیحات ناموفق بود");

      const res = await fetch(`${API_BASE_URL}/meetings/${encodeURIComponent(meetingId)}/analyze`, {
        method: "POST",
        headers: {
          ...mysqlClient.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: analyzeModel || "auto" }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.message || "درخواست پردازش ناموفق بود");
      }

      setMessage("درخواست پردازش ارسال شد");
      await queryClient.invalidateQueries({ queryKey: ["meeting-detail", meetingId] });
      await queryClient.invalidateQueries({ queryKey: ["meetings"] });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "درخواست پردازش ناموفق بود");
    } finally {
      setReanalyzing(false);
    }
  };

  const handleDeleteMeeting = async () => {
    if (deleting || !meetingId) return;
    setDeleting(true);
    setDeleteError(null);
    stopPlayback();

    try {
      const tagsRes = await fetch(
        `${API_BASE_URL}/meeting-tags/meetings/${encodeURIComponent(meetingId)}/tags`,
        { headers: mysqlClient.getAuthHeaders() },
      );
      const linkedTags = tagsRes.ok ? await tagsRes.json().catch(() => []) : [];
      if (Array.isArray(linkedTags)) {
        for (const tag of linkedTags) {
          await fetch(
            `${API_BASE_URL}/meeting-tags?meeting_id=${encodeURIComponent(meetingId)}&tag_id=${encodeURIComponent(tag.id)}`,
            { method: "DELETE", headers: mysqlClient.getAuthHeaders() },
          );
        }
      }

      const { error: delErr } = await mysqlClient
        .from("meetings")
        .delete()
        .eq("id", meetingId);

      if (delErr) throw new Error(delErr.message || "حذف جلسه ناموفق بود");

      await queryClient.invalidateQueries({ queryKey: ["meetings"] });
      navigate("/home", { replace: true });
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "حذف جلسه ناموفق بود");
    } finally {
      setDeleting(false);
    }
  };

  const processed = isProcessedStatus(data?.meeting?.status);
  const showProcessedBar = !isErrorStatus(data?.meeting?.status);

  return (
    <div dir="rtl" className="min-h-[100dvh] bg-[#FBF9F4] text-[#1C1B18]">
      <NeshastyarTopBar />

      <main className="mx-auto w-full max-w-2xl space-y-4 px-4 pb-24">
        <NeshastyarSubHeader
          title="گزینه‌های جلسه"
          onBack={`/meeting/${meetingId}`}
          actions={
            <MeetingTopSectionActions
              meetingId={meetingId}
              showParticipants={
                Boolean(data?.meeting) && !isErrorStatus(data?.meeting?.status)
              }
            />
          }
        />

        {isLoading ? (
          <div className="flex min-h-[45vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
          </div>
        ) : !data?.meeting ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3 text-center">
            <p className="text-[#66625B]">جلسه یافت نشد.</p>
            <NeshastyarSecondaryButton
              onClick={() => navigate("/home")}
              className="max-w-xs"
            >
              بازگشت به خانه
            </NeshastyarSecondaryButton>
          </div>
        ) : (
          <>
            {/* Special Instructions + Model Picker + Reprocess + Show Conversation */}
            <NeshastyarCard className="space-y-3">
              <NeshastyarField
                label="توضیحات خاص"
                placeholder="توضیحات خاص خود را وارد کنید…"
                value={comment}
                onChange={setComment}
                multiline
                rows={4}
              />

              <div>
                <label
                  htmlFor="options-analyze-model"
                  className="mb-1.5 block text-[12px] font-medium text-[#66625B]"
                >
                  مدل هوش مصنوعی تحلیل
                </label>
                <AnalyzeModelSelect
                  id="options-analyze-model"
                  value={analyzeModel}
                  onValueChange={setAnalyzeModel}
                  disabled={reanalyzing}
                />
              </div>

              <NeshastyarPrimaryButton
                loading={reanalyzing}
                onClick={() => void handleReanalyze()}
              >
                پردازش مجدد
              </NeshastyarPrimaryButton>

              {processed || data.meeting.transcription ? (
                <NeshastyarSecondaryButton
                  onClick={() => navigate(`/meeting/${meetingId}/conversation`)}
                >
                  نمایش جزییات مکالمات
                </NeshastyarSecondaryButton>
              ) : null}

              {message ? (
                <p className="text-[13px] text-[#0F766E]">{message}</p>
              ) : null}
              {errorMsg ? (
                <p className="text-[13px] text-[#B91C1C]">{errorMsg}</p>
              ) : null}
            </NeshastyarCard>

            {/* Audio Files Section matching Android MeetingOptionsScreen */}
            <div className="space-y-2">
              <h2 className="text-[15px] font-semibold text-[#404848]">
                فایل‌های صوتی
              </h2>

              {playbackError ? (
                <p className="text-[13px] text-[#B91C1C]">{playbackError}</p>
              ) : null}

              {data.files.length === 0 ? (
                <NeshastyarCard className="p-3.5">
                  <p className="text-[14px] text-[#66625B]">
                    هیچ فایل صوتی برای این جلسه یافت نشد.
                  </p>
                </NeshastyarCard>
              ) : (
                data.files.map((file) => {
                  const isPlaying = file.id === playingFileId;
                  const isPreparing = file.id === preparingFileId;
                  const totalMs = Math.max(
                    1,
                    isPlaying ? durationMs : (file.duration ?? 0) * 1000,
                  );

                  return (
                    <NeshastyarCard key={file.id} className="p-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isPlaying && !playbackPaused}
                          onClick={() => togglePlay(file)}
                          aria-label="پخش"
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#0F766E] hover:bg-[#D7EFED]/50 disabled:opacity-60"
                        >
                          {isPreparing ? (
                            <Loader2 className="h-5 w-5 animate-spin text-[#0F766E]" />
                          ) : (
                            <Play className="h-5 w-5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1 px-1">
                          <p className="truncate text-[14px] font-medium text-[#1C1B18]">
                            {file.fileName}
                          </p>
                          {isPreparing ? (
                            <p className="text-[12px] text-[#66625B]">
                              در حال شروع پخش…
                            </p>
                          ) : !isPlaying && (file.duration ?? 0) > 0 ? (
                            <p dir="ltr" className="text-right text-[12px] text-[#66625B]">
                              {formatDurationMs((file.duration ?? 0) * 1000)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      {isPlaying ? (
                        <div className="mt-3 space-y-2">
                          <div dir="ltr" className="space-y-1">
                            <input
                              type="range"
                              min={0}
                              max={totalMs}
                              value={Math.min(totalMs, positionMs)}
                              onChange={(e) => seekTo(Number(e.target.value))}
                              className="h-1.5 w-full cursor-pointer accent-[#0F766E]"
                            />
                            <div className="flex justify-between text-[12px]">
                              <span className="font-medium text-[#0F766E]">
                                {formatDurationMs(positionMs)}
                              </span>
                              <span className="text-[#66625B]">
                                {formatDurationMs(totalMs)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-evenly pt-1">
                            <SkipBtn
                              icon={<Rewind className="h-6 w-6" />}
                              label="۱۰ ثانیه عقب"
                              onClick={() => seekBy(-10_000)}
                            />
                            <SkipBtn
                              icon={
                                playbackPaused ? (
                                  <Play className="h-6 w-6" />
                                ) : (
                                  <Pause className="h-6 w-6" />
                                )
                              }
                              label={playbackPaused ? "ادامه" : "مکث"}
                              onClick={pauseOrResume}
                            />
                            <SkipBtn
                              icon={<Square className="h-5 w-5 fill-current" />}
                              label="توقف"
                              onClick={stopPlayback}
                            />
                            <SkipBtn
                              icon={<FastForward className="h-6 w-6" />}
                              label="۱۰ ثانیه جلو"
                              onClick={() => seekBy(10_000)}
                            />
                          </div>
                        </div>
                      ) : null}
                    </NeshastyarCard>
                  );
                })
              )}
            </div>

            {/* Delete Meeting Card */}
            <NeshastyarCard>
              <h3 className="text-[15px] font-semibold text-[#1C1B18]">
                حذف جلسه
              </h3>
              <p className="mt-1 mb-3 text-[13px] text-[#66625B]">
                این جلسه و ضبط صوتی آن را برای همیشه حذف کنید.
              </p>
              <button
                type="button"
                disabled={deleting}
                onClick={() => {
                  setDeleteConfirmed(false);
                  setConfirmDelete(true);
                }}
                className="flex h-11 w-full items-center justify-center rounded-[14px] bg-[#B91C1C] text-[15px] font-semibold text-white transition hover:bg-[#991B1B] disabled:opacity-50"
              >
                {deleting ? "در حال حذف..." : "حذف جلسه"}
              </button>
              {deleteError ? (
                <p className="mt-2 text-[13px] text-[#B91C1C]">{deleteError}</p>
              ) : null}
            </NeshastyarCard>
          </>
        )}
      </main>

      <MeetingDetailBottomBar
        meetingId={meetingId}
        showProcessedSections={showProcessedBar}
      />

      {/* Android-style Confirmation Dialog with Checkbox */}
      <Dialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setConfirmDelete(false);
            setDeleteConfirmed(false);
          }
        }}
      >
        <DialogContent dir="rtl" className="border-[#E8E2D5] bg-white text-right">
          <DialogHeader>
            <DialogTitle className="text-right text-[#1C1B18]">
              آیا مطمئن هستید؟
            </DialogTitle>
            <DialogDescription className="text-right text-[14px] leading-6 text-[#404848]">
              این عمل قابل بازگشت نیست. جلسه، ضبط صوتی، خلاصه و برچسب‌های آن برای همیشه حذف می‌شود.
            </DialogDescription>
          </DialogHeader>

          <label className="mt-2 flex cursor-pointer items-center gap-2.5 text-[14px] text-[#404848]">
            <input
              type="checkbox"
              checked={deleteConfirmed}
              onChange={(e) => setDeleteConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-[#E8E2D5] accent-[#B91C1C]"
            />
            <span>حذف این جلسه را تأیید می‌کنم</span>
          </label>

          <DialogFooter className="gap-2 sm:justify-start">
            <button
              type="button"
              disabled={!deleteConfirmed || deleting}
              onClick={() => {
                setConfirmDelete(false);
                void handleDeleteMeeting();
              }}
              className="rounded-xl bg-[#B91C1C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#991B1B] disabled:bg-[#E8E2D5] disabled:text-[#66625B]"
            >
              حذف جلسه
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                setConfirmDelete(false);
                setDeleteConfirmed(false);
              }}
              className="rounded-xl border border-[#E8E2D5] px-4 py-2 text-sm text-[#1C1B18] hover:bg-[#F5F2EB]"
            >
              لغو
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingDetailsOptions;

function SkipBtn({
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
      className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[#0D4D4D] transition hover:bg-[#D7EFED]/40"
    >
      {icon}
      <span className="text-[11px] leading-[13px]">{label}</span>
    </button>
  );
}
