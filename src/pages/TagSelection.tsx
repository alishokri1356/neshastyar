import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, X } from "lucide-react";
import { useMeetingStore } from "@/store/useMeetingStore";
import { mysqlClient } from "@/lib/mysql-client";
import { useToast } from "@/hooks/use-toast";
import AnalyzeModelSelect from "@/components/AnalyzeModelSelect";
import {
  uploadFileResumable,
  UploadAbortedError,
} from "@/lib/resumableUpload";
import {
  clearUploadDraft,
  loadUploadDraft,
  markUploadLinked,
  saveCompletedUpload,
  saveUploadDraftFiles,
  saveUploadMeetingId,
  setUploadActive,
} from "@/lib/uploadDraftStore";
import { DraftStatus } from "@/lib/neshastyarStatus";
import {
  NeshastyarCard,
  NeshastyarField,
  NeshastyarPrimaryButton,
  NeshastyarSecondaryButton,
  NeshastyarSubHeader,
  NeshastyarTopBar,
} from "@/components/neshastyar/NeshastyarUi";

interface AudioFile {
  id: string;
  name: string;
  duration: number;
  blob: Blob | File;
  type: "recording" | "upload";
}

interface CatalogTag {
  id: string;
  name: string;
  color?: string;
}

interface CatalogPerson {
  id: string;
  name: string;
}

type CatalogRow =
  | { kind: "tag"; key: string; id: string; name: string }
  | { kind: "person"; key: string; id: string; name: string };

const TAG_COLORS = [
  "#0D4D4D",
  "#0F766E",
  "#166534",
  "#C88A2E",
  "#1D4ED8",
  "#7C3AED",
];

function normalizeCatalogQuery(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ");
}

