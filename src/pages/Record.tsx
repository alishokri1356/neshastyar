import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  FileEdit,
  Mic,
  Pause,
  Play,
  Square,
  Trash2,
} from "lucide-react";
import { useMeetingStore } from "@/store/useMeetingStore";
import { useToast } from "@/hooks/use-toast";
import {
  loadUploadDraft,
  saveUploadDraftFiles,
  updateDraftStatus,
} from "@/lib/uploadDraftStore";
import { DraftStatus } from "@/lib/neshastyarStatus";
import { useSpeechInput } from "@/components/neshastyar/SpeechInputSheet";
import {
  NeshastyarCard,
  NeshastyarField,
  NeshastyarPrimaryButton,
  NeshastyarSecondaryButton,
  NeshastyarTopBar,
} from "@/components/neshastyar/NeshastyarUi";

interface AudioFile {
  id: string;
  name: string;
  duration: number;
  blob: Blob | File;
  type: "recording" | "upload";
}

const SUPPORTED_AUDIO_EXTENSIONS = [
  ".mp3",
  ".wav",
  ".aac",
  ".m4a",
  ".ogg",
  ".opus",
  ".webm",
  ".3gp",
  ".3gpp",
  ".amr",
  ".flac",
  ".caf",
  ".aiff",
  ".aif",
] as const;

const SUPPORTED_AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/aac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
  "audio/ogg",
  "audio/opus",
  "audio/webm",
  "audio/3gpp",
  "audio/3gpp2",
  "audio/amr",
  "audio/amr-wb",
  "audio/flac",
  "audio/x-caf",
  "audio/caf",
  "audio/aiff",
  "audio/x-aiff",
];

const SUPPORTED_FORMATS_LABEL =
  "MP3، WAV، AAC، M4A، OGG، OPUS، FLAC، WebM، 3GP، AMR، CAF، AIFF";
const FILE_INPUT_ACCEPT = `audio/*,${SUPPORTED_AUDIO_EXTENSIONS.join(",")}`;
const WAVEFORM_HEIGHTS = [
  12, 28, 18, 36, 22, 40, 16, 32, 24, 38, 14, 30, 20, 34, 18, 26, 12, 28, 22, 36,
];

const getFileExtension = (fileName: string) => {
  if (!fileName.includes(".")) return "";
  return fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
};

const isSupportedAudioFile = (file: File) => {
  const extension = getFileExtension(file.name);
  if (
    extension &&
    SUPPORTED_AUDIO_EXTENSIONS.includes(
      extension as (typeof SUPPORTED_AUDIO_EXTENSIONS)[number],
    )
  ) {
    return true;
  }
  const baseMime = (file.type || "").split(";")[0].trim().toLowerCase();
  return Boolean(baseMime && SUPPORTED_AUDIO_MIME_TYPES.includes(baseMime));
};

