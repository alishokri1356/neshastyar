import { useCallback, useEffect, useState } from "react";
import { loadUploadDraft, subscribeUploadDraft } from "@/lib/uploadDraftStore";
import { DraftStatus, type DraftStatusType } from "@/lib/neshastyarStatus";

export interface LocalDraftUi {
  id: string;
  status: DraftStatusType;
  title: string;
  createdAt: number;
  fileCount: number;
}

export function useLocalDraft(): LocalDraftUi | null {
  const [draft, setDraft] = useState<LocalDraftUi | null>(null);

  const refresh = useCallback(async () => {
    const stored = await loadUploadDraft();
    if (!stored) {
      setDraft(null);
      return;
    }
    const visible =
      stored.files.length > 0 || stored.status !== DraftStatus.ON_RECORDING;
    if (!visible) {
      setDraft(null);
      return;
    }
    setDraft({
      id: stored.id,
      status: stored.status,
      title: stored.commentText.trim() || "جلسه جدید",
      createdAt: stored.createdAt,
      fileCount: stored.files.length,
    });
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeUploadDraft(() => {
      void refresh();
    });
  }, [refresh]);

  return draft;
}
