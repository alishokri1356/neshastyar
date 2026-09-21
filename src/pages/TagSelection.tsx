import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { useMeetingStore } from '@/store/useMeetingStore';
import { Plus, Tag, X, Play, Pause, GripVertical } from 'lucide-react';
import type { Tag as TagType } from '@/store/useMeetingStore';
import AppShell from '@/components/layout/AppShell';

interface AudioFile {
  id: string;
  name: string;
  duration: number;
  blob: Blob | File;
  type: 'recording' | 'upload';
}
import { mysqlClient } from '@/lib/mysql-client';
import { uploadFileResumable, UploadAbortedError } from '@/lib/resumableUpload';
import {
  clearUploadDraft,
  loadUploadDraft,
  markUploadLinked,
  saveCompletedUpload,
  saveUploadDraftFiles,
  saveUploadMeetingId,
  setUploadActive,
} from '@/lib/uploadDraftStore';
import { useToast } from '@/components/ui/use-toast';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const normalizeSearchText = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');

const splitSearchWords = (text: string) =>
  normalizeSearchText(text)
    .split(' ')
    .filter((word) => word.length > 0);

const wordsShareMatch = (queryWord: string, tagWord: string) => {
  if (queryWord === tagWord) return 100;
  if (tagWord.startsWith(queryWord) || queryWord.startsWith(tagWord)) return 75;
  if (tagWord.includes(queryWord) || queryWord.includes(tagWord)) return 55;
  return 0;
};

const getTagMatchScore = (query: string, tagName: string): number | null => {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedName = normalizeSearchText(tagName);

  if (!normalizedQuery) return null;

  if (normalizedName === normalizedQuery) return 1000;
  if (normalizedName.startsWith(normalizedQuery)) return 900 - normalizedName.length;
  if (normalizedName.includes(normalizedQuery)) return 750 - normalizedName.indexOf(normalizedQuery);

  const queryWords = splitSearchWords(normalizedQuery);
  const tagWords = splitSearchWords(normalizedName);

  if (queryWords.length === 0) return null;

  let matchedQueryWords = 0;
  let wordMatchScore = 0;

  for (const queryWord of queryWords) {
    const bestWordScore = tagWords.reduce((best, tagWord) => {
      return Math.max(best, wordsShareMatch(queryWord, tagWord));
    }, 0);

    if (bestWordScore > 0) {
      matchedQueryWords += 1;
      wordMatchScore += bestWordScore;
    }
  }

  if (matchedQueryWords > 0) {
    const coverage = matchedQueryWords / queryWords.length;
    return 400 + wordMatchScore + coverage * 120;
  }

  const queryChars = normalizedQuery.split('');
  let searchIndex = 0;
  let matchedChars = 0;

  for (const char of normalizedName) {
    if (char === queryChars[searchIndex]) {
      matchedChars += 1;
      searchIndex += 1;
      if (searchIndex === queryChars.length) break;
    }
  }

  if (matchedChars === queryChars.length) {
    return 200 + matchedChars * 10;
  }

  return null;
};

const TagSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tags, addTag, addMeeting, setTags, clearRecordDraft, recordDraft } = useMeetingStore();
  const { toast } = useToast();
  
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // State for individual file upload progress
  const [fileUploadProgress, setFileUploadProgress] = useState<Map<string, number>>(new Map());
  const [canResume, setCanResume] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const saveMeetingRef = useRef<() => Promise<void>>(async () => {});
  
  // State for audio playback
  const [playingFileId, setPlayingFileId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());
  
  // Calculate total progress whenever individual progress changes
  useEffect(() => {
    if (fileUploadProgress.size > 0) {
      const individualProgresses = Array.from(fileUploadProgress.values());
      const averageProgress = individualProgresses.reduce((sum, progress) => sum + progress, 0) / individualProgresses.length;
      setUploadProgress(Math.round(averageProgress));
    }
  }, [fileUploadProgress]);

  const routeDraft = location.state as { audioFiles?: AudioFile[]; commentText?: string } | null;
  const [audioFiles, setAudioFiles] = useState<AudioFile[] | null>(
    routeDraft?.audioFiles ?? recordDraft?.audioFiles ?? null,
  );
  const [commentText, setCommentText] = useState(
    routeDraft?.commentText ?? recordDraft?.commentText ?? '',
  );
  const audioFilesRef = useRef(audioFiles);
  audioFilesRef.current = audioFiles;
  const [pendingTagIds, setPendingTagIds] = useState<string[]>([]);
  const autoResumeStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draft = await loadUploadDraft();
        if (cancelled) return;
        const inMemory = audioFilesRef.current;
        const restoredFromDisk = (!inMemory || inMemory.length === 0) && Boolean(draft?.files?.length);
        if (restoredFromDisk && draft) {
          const restored: AudioFile[] = draft.files.map((file) => ({
            id: file.id,
            name: file.name,
            duration: file.duration,
            blob: file.blob,
            type: file.type,
          }));
          setAudioFiles(restored);
          audioFilesRef.current = restored;
          setCommentText(draft.commentText || '');
          if (draft.selectedTagIds?.length) setPendingTagIds(draft.selectedTagIds);
          if (draft.uploading || Object.keys(draft.completed || {}).length > 0) setCanResume(true);
          if (draft.uploading && !autoResumeStarted.current) {
            autoResumeStarted.current = true;
            void saveMeetingRef.current();
          }
        } else if (inMemory?.length) {
          await saveUploadDraftFiles(
            inMemory.map((file) => ({
              id: file.id,
              name: file.name,
              duration: file.duration,
              type: file.type,
              blob: file.blob,
            })),
            commentText,
            [],
          );
          await setUploadActive(false);
        }
      } catch (error) {
        console.error('Failed to restore upload draft', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!pendingTagIds.length || tags.length === 0) return;
    const matched = tags.filter((tag) => pendingTagIds.includes(tag.id));
    if (matched.length > 0) {
      setSelectedTags(matched);
    }
  }, [pendingTagIds, tags]);

  // Fetch user's tags from database on component mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const { data: { session } } = await mysqlClient.auth.getSession();
        
        if (!session) {
          toast({
            title: "وارد نشده‌اید",
            description: "لطفاً برای مشاهده برچسب‌های خود وارد شوید",
            variant: "destructive",
          });
          navigate('/login');
          return;
        }

        const { data, error } = await mysqlClient
          .from('tags')
          .select('*')
          .order('created_at', { ascending: false });


        if (error) {
          console.error('TagSelection - Tags fetch error:', error);
          
          // Check if it's an authentication error
          if (error.message?.includes('Access token required') || error.message?.includes('Unauthorized')) {
            navigate('/login');
            return;
          }
          
          toast({
            title: "خطا در بارگذاری برچسب‌ها",
            description: error.message || "بارگزاری برچسب ها نا موفق بود",
            variant: "destructive",
          });
          return;
        }

        // Set fetched tags directly (they already have IDs)
        if (data && data.length > 0) {
          const formattedTags = data.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            userId: tag.user_id
          }));
          setTags(formattedTags);
        } else {
          setTags([]); // Explicitly set empty array - this is normal!
        }
      } catch (error) {
        console.error('TagSelection - Error fetching tags:', error);
        
        // Check if it's a network error or authentication issue
        if (error instanceof TypeError && error.message.includes('fetch')) {
          toast({
            title: "خطا در اتصال",
            description: "خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.",
            variant: "destructive",
          });
        } else if (error.message?.includes('Access token required') || error.message?.includes('Unauthorized')) {
          navigate('/login');
        } else {
          toast({
            title: "خطای غیرمنتظره",
            description: "بارگذاری برچسب‌ها ناموفق بود",
            variant: "destructive",
          });
        }
      }
    };

    fetchTags();
  }, [setTags, toast, navigate]);

  const closestTags = useMemo(() => {
    const query = tagSearchQuery.trim();
    if (!query) return [];

    return tags
      .filter((tag) => !selectedTags.some((selected) => selected.id === tag.id))
      .map((tag) => {
        const score = getTagMatchScore(query, tag.name);
        return score === null ? null : { tag, score };
      })
      .filter((item): item is { tag: TagType; score: number } => item !== null)
      .sort((a, b) => b.score - a.score || a.tag.name.localeCompare(b.tag.name, 'fa'))
      .slice(0, 3)
      .map((item) => item.tag);
  }, [tagSearchQuery, tags, selectedTags]);

  const hasExactTagMatch = useMemo(() => {
    const query = normalizeSearchText(tagSearchQuery);
    if (!query) return false;

    return tags.some((tag) => normalizeSearchText(tag.name) === query);
  }, [tagSearchQuery, tags]);

  const canCreateNewTag = tagSearchQuery.trim().length > 0 && !hasExactTagMatch;

  const tagColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
  ];

  const handleSelectSuggestedTag = (tag: TagType) => {
    setSelectedTags((prev) => {
      if (prev.some((item) => item.id === tag.id)) {
        return prev;
      }
      return [...prev, tag];
    });
    setTagSearchQuery('');
  };

  const handleRemoveSelectedTag = (tagId: string) => {
    setSelectedTags((prev) => prev.filter((tag) => tag.id !== tagId));
  };

  const handleCreateTag = async () => {
    const tagName = tagSearchQuery.trim();
    if (!tagName || hasExactTagMatch) return;

    try {
      const { data: { session } } = await mysqlClient.auth.getSession();

      if (!session) {
        toast({
          title: "احراز هویت الزامی است",
          description: "لطفاً برای ایجاد برچسب وارد شوید",
          variant: "destructive",
        });
        return;
      }

      const newTagColor = tagColors[Math.floor(Math.random() * tagColors.length)];

      const { data, error } = await mysqlClient
        .from('tags')
        .insert({
          name: tagName,
          color: newTagColor,
          user_id: session.user.id
        });

      if (error) {
        toast({
          title: "خطا در ایجاد برچسب",
          description: error.message || "ایجاد برچسب ناموفق بود",
          variant: "destructive",
        });
        return;
      }

      const fullNewTag = {
        id: data.id,
        name: data.name,
        color: data.color,
        userId: data.user_id
      };

      addTag(fullNewTag);
      setTagSearchQuery('');
      setSelectedTags((prev) => [...prev, fullNewTag]);

      toast({
        title: "برچسب ایجاد شد",
        description: `"${fullNewTag.name}" با موفقیت ایجاد شد`,
      });
    } catch (error) {
      toast({
        title: "خطا",
        description: "ایجاد برچسب ناموفق بود",
        variant: "destructive",
      });
    }
  };

  const handleSaveMeeting = async () => {
    const files = audioFilesRef.current;
    if (!files || files.length === 0) {
      toast({
        title: "خطا",
        description: "هیچ فایل صوتی یافت نشد",
        variant: "destructive",
      });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setIsUploading(true);
    setCanResume(true);

    try {
      const storedBefore = await loadUploadDraft();
      const tagIds = selectedTags.length
        ? selectedTags.map((tag) => tag.id)
        : (storedBefore?.selectedTagIds || []);
      await saveUploadDraftFiles(
        files.map((file) => ({
          id: file.id,
          name: file.name,
          duration: file.duration,
          type: file.type,
          blob: file.blob,
        })),
        commentText || storedBefore?.commentText || '',
        tagIds,
      );
      await setUploadActive(true);

      const { data: { session } } = await mysqlClient.auth.getSession();
      const user = session?.user;
      const token = session?.access_token || session?.token;

      if (!user || !token) {
        await setUploadActive(false);
        toast({
          title: "احراز هویت الزامی است",
          description: "لطفاً برای ذخیره جلسات وارد شوید",
          variant: "destructive",
        });
        return;
      }

      const firstFile = files[0];
      const meetingTitle = firstFile.name.replace(/\.(wav|mp3|m4a|ogg|webm|aac|flac)$/i, '') || 'جلسه';
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
        const file = files[i];
        const existing = stored?.completed?.[file.id];
        if (existing?.filePath) {
          setFileUploadProgress((prev) => new Map(prev).set(file.id, 100));
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
          continue;
        }

        setFileUploadProgress((prev) => new Map(prev).set(file.id, prev.get(file.id) || 0));
        const safeName = file.name.replace(/[^\w.\-()\u0600-\u06FF ]+/g, '_') || 'audio.m4a';
        const result = await uploadFileResumable({
          apiBaseUrl: API_BASE_URL,
          token,
          uploadId: file.id,
          file: file.blob,
          fileName: safeName,
          mimeType: file.blob.type || 'audio/mp4',
          signal: controller.signal,
          onProgress: (loaded, total) => {
            const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
            setFileUploadProgress((prev) => new Map(prev).set(file.id, percent));
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
        setFileUploadProgress((prev) => new Map(prev).set(file.id, 100));
      }

      let meetingId = stored?.meetingId || null;
      if (!meetingId) {
        const { data: meetingData, error: meetingError } = await mysqlClient
          .from('meetings')
          .insert({
            meeting_date: new Date().toISOString(),
            user_id: user.id,
            summary: '',
            title: meetingTitle,
            status: 'آماده پردازش',
            CommentText: commentText || null
          });

        if (meetingError) {
          throw new Error(meetingError.message);
        }
        meetingId = meetingData.id || meetingData[0]?.id;
        if (!meetingId) throw new Error('شناسه جلسه از سرور برنگشت');
        await saveUploadMeetingId(meetingId);
      }

      for (const uploadedFile of uploadedFiles) {
        if (uploadedFile.linked) continue;
        const { error: audioFileError } = await mysqlClient
          .from('audio_files')
          .insert({
            meeting_id: meetingId,
            file_name: uploadedFile.fileName,
            file_path: uploadedFile.filePath,
            file_size: uploadedFile.fileSize,
            duration: uploadedFile.duration,
            format: uploadedFile.format,
            upload_order: uploadedFile.uploadOrder
          });

        if (audioFileError) {
          throw new Error(audioFileError.message || 'ثبت فایل صوتی ناموفق بود');
        }
        await markUploadLinked(uploadedFile.id);
      }

      // Create meeting-tag relationships
      if (tagIds.length > 0) {
        // Create relationships one by one since backend expects single relationship per request
        for (const tagId of tagIds) {
          const { error: tagsError } = await mysqlClient
            .from('meeting_tags')
            .insert({
              meeting_id: meetingId,
              tag_id: tagId
            });

          if (tagsError && !String(tagsError.message || '').toLowerCase().includes('already exists')) {
            toast({
              title: "خطا در پیوند برچسب‌ها",
              description: tagsError.message,
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Auto-trigger summary generation via backend (sends meetingId in webhook header)
      try {
        const createdMeetingId = meetingId;

        const analyzeResponse = await fetch(
          `${API_BASE_URL}/meetings/${createdMeetingId}/analyze`,
          {
            method: 'POST',
            headers: {
              ...mysqlClient.getAuthHeaders(),
              'Content-Type': 'application/json',
            },
          }
        );

        if (!analyzeResponse.ok) {
          const errorData = await analyzeResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to trigger analysis');
        }

        toast({
          title: "تولید خلاصه آغاز شد",
          description: "تولید خلاصه خودکار شروع شد. زمانی که آماده شد به شما ایمیل شماارسال خواهد شد.",
        });
      } catch (error) {
        console.error('=== SUMMARY GENERATION EXCEPTION ===');
        console.error('Exception type:', error?.constructor?.name);
        console.error('Exception message:', error?.message);
        console.error('Full exception:', error);
        
        toast({
          title: "خطای تولید خلاصه", 
          description: `خطای غیرمنتظره در حین تولید خلاصه: ${error?.message || 'خطای نامشخص'}. می‌توانید آن را از صفحه جلسه به صورت دستی شروع کنید.`,
          variant: "destructive",
        });
      }

      toast({
        title: "جلسه ذخیره شد",
        description: "خلاصه جلسه پس از پردازش به ایمیل شما ارسال خواهد شد.",
      });

      await clearUploadDraft();
      clearRecordDraft();
      setCanResume(false);
      navigate('/home');
    } catch (error) {
      if (error instanceof UploadAbortedError || (error as Error)?.name === 'AbortError') {
        return;
      }
      setCanResume(true);
      toast({
        title: "خطا",
        description: "بارگذاری قطع شد. با زدن ادامه آپلود، از همان نقطه ادامه پیدا می‌کند.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      abortRef.current = null;
    }
  };
  saveMeetingRef.current = handleSaveMeeting;

  const handleCancelUpload = () => {
    abortRef.current?.abort();
    void setUploadActive(false);
    setIsUploading(false);
    setCanResume(true);
    toast({
      title: "بارگذاری متوقف شد",
      description: "بخش ارسال‌شده ذخیره شده است و می‌توانید بعداً ادامه دهید.",
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async (file: AudioFile) => {
    try {
      // Stop any currently playing audio
      if (playingFileId && playingFileId !== file.id) {
        const currentAudio = audioElements.get(playingFileId);
        if (currentAudio) {
          currentAudio.pause();
        }
      }

      let audioElement = audioElements.get(file.id);
      
      if (!audioElement) {
        // Create audio element for this file
        audioElement = new Audio();
        const audioUrl = URL.createObjectURL(file.blob);
        audioElement.src = audioUrl;
        audioElement.preload = 'metadata';
        
        // Store the audio element
        setAudioElements(prev => new Map(prev).set(file.id, audioElement!));
        
        // Clean up URL when audio ends
        audioElement.addEventListener('ended', () => {
          setPlayingFileId(null);
        });
      }

      if (playingFileId === file.id) {
        // Currently playing this file - pause it
        audioElement.pause();
        setPlayingFileId(null);
      } else {
        // Play this file
        await audioElement.play();
        setPlayingFileId(file.id);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      toast({
        title: "خطا در پخش فایل صوتی",
        description: "امکان پخش این فایل صوتی وجود ندارد.",
        variant: "destructive",
      });
    }
  };

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      audioElements.forEach((audioElement) => {
        audioElement.pause();
        URL.revokeObjectURL(audioElement.src);
      });
    };
  }, [audioElements]);

  const handleBackToRecord = () => {
    navigate('/record', {
      state: {
        audioFiles,
        commentText,
      },
    });
  };

  return (
    <AppShell
      title="انتخاب برچسب"
      subtitle="برچسب‌هایی برای جلسه انتخاب یا ایجاد کنید"
      onBack={handleBackToRecord}
      clickableBack
      hideNav
      actions={<Badge variant="secondary" className="shrink-0">{selectedTags.length} انتخاب شده</Badge>}
    >
      <div className="mx-auto max-w-2xl space-y-6 pb-28">
        {/* Audio Files List */}
        {audioFiles && audioFiles.length > 0 && !isUploading && (
          <Card className="border border-border/50 bg-card/70 shadow-soft">
            <CardContent className="p-4">
              <h3 className="mb-3 font-semibold text-foreground">
                فایل‌های صوتی ({audioFiles.length})
              </h3>
              <div className="space-y-2">
                {audioFiles.map((file) => (
                  <div key={file.id} className="flex items-center gap-2 rounded-lg bg-background/60 p-2.5">
                    <div className="shrink-0 cursor-grab text-muted-foreground">
                      <GripVertical className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={file.type === 'recording' ? 'default' : 'secondary'} className="shrink-0">
                          {file.type === 'recording' ? 'ضبط' : 'آپلود'}
                        </Badge>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        مدت زمان: {formatTime(file.duration)} • {(file.blob.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePlayPause(file)}
                      className="h-8 w-8 shrink-0 p-0"
                    >
                      {playingFileId === file.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audio Files Upload Progress */}
        {isUploading && audioFiles && audioFiles.length > 0 && (
          <Card className="border border-border/50 bg-card/70 shadow-soft">
            <CardContent className="p-4">
              <h3 className="mb-3 font-semibold text-foreground">
                بارگذاری فایل‌های صوتی ({audioFiles.length})
              </h3>
              <div className="space-y-4">
                {audioFiles.map((file) => {
                  const progress = fileUploadProgress.get(file.id) || 0;
                  return (
                    <div key={file.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <Badge variant={file.type === 'recording' ? 'default' : 'secondary'} className="shrink-0">
                            {file.type === 'recording' ? 'ضبط' : 'آپلود'}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">{file.name}</span>
                        </div>
                        <span className="shrink-0 text-sm text-muted-foreground">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tags section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-foreground">برچسب‌ها</h2>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateTag}
              disabled={!canCreateNewTag}
              className="shrink-0"
            >
              <Plus className="h-4 w-4" />
              برچسب جدید
            </Button>
          </div>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    borderColor: tag.color,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleRemoveSelectedTag(tag.id)}
                    className="hover:opacity-70"
                    aria-label={`حذف برچسب ${tag.name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="tag-search">جستجوی برچسب</Label>
            <Input
              id="tag-search"
              value={tagSearchQuery}
              onChange={(e) => setTagSearchQuery(e.target.value)}
              placeholder="نام برچسب را تایپ کنید..."
            />
          </div>

          {tagSearchQuery.trim() && closestTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">نزدیک‌ترین برچسب‌ها:</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {closestTags.map((tag) => (
                  <Card
                    key={tag.id}
                    className="cursor-pointer border-2 border-transparent bg-card/70 transition-all duration-200 hover:border-primary/40 hover:shadow-medium"
                    onClick={() => handleSelectSuggestedTag(tag)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 shrink-0 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        <h4 className="min-w-0 truncate font-medium text-foreground">{tag.name}</h4>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {tagSearchQuery.trim() && closestTags.length === 0 && tags.length > 0 && !hasExactTagMatch && (
            <p className="text-sm text-muted-foreground">
              برچسبی با این نام پیدا نشد. می‌توانید از دکمه «برچسب جدید» استفاده کنید.
            </p>
          )}
        </div>

        {tags.length === 0 && (
          <div className="py-8 text-center">
            <Tag className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
            <h3 className="mb-1 text-base font-semibold text-foreground">هنوز برچسبی نیست</h3>
            <p className="text-sm text-muted-foreground">
              نام برچسب را در کادر بالا تایپ کنید و روی «برچسب جدید» بزنید.
            </p>
          </div>
        )}
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-lg pb-safe">
        <div className="mx-auto w-full max-w-2xl px-4 py-3">
          {isUploading ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm font-medium text-card-foreground">
                <span>در حال بارگذاری جلسه...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <X className="h-4 w-4" />
                    لغو بارگذاری
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>لغو بارگذاری؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      بارگذاری متوقف می‌شود. بخش ارسال‌شده روی سرور می‌ماند و بعداً می‌توانید از همان نقطه ادامه دهید.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>ادامه بارگذاری</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelUpload}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      بله، لغو بارگذاری
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ) : (
            <Button onClick={handleSaveMeeting} variant="primary" size="lg" className="w-full">
              {canResume ? 'ادامه آپلود' : 'آپلود جلسه'}
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default TagSelection;