function formatHhMmSs(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

const Record: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const locationDraft = location.state as {
    audioFiles?: AudioFile[];
    commentText?: string;
  } | null;

  const {
    isRecording,
    isPaused,
    recordingDuration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setRecordingDuration,
    recordDraft,
    setRecordDraft,
    clearRecordDraft,
  } = useMeetingStore();

  const [audioFiles, setAudioFiles] = useState<AudioFile[]>(
    locationDraft?.audioFiles ?? recordDraft?.audioFiles ?? [],
  );
  const [commentText, setCommentText] = useState<string>(
    locationDraft?.commentText ?? recordDraft?.commentText ?? "",
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [playingFileId, setPlayingFileId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const audioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resumeAfterDictationRef = useRef(false);
  const durationRef = useRef(recordingDuration);
  durationRef.current = recordingDuration;

  // Hydrate persisted IndexedDB draft if store is empty
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (locationDraft?.audioFiles?.length || recordDraft?.audioFiles?.length) {
        await updateDraftStatus(DraftStatus.ON_RECORDING);
        if (!cancelled) setHydrated(true);
        return;
      }
      const stored = await loadUploadDraft();
      if (!cancelled && stored) {
        if (stored.status === DraftStatus.ON_UPLOADING) {
          navigate("/tag-selection", { replace: true });
          return;
        }
        if (stored.files.length > 0 || stored.commentText) {
          setAudioFiles(stored.files);
          setCommentText(stored.commentText);
        }
        await updateDraftStatus(DraftStatus.ON_RECORDING);
      }
      if (!cancelled) setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist draft changes to memory store + IndexedDB
  useEffect(() => {
    if (!hydrated) return;
    if (audioFiles.length > 0 || commentText.trim()) {
      setRecordDraft({ audioFiles, commentText });
      void saveUploadDraftFiles(
        audioFiles.map((f) => ({
          id: f.id,
          name: f.name,
          duration: f.duration,
          type: f.type,
          blob: f.blob,
        })),
        commentText,
        undefined,
        { status: DraftStatus.ON_RECORDING },
      );
    } else {
      clearRecordDraft();
    }
  }, [audioFiles, commentText, hydrated, setRecordDraft, clearRecordDraft]);

  // Timer tick while actively recording
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const id = window.setInterval(() => {
      setRecordingDuration(durationRef.current + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [isRecording, isPaused, setRecordingDuration]);

  // Cleanup audio previews on unmount
  useEffect(() => {
    const map = audioMapRef.current;
    return () => {
      map.forEach((el) => {
        el.pause();
        URL.revokeObjectURL(el.src);
      });
      map.clear();
    };
  }, []);

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      if (mediaRecorderRef.current?.state === "paused") {
        mediaRecorderRef.current.resume();
      }
      resumeRecording();
    } else {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.pause();
      }
      pauseRecording();
    }
  }, [isPaused, pauseRecording, resumeRecording]);

  const { startSpeech, speechSheet } = useSpeechInput({
    prompt: "یادداشت خود را بگویید",
    onFinished: () => {
      if (resumeAfterDictationRef.current) {
        resumeAfterDictationRef.current = false;
        if (mediaRecorderRef.current?.state === "paused") {
          mediaRecorderRef.current.resume();
        }
        resumeRecording();
      }
    },
    onResult: (dictated) => {
      const cleaned = dictated.trim();
      if (!cleaned) return;
      setCommentText((prev) => [prev.trim(), cleaned].filter(Boolean).join(" "));
    },
  });

  const startNoteDictation = () => {
    if (isRecording && !isPaused) {
      resumeAfterDictationRef.current = true;
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.pause();
      }
      pauseRecording();
    }
    void startSpeech();
  };

  const handleStartRecording = async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const mime = mediaRecorder.mimeType || "audio/webm";
        const audioBlob =
          chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: mime }) : null;

        if (audioBlob) {
          const newAudioFile: AudioFile = {
            id: `recording-${Date.now()}`,
            name: `ضبط ${new Date().toLocaleTimeString("fa-IR")}`,
            duration: durationRef.current,
            blob: audioBlob,
            type: "recording",
          };
          setAudioFiles((prev) => [...prev, newAudioFile]);
        }
      };

      mediaRecorder.start();
      startRecording();
    } catch {
      setPermissionError("برای ضبط باید دسترسی میکروفون را بدهید");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    stopRecording();
    setRecordingDuration(0);
  };

  const handleCancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      chunksRef.current = [];
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    stopRecording();
    setRecordingDuration(0);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files;
    if (!selected || selected.length === 0) return;

    const validFiles: File[] = [];
    const invalidNames: string[] = [];

    Array.from(selected).forEach((f) => {
      if (isSupportedAudioFile(f)) validFiles.push(f);
      else invalidNames.push(f.name);
    });

    if (invalidNames.length > 0) {
      toast({
        title: "برخی فایل‌ها صوتی نیستند",
        description: `فرمت‌های مجاز: ${SUPPORTED_FORMATS_LABEL}`,
        variant: "destructive",
      });
    }

    validFiles.forEach((file) => {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      audio.src = objectUrl;
      audio.addEventListener("loadedmetadata", () => {
        const dur = Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0;
        URL.revokeObjectURL(objectUrl);
        setAudioFiles((prev) => [
          ...prev,
          {
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            duration: dur,
            blob: file,
            type: "upload",
          },
        ]);
      });
      audio.addEventListener("error", () => {
        URL.revokeObjectURL(objectUrl);
        setAudioFiles((prev) => [
          ...prev,
          {
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            duration: 0,
            blob: file,
            type: "upload",
          },
        ]);
      });
    });

    event.target.value = "";
  };

  const togglePreviewPlay = async (file: AudioFile) => {
    const map = audioMapRef.current;
    if (playingFileId && playingFileId !== file.id) {
      map.get(playingFileId)?.pause();
    }
    let el = map.get(file.id);
    if (!el) {
      el = new Audio(URL.createObjectURL(file.blob));
      el.addEventListener("ended", () => setPlayingFileId(null));
      map.set(file.id, el);
    }
    if (playingFileId === file.id) {
      el.pause();
      setPlayingFileId(null);
    } else {
      try {
        await el.play();
        setPlayingFileId(file.id);
      } catch {
        toast({ title: "امکان پخش این فایل صوتی وجود ندارد", variant: "destructive" });
      }
    }
  };

  const removeAudioFile = (id: string) => {
    const el = audioMapRef.current.get(id);
    if (el) {
      el.pause();
      URL.revokeObjectURL(el.src);
      audioMapRef.current.delete(id);
    }
    if (playingFileId === id) setPlayingFileId(null);
    setAudioFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const canContinue = !isRecording && audioFiles.length > 0;

  const handleContinue = async () => {
    if (!canContinue) return;
    setRecordDraft({ audioFiles, commentText });
    await saveUploadDraftFiles(
      audioFiles.map((f) => ({
        id: f.id,
        name: f.name,
        duration: f.duration,
        type: f.type,
        blob: f.blob,
      })),
      commentText,
      undefined,
      { status: DraftStatus.ON_TAG_SELECTION },
    );
    navigate("/tag-selection", { state: { audioFiles, commentText } });
  };

  const phaseLabel = isRecording
    ? isPaused
      ? "ضبط متوقف موقت"
      : "در حال ضبط جلسه"
    : "آماده ضبط جلسه";

  return (
    <div dir="rtl" className="flex min-h-[100dvh] flex-col bg-[#FBF9F4] text-[#1C1B18]">
      <NeshastyarTopBar />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col space-y-4 px-4 pb-28 pt-1">
        {/* Sub-header matching Android RecordScreen */}
        <div className="flex items-center justify-between py-1">
          <button
            type="button"
            onClick={() => navigate("/home")}
            aria-label="بازگشت"
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-[#1C1B18] hover:bg-black/5"
          >
            <ArrowRight className="h-5 w-5" />
          </button>
          <span className="text-[16px] font-bold text-[#0D4D4D]">ضبط جلسه</span>
        </div>

        {/* Status + Timer */}
        <div className="flex flex-col items-center pt-1 text-center">
          <p className="text-[14px] text-[#66625B]">{phaseLabel}</p>
          <p
            dir="ltr"
            className="mt-2 text-[42px] font-bold tabular-nums tracking-tight text-[#1C1B18]"
          >
            {formatHhMmSs(recordingDuration)}
          </p>
        </div>

        {/* 20-bar Waveform matching Android WaveformPlaceholder */}
        <div className="flex h-12 w-full items-center justify-evenly">
          {WAVEFORM_HEIGHTS.map((h, idx) => {
            const active = isRecording && !isPaused;
            return (
              <span
                key={idx}
                style={{ height: `${active ? h : Math.round(h / 2)}px` }}
                className={`w-1 rounded-sm transition-all duration-300 ${
                  active ? "animate-pulse bg-[#0F766E]/85" : "bg-[#E8E2D5]"
                }`}
              />
            );
          })}
        </div>

        {/* Primary Recording Controls */}
        <div className="flex items-center justify-center py-2">
          {!isRecording ? (
            <button
              type="button"
              onClick={() => void handleStartRecording()}
              aria-label="شروع ضبط"
              className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#0F766E] text-[#FBF9F4] shadow-[0_14px_30px_rgba(13,77,77,0.32)] transition hover:bg-[#0D4D4D] active:scale-95"
            >
              <Mic className="h-9 w-9" />
            </button>
          ) : (
            <div className="flex items-center gap-5">
              <button
                type="button"
                onClick={handlePauseResume}
                aria-label={isPaused ? "ادامه ضبط" : "مکث ضبط"}
                className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#F5F2EB] text-[#0F766E] border border-[#E8E2D5] transition hover:bg-[#E8E2D5]/60 active:scale-95"
              >
                {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
              </button>

              <button
                type="button"
                onClick={handleStopRecording}
                aria-label="پایان ضبط"
                className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-[#0F766E] text-[#FBF9F4] shadow-[0_14px_30px_rgba(13,77,77,0.32)] transition hover:bg-[#0D4D4D] active:scale-95"
              >
                <Square className="h-8 w-8 fill-current" />
              </button>
            </div>
          )}
        </div>

        {permissionError ? (
          <p className="text-center text-[13px] text-[#B91C1C]">{permissionError}</p>
        ) : null}

        {/* Quick Notes Card with Speech Dictation */}
        <NeshastyarCard>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileEdit className="h-5 w-5 text-[#0F766E]" />
              <span className="text-[15px] font-semibold text-[#1C1B18]">
                یادداشت‌های سریع
              </span>
            </div>
            <button
              type="button"
              onClick={startNoteDictation}
              aria-label="یادداشت صوتی"
              title="یادداشت صوتی"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E2D5] text-[#1C1B18] transition hover:bg-[#F5F2EB]"
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-2.5">
            <NeshastyarField
              label="یادداشت"
              placeholder="نکته مهمی در این لحظه رخ داد؟ اینجا بنویسید…"
              value={commentText}
              onChange={setCommentText}
              multiline
              rows={3}
            />
          </div>
        </NeshastyarCard>

        {/* Import Audio File Button */}
        <input
          ref={fileInputRef}
          type="file"
          accept={FILE_INPUT_ACCEPT}
          multiple
          hidden
          onChange={handleFileChange}
        />
        <NeshastyarSecondaryButton
          disabled={isRecording}
          onClick={() => fileInputRef.current?.click()}
        >
          افزودن فایل صوتی
        </NeshastyarSecondaryButton>

        {/* Files List */}
        {audioFiles.length > 0 ? (
          <div className="space-y-2 pt-1">
            <h2 className="text-[14px] font-semibold text-[#404848]">
              فایل‌ها ({audioFiles.length})
            </h2>
            {audioFiles.map((file) => {
              const source = file.type === "recording" ? "ضبط" : "وارد شده";
              const dur = file.duration > 0 ? ` · ${file.duration} ثانیه` : "";
              const playing = playingFileId === file.id;
              return (
                <NeshastyarCard key={file.id} className="p-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void togglePreviewPlay(file)}
                      aria-label={playing ? "مکث" : "پخش"}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#0F766E] hover:bg-[#D7EFED]/50"
                    >
                      {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-[#1C1B18]">
                        {file.name}
                      </p>
                      <p className="text-[12px] text-[#66625B]">{source + dur}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAudioFile(file.id)}
                      aria-label="حذف"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#B91C1C] hover:bg-[#FDF2F0]"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </NeshastyarCard>
              );
            })}
          </div>
        ) : null}

        {isRecording ? (
          <NeshastyarSecondaryButton onClick={handleCancelRecording}>
            لغو ضبط جلسه
          </NeshastyarSecondaryButton>
        ) : null}
      </main>

      {/* Fixed Bottom Continue CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 bg-[#FBF9F4]/95 px-4 py-3 backdrop-blur-sm pb-safe">
        <div className="mx-auto w-full max-w-2xl">
          <NeshastyarPrimaryButton
            disabled={!canContinue}
            onClick={() => void handleContinue()}
            icon={<ArrowLeft className="h-5 w-5" />}
          >
            ادامه و انتخاب برچسب‌ها
          </NeshastyarPrimaryButton>
        </div>
      </div>

      {speechSheet}
    </div>
  );
};

export default Record;