const TagSelection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { recordDraft, setRecordDraft, clearRecordDraft } = useMeetingStore();

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://localhost:3001/api";

  const locationState = location.state as {
    audioFiles?: AudioFile[];
    commentText?: string;
  } | null;

  const [audioFiles, setAudioFiles] = useState<AudioFile[]>(
    locationState?.audioFiles ?? recordDraft?.audioFiles ?? [],
  );
  const [commentText, setCommentText] = useState<string>(
    locationState?.commentText ?? recordDraft?.commentText ?? "",
  );

  const [tags, setTags] = useState<CatalogTag[]>([]);
  const [participants, setParticipants] = useState<CatalogPerson[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [queryInput, setQueryInput] = useState("");
  const [analyzeModel, setAnalyzeModel] = useState("auto");

  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileIndex, setFileIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const audioFilesRef = useRef<AudioFile[]>(audioFiles);
  audioFilesRef.current = audioFiles;

  // Load tags, participants, user default model, and stored draft
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [stored, sessionRes, profileRes] = await Promise.all([
          loadUploadDraft(),
          mysqlClient.auth.getSession(),
          mysqlClient.auth.getProfile(),
        ]);

        if (cancelled) return;

        if (profileRes.data?.default_analyze_model) {
          setAnalyzeModel(profileRes.data.default_analyze_model);
        }

        if (stored) {
          if (audioFilesRef.current.length === 0 && stored.files.length > 0) {
            setAudioFiles(stored.files);
            setCommentText((prev) => prev || stored.commentText);
            setRecordDraft({
              audioFiles: stored.files,
              commentText: stored.commentText,
            });
          }
          if (stored.selectedTagIds?.length) {
            setSelectedTagIds(stored.selectedTagIds);
          }
          if (stored.selectedParticipantIds?.length) {
            setSelectedParticipantIds(stored.selectedParticipantIds);
          }
        }

        const userId = sessionRes.data?.session?.user?.id;
        if (userId) {
          const [tagsRes, peopleRes] = await Promise.all([
            mysqlClient.from("tags").select("*").eq("user_id", userId),
            mysqlClient.participants.list(),
          ]);

          if (!cancelled) {
            if (Array.isArray(tagsRes.data)) {
              setTags(
                tagsRes.data.map((t: { id: string; name: string; color?: string }) => ({
                  id: t.id,
                  name: t.name || t.id,
                  color: t.color,
                })),
              );
            }
            if (Array.isArray(peopleRes.data?.participants)) {
              setParticipants(
                peopleRes.data.participants.map((p: { id: string; name: string }) => ({
                  id: p.id,
                  name: p.name || p.id,
                })),
              );
            }
          }
        }
      } catch (err) {
        console.error("Failed loading tag selection catalog:", err);
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    })();

    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [setRecordDraft]);

  // Persist tag & participant selection into IndexedDB draft
  useEffect(() => {
    if (audioFiles.length === 0) return;
    void saveUploadDraftFiles(
      audioFiles.map((f) => ({
        id: f.id,
        name: f.name,
        duration: f.duration,
        type: f.type,
        blob: f.blob,
      })),
      commentText,
      selectedTagIds,
      {
        status: isUploading ? DraftStatus.ON_UPLOADING : DraftStatus.ON_TAG_SELECTION,
        selectedParticipantIds,
      },
    );
  }, [audioFiles, commentText, selectedTagIds, selectedParticipantIds, isUploading]);

  const normalizedQuery = normalizeCatalogQuery(queryInput);

  const catalogRows: CatalogRow[] = useMemo(() => {
    const all: CatalogRow[] = [
      ...tags.map((t) => ({
        kind: "tag" as const,
        key: `tag:${t.id}`,
        id: t.id,
        name: t.name,
      })),
      ...participants.map((p) => ({
        kind: "person" as const,
        key: `person:${p.id}`,
        id: p.id,
        name: p.name,
      })),
    ];

    return all
      .filter((row) =>
        !normalizedQuery || normalizeCatalogQuery(row.name).includes(normalizedQuery),
      )
      .sort((a, b) =>
        normalizeCatalogQuery(a.name).localeCompare(normalizeCatalogQuery(b.name), "fa"),
      );
  }, [tags, participants, normalizedQuery]);

  const selectedTags = useMemo(
    () => tags.filter((t) => selectedTagIds.includes(t.id)),
    [tags, selectedTagIds],
  );
  const selectedPeople = useMemo(
    () => participants.filter((p) => selectedParticipantIds.includes(p.id)),
    [participants, selectedParticipantIds],
  );

  const handleAddFromQuery = async () => {
    const raw = queryInput.trim();
    if (!raw || isUploading) return;
    const q = normalizeCatalogQuery(raw);

    const exactTag = tags.find((t) => normalizeCatalogQuery(t.name) === q);
    const exactPerson = participants.find((p) => normalizeCatalogQuery(p.name) === q);

    if (exactTag || exactPerson) {
      if (exactTag && !selectedTagIds.includes(exactTag.id)) {
        setSelectedTagIds((prev) => [...prev, exactTag.id]);
      }
      if (exactPerson && !selectedParticipantIds.includes(exactPerson.id)) {
        setSelectedParticipantIds((prev) => [...prev, exactPerson.id]);
      }
      setQueryInput("");
      return;
    }

    // Create new tag just like Android TagSelectionViewModel.createTag
    try {
      const {
        data: { session },
      } = await mysqlClient.auth.getSession();
      if (!session?.user) return;

      const color = TAG_COLORS[Math.floor(Math.random() * TAG_COLORS.length)];
      const { data, error } = await mysqlClient.from("tags").insert({
        name: raw,
        color,
        user_id: session.user.id,
      });

      if (error || !data) {
        setErrorMsg(error?.message || "ایجاد برچسب ناموفق بود");
        return;
      }

      const created: CatalogTag = {
        id: data.id,
        name: data.name || raw,
        color: data.color,
      };
      setTags((prev) => [...prev, created]);
      setSelectedTagIds((prev) => [...prev, created.id]);
      setQueryInput("");
    } catch {
      setErrorMsg("ایجاد برچسب ناموفق بود");
    }
  };

  const handleUploadAndAnalyze = async () => {
    const files = audioFilesRef.current;
    if (!files || files.length === 0) {
      setErrorMsg("هیچ فایل صوتی برای آپلود یافت نشد");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsUploading(true);
    setErrorMsg(null);
    setUploadProgress(0);

    try {
      await setUploadActive(true);

      const {
        data: { session },
      } = await mysqlClient.auth.getSession();
      const user = session?.user;
      const token = session?.access_token || session?.token;

      if (!user || !token) {
        await setUploadActive(false);
        setErrorMsg("لطفاً دوباره وارد حساب خود شوید");
        setIsUploading(false);
        return;
      }

      const firstFile = files[0];
      const meetingTitle =
        firstFile.name.replace(/\.(wav|mp3|m4a|ogg|webm|aac|flac)$/i, "") || "جلسه";
      const stored = await loadUploadDraft();

      const uploadedFiles: Array<{
        id: string;
        fileName: string;
        filePath: string;
        fileSize: number;
        duration: number;
        format: string;
        uploadOrder: number;
        linked?: boolean;
      }> = [];

      for (let i = 0; i < files.length; i++) {
        if (controller.signal.aborted) throw new UploadAbortedError();
        setFileIndex(i + 1);
        const file = files[i];
        const existing = stored?.completed?.[file.id];

        if (existing?.filePath) {
          uploadedFiles.push({
            id: file.id,
            fileName: existing.fileName,
            filePath: existing.filePath,
            fileSize: existing.fileSize,
            duration: existing.duration,
            format: existing.format,
            uploadOrder: existing.uploadOrder || i + 1,
            linked: existing.linked,
          });
          setUploadProgress(Math.round(((i + 1) / files.length) * 100));
          continue;
        }

        const safeName =
          file.name.replace(/[^\w.\-()\u0600-\u06FF ]+/g, "_") || "audio.m4a";
        const result = await uploadFileResumable({
          apiBaseUrl: API_BASE_URL,
          token,
          uploadId: file.id,
          file: file.blob,
          fileName: safeName,
          mimeType: file.blob.type || "audio/mp4",
          signal: controller.signal,
          onProgress: (loaded, total) => {
            const fileFraction = total > 0 ? loaded / total : 0;
            const overall = Math.round(((i + fileFraction) / files.length) * 100);
            setUploadProgress(Math.min(99, overall));
          },
        });

        const completed = {
          fileName: safeName,
          filePath: result.relativePath,
          fileSize: result.size,
          duration: file.duration,
          format: result.format,
          uploadOrder: i + 1,
          linked: false,
        };
        await saveCompletedUpload(file.id, completed);
        uploadedFiles.push({ id: file.id, ...completed });
      }

      let meetingId = stored?.meetingId || null;
      if (!meetingId) {
        const { data: meetingData, error: meetingError } = await mysqlClient
          .from("meetings")
          .insert({
            meeting_date: new Date().toISOString(),
            user_id: user.id,
            summary: "",
            title: meetingTitle,
            status: "آماده پردازش",
            CommentText: commentText || null,
          });

        if (meetingError) throw new Error(meetingError.message);
        meetingId = meetingData.id || meetingData[0]?.id;
        if (!meetingId) throw new Error("شناسه جلسه از سرور برنگشت");
        await saveUploadMeetingId(meetingId);
      }

      for (const uploadedFile of uploadedFiles) {
        if (uploadedFile.linked) continue;
        const { error: audioFileError } = await mysqlClient
          .from("audio_files")
          .insert({
            meeting_id: meetingId,
            file_name: uploadedFile.fileName,
            file_path: uploadedFile.filePath,
            file_size: uploadedFile.fileSize,
            duration: uploadedFile.duration,
            format: uploadedFile.format,
            upload_order: uploadedFile.uploadOrder,
          });

        if (audioFileError) {
          throw new Error(audioFileError.message || "ثبت فایل صوتی ناموفق بود");
        }
        await markUploadLinked(uploadedFile.id);
      }

      // Link selected tags
      for (const tagId of selectedTagIds) {
        await mysqlClient.from("meeting_tags").insert({
          meeting_id: meetingId,
          tag_id: tagId,
        });
      }

      // Link selected participants (Android parity!)
      for (const participantId of selectedParticipantIds) {
        await mysqlClient.meetingParticipants.add({
          meetingId,
          participantId,
        });
      }

      // Trigger AI analysis
      await fetch(`${API_BASE_URL}/meetings/${meetingId}/analyze`, {
        method: "POST",
        headers: {
          ...mysqlClient.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: analyzeModel || "auto" }),
      });

      setUploadProgress(100);
      await clearUploadDraft();
      clearRecordDraft();

      toast({
        title: "آپلود تکمیل شد",
        description: "تحلیل هوشمند جلسه آغاز شد.",
      });
      navigate("/home");
    } catch (err) {
      await setUploadActive(false);
      if (err instanceof UploadAbortedError) {
        setErrorMsg("آپلود متوقف شد؛ می‌توانید ادامه دهید.");
      } else {
        setErrorMsg(err instanceof Error ? err.message : "آپلود ناموفق بود");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div dir="rtl" className="flex min-h-[100dvh] flex-col bg-[#FBF9F4] text-[#1C1B18] pb-safe">
      <NeshastyarTopBar />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col space-y-3 px-4 pb-6">
        <NeshastyarSubHeader
          title="برچسب‌گذاری و ارسال به هوش مصنوعی"
          onBack={() =>
            navigate("/record", { state: { audioFiles, commentText } })
          }
        />

        {/* Search / Add Card matching Android TagSelectionScreen */}
        <NeshastyarCard>
          <p className="text-[13px] text-[#66625B]">جستجو</p>
          <div className="mt-2">
            <NeshastyarField
              label="برچسب یا شرکت‌کننده"
              placeholder="نام را وارد کنید"
              value={queryInput}
              onChange={setQueryInput}
              disabled={isUploading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAddFromQuery();
                }
              }}
            />
          </div>
          <div className="mt-2.5">
            <NeshastyarPrimaryButton
              disabled={isUploading || !queryInput.trim()}
              onClick={() => void handleAddFromQuery()}
            >
              افزودن
            </NeshastyarPrimaryButton>
          </div>
        </NeshastyarCard>

        {/* Selected Chips */}
        {selectedTags.length > 0 || selectedPeople.length > 0 ? (
          <NeshastyarCard className="space-y-3">
            {selectedTags.length > 0 ? (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-[#404848]">
                  برچسب‌ها
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <SelectedChip
                      key={tag.id}
                      name={tag.name}
                      disabled={isUploading}
                      onRemove={() =>
                        setSelectedTagIds((prev) => prev.filter((id) => id !== tag.id))
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {selectedPeople.length > 0 ? (
              <div>
                <p className="mb-2 text-[13px] font-semibold text-[#404848]">
                  شرکت‌کنندگان
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedPeople.map((person) => (
                    <SelectedChip
                      key={person.id}
                      name={person.name}
                      disabled={isUploading}
                      onRemove={() =>
                        setSelectedParticipantIds((prev) =>
                          prev.filter((id) => id !== person.id),
                        )
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </NeshastyarCard>
        ) : null}

        {/* Unified Catalog List (Tags + Participants) */}
        <div className="max-h-[38vh] flex-1 space-y-1.5 overflow-y-auto py-1">
          {loadingCatalog ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-[#0D4D4D]" />
            </div>
          ) : catalogRows.length === 0 ? (
            <p className="py-4 text-[14px] text-[#66625B]">
              {!normalizedQuery
                ? "برچسب یا شرکت‌کننده‌ای وجود ندارد"
                : "موردی با این نام پیدا نشد"}
            </p>
          ) : (
            catalogRows.map((row) => {
              const selected =
                row.kind === "tag"
                  ? selectedTagIds.includes(row.id)
                  : selectedParticipantIds.includes(row.id);

              return (
                <NeshastyarCard
                  key={row.key}
                  accentBar={selected}
                  onClick={
                    !isUploading
                      ? () => {
                          if (row.kind === "tag") {
                            setSelectedTagIds((prev) =>
                              prev.includes(row.id)
                                ? prev.filter((id) => id !== row.id)
                                : [...prev, row.id],
                            );
                          } else {
                            setSelectedParticipantIds((prev) =>
                              prev.includes(row.id)
                                ? prev.filter((id) => id !== row.id)
                                : [...prev, row.id],
                            );
                          }
                          setQueryInput("");
                        }
                      : undefined
                  }
                  className="px-3.5 py-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] font-medium text-[#1C1B18]">
                      {row.name}
                    </span>
                    <span className="text-[12px] text-[#66625B]">
                      {row.kind === "tag" ? "برچسب" : "شرکت‌کننده"}
                    </span>
                  </div>
                </NeshastyarCard>
              );
            })
          )}
        </div>

        {/* Web AI Model Picker preserved in Android card style */}
        <NeshastyarCard className="py-3">
          <label
            htmlFor="tag-selection-model"
            className="mb-1.5 block text-[12px] font-medium text-[#66625B]"
          >
            مدل هوش مصنوعی تحلیل
          </label>
          <AnalyzeModelSelect
            id="tag-selection-model"
            value={analyzeModel}
            onValueChange={setAnalyzeModel}
            disabled={isUploading}
          />
        </NeshastyarCard>

        {errorMsg ? (
          <p className="text-[13px] text-[#B91C1C]">{errorMsg}</p>
        ) : null}

        {isUploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#404848]">
                {audioFiles.length > 0 && fileIndex > 0
                  ? `فایل ${fileIndex} از ${audioFiles.length} — در حال آپلود فایل…`
                  : "در حال آپلود فایل…"}
              </span>
              <span className="font-semibold text-[#0F766E]">{uploadProgress}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#F2EDE8]">
              <div
                style={{ width: `${Math.min(100, Math.max(0, uploadProgress))}%` }}
                className="h-full bg-[#0D4D4D] transition-all duration-200"
              />
            </div>
            <NeshastyarSecondaryButton
              onClick={() => abortRef.current?.abort()}
              className="h-10 text-xs"
            >
              توقف موقت آپلود
            </NeshastyarSecondaryButton>
          </div>
        ) : null}

        <NeshastyarPrimaryButton
          loading={isUploading}
          disabled={isUploading || audioFiles.length === 0}
          onClick={() => void handleUploadAndAnalyze()}
        >
          {isUploading ? "در حال آپلود…" : "تأیید و شروع تحلیل هوشمند"}
        </NeshastyarPrimaryButton>
      </main>
    </div>
  );
};

export default TagSelection;

function SelectedChip({
  name,
  onRemove,
  disabled,
}: {
  name: string;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[20px] bg-[#D7EFED] pr-3 pl-1 py-1 text-[13px] font-medium text-[#0D4D4D]">
      <span>{name}</span>
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={`حذف ${name}`}
        className="flex h-6 w-6 items-center justify-center rounded-full text-[#0D4D4D] hover:bg-[#0D4D4D]/10"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
