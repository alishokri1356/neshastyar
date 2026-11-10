import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { transcribeDictationBlob } from "@/lib/neshastyarApi";
import { useToast } from "@/hooks/use-toast";

const LEVEL_BAR_COUNT = 5;
const MAX_DURATION_MS = 120_000;

type DictationPhase =
  | { kind: "hidden" }
  | { kind: "recording" }
  | { kind: "transcribing" }
  | { kind: "failed"; message: string };

function pickSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/ogg",
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function useSpeechInput({
  prompt = "سؤال خود را بگویید",
  onFinished,
  onResult,
}: {
  prompt?: string;
  onFinished?: () => void;
  onResult: (text: string) => void;
}) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<DictationPhase>({ kind: "hidden" });
  const [paused, setPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [levels, setLevels] = useState<number[]>(() => Array(LEVEL_BAR_COUNT).fill(0));

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const lastBlobRef = useRef<Blob | null>(null);
  const segmentStartRef = useRef<number>(0);
  const accumulatedMsRef = useRef<number>(0);
  const cancelledRef = useRef<boolean>(false);
  const abortTranscribeRef = useRef<boolean>(false);

  const onFinishedRef = useRef(onFinished);
  const onResultRef = useRef(onResult);
  useEffect(() => {
    onFinishedRef.current = onFinished;
    onResultRef.current = onResult;
  }, [onFinished, onResult]);

  const cleanupMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    recorderRef.current = null;
  }, []);

  const runTranscribe = useCallback(
    async (blob: Blob) => {
      abortTranscribeRef.current = false;
      setPhase({ kind: "transcribing" });
      try {
        const text = await transcribeDictationBlob(blob);
        if (abortTranscribeRef.current) return;
        lastBlobRef.current = null;
        setPhase({ kind: "hidden" });
        if (!text) {
          toast({ title: "صحبتی تشخیص داده نشد" });
        } else {
          onResultRef.current(text);
        }
      } catch (err) {
        if (abortTranscribeRef.current) return;
        setPhase({
          kind: "failed",
          message: err instanceof Error ? err.message : "تبدیل گفتار به متن ناموفق بود",
        });
      }
    },
    [toast],
  );

  const stopAndTranscribe = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return;
    cancelledRef.current = false;
    rec.stop();
  }, []);

  const cancelAll = useCallback(() => {
    abortTranscribeRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      cancelledRef.current = true;
      rec.stop();
    } else {
      cleanupMedia();
    }
    lastBlobRef.current = null;
    setPhase({ kind: "hidden" });
  }, [cleanupMedia]);

  const togglePause = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    const now = performance.now();
    if (paused && rec.state === "paused") {
      rec.resume();
      segmentStartRef.current = now;
      setPaused(false);
    } else if (!paused && rec.state === "recording") {
      rec.pause();
      accumulatedMsRef.current += now - segmentStartRef.current;
      setPaused(true);
    }
  }, [paused]);

  const start = useCallback(async () => {
    if (phase.kind !== "hidden") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast({
        title: "مرورگر شما از ورودی صوتی پشتیبانی نمی‌کند",
        variant: "destructive",
      });
      onFinishedRef.current?.();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      try {
        const AudioContextCtor =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextCtor();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
      } catch {
        // Level bars degrade gracefully if Web Audio is unavailable
      }

      const mimeType = pickSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelledRef.current = false;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const finalMime = recorder.mimeType || mimeType || "audio/webm";
        const blob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: finalMime }) : null;
        cleanupMedia();
        onFinishedRef.current?.();

        if (cancelledRef.current) {
          setPhase({ kind: "hidden" });
          return;
        }
        if (!blob || blob.size === 0) {
          setPhase({ kind: "hidden" });
          toast({ title: "صدایی ضبط نشد" });
          return;
        }
        lastBlobRef.current = blob;
        void runTranscribe(blob);
      };

      recorder.start(200);
      segmentStartRef.current = performance.now();
      accumulatedMsRef.current = 0;
      setElapsedMs(0);
      setPaused(false);
      setLevels(Array(LEVEL_BAR_COUNT).fill(0));
      setPhase({ kind: "recording" });
    } catch {
      cleanupMedia();
      toast({
        title: "برای ورودی صوتی باید دسترسی میکروفون را بدهید",
        variant: "destructive",
      });
      onFinishedRef.current?.();
    }
  }, [cleanupMedia, phase.kind, runTranscribe, toast]);

  useEffect(() => {
    if (phase.kind !== "recording") return;
    const dataArray = new Uint8Array(64);
    const id = window.setInterval(() => {
      const running = paused ? 0 : performance.now() - segmentStartRef.current;
      const total = accumulatedMsRef.current + running;
      setElapsedMs(total);
      if (total >= MAX_DURATION_MS) {
        stopAndTranscribe();
        return;
      }
      if (!paused && analyserRef.current) {
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sumSq = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sumSq += v * v;
        }
        const rms = Math.min(1, Math.sqrt(sumSq / dataArray.length) * 3.5);
        setLevels((prev) => [...prev.slice(1), rms]);
      }
    }, 100);
    return () => window.clearInterval(id);
  }, [phase.kind, paused, stopAndTranscribe]);

  useEffect(() => {
    return () => {
      abortTranscribeRef.current = true;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        cancelledRef.current = true;
        recorderRef.current.stop();
      }
      cleanupMedia();
    };
  }, [cleanupMedia]);

  const sheetElement = (
    <Drawer
      open={phase.kind !== "hidden"}
      onOpenChange={(open) => {
        if (!open) cancelAll();
      }}
    >
      <DrawerContent
        dir="rtl"
        className="rounded-t-[24px] border-[#E8E2D5] bg-[#FBF9F4] text-[#1C1B18]"
      >
        <div className="mx-auto w-full max-w-lg px-6 pb-6 pt-4">
          <DrawerTitle
            className="text-right text-[26px] font-normal leading-[38px] text-[#66625B]"
            style={{ fontFamily: "'Noto Naskh Arabic', 'Vazirmatn', Georgia, serif" }}
          >
            {prompt}
          </DrawerTitle>
          <DrawerDescription className="mt-3.5 text-right text-[15px] leading-6">
            {phase.kind === "recording" ? (
              <span className="text-[#66625B]">
                {paused
                  ? "ضبط متوقف شده است"
                  : "صحبت کنید؛ پس از «پایان» متن در کادر قرار می‌گیرد"}
              </span>
            ) : phase.kind === "transcribing" ? (
              <span className="text-[#66625B]">در حال تبدیل گفتار به متن…</span>
            ) : phase.kind === "failed" ? (
              <span className="text-[#B91C1C]">{phase.message}</span>
            ) : null}
          </DrawerDescription>

          <div className="mt-20">
            {phase.kind === "recording" ? (
              <div className="flex items-center justify-between gap-3">
                <DictationPill filled={false} onClick={togglePause}>
                  {paused ? (
                    <Play className="h-5 w-5 text-[#1C1B18]" />
                  ) : (
                    <Pause className="h-5 w-5 text-[#1C1B18]" />
                  )}
                </DictationPill>

                <div className="flex items-center gap-2.5" dir="ltr">
                  <span className="text-[20px] font-semibold tabular-nums text-[#1C1B18]">
                    {formatClock(elapsedMs)}
                  </span>
                  <div className="flex h-6 items-center gap-[3px]">
                    {levels.map((lv, idx) => {
                      const heightPct = !paused ? Math.round((0.3 + 0.7 * lv) * 100) : 30;
                      return (
                        <span
                          key={idx}
                          style={{ height: `${heightPct}%` }}
                          className={`w-[3px] rounded-sm transition-all duration-100 ${
                            !paused ? "bg-[#6CC24A]" : "bg-[#E8E2D5]"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>

                <DictationPill filled onClick={stopAndTranscribe}>
                  <span className="text-[17px] font-semibold text-white">پایان</span>
                </DictationPill>
              </div>
            ) : phase.kind === "transcribing" ? (
              <div className="flex items-center justify-between">
                <Loader2 className="h-[22px] w-[22px] animate-spin text-[#0D4D4D]" />
                <DictationPill filled={false} onClick={cancelAll}>
                  <span className="text-[16px] text-[#1C1B18]">انصراف</span>
                </DictationPill>
              </div>
            ) : phase.kind === "failed" ? (
              <div className="flex items-center justify-between">
                <DictationPill filled={false} onClick={cancelAll}>
                  <span className="text-[16px] text-[#1C1B18]">انصراف</span>
                </DictationPill>
                <DictationPill
                  filled
                  onClick={() => {
                    if (lastBlobRef.current) void runTranscribe(lastBlobRef.current);
                  }}
                >
                  <span className="text-[16px] font-semibold text-white">تلاش مجدد</span>
                </DictationPill>
              </div>
            ) : null}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );

  return {
    startSpeech: start,
    speechSheet: sheetElement,
    isSpeechOpen: phase.kind !== "hidden",
  };
}

function DictationPill({
  filled,
  onClick,
  children,
}: {
  filled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-[54px] min-w-[108px] items-center justify-center rounded-[28px] px-6 transition active:scale-95 ${
        filled
          ? "bg-[#1C1B18] text-white hover:bg-[#2f2d28]"
          : "border border-[#E8E2D5] bg-[#FBF9F4] text-[#1C1B18] hover:bg-[#F5F2EB]"
      }`}
    >
      {children}
    </button>
  );
}
