import { useState, useEffect, useRef } from 'react';
import type { DragEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Save, X, Trash2, Edit, ChevronDown, Download, Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mysqlClient } from '@/lib/mysql-client';
import { uploadFileResumable, UploadAbortedError } from '@/lib/resumableUpload';
import AppShell from '@/components/layout/AppShell';

const DEFAULT_PROCESSING_REQUEST =
  'فایل/ فایل های صوتی پیوست در خصوص یک جلسه است . خلاصه جلسه و نکات مهم و شرکت کنندگان را استخراج کن';

const AUDIO_EXTENSIONS = [
  '.mp3', '.wav', '.aac', '.m4a', '.ogg', '.opus', '.webm',
  '.3gp', '.3gpp', '.amr', '.flac', '.caf', '.aiff', '.aif',
];

const isAudioFile = (file: File) => {
  const name = file.name.toLowerCase();
  return file.type.startsWith('audio/') || AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext));
};

const readAudioDuration = (file: File) =>
  new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    let settled = false;
    const finish = (value: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
    };
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish(0);
    setTimeout(() => finish(0), 10000);
    audio.src = url;
  });

interface PendingUpload {
  key: string;
  name: string;
  progress: number;
}

const getAudioUrl = async (fileName: string, userId: string) => {
  try {
    const { data: { session } } = await mysqlClient.auth.getSession();
    if (!session) return null;

    const token = session.access_token || session.token;
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    return `${API_BASE_URL}/audio/${userId}/${fileName}?token=${token}`;
  } catch (error) {
    console.error('Error getting audio URL:', error);
    return null;
  }
};

const MeetingDetailsOptions = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [meeting, setMeeting] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const [isEditingCommentText, setIsEditingCommentText] = useState(false);
  const [isAudioSectionExpanded, setIsAudioSectionExpanded] = useState(false);
  const [isCommentSectionExpanded, setIsCommentSectionExpanded] = useState(false);
  const [isDeleting] = useState(false);

  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const [audioFileToDelete, setAudioFileToDelete] = useState<any>(null);
  const [isDeletingAudio, setIsDeletingAudio] = useState(false);

  useEffect(() => () => uploadAbortRef.current?.abort(), []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleNextAudio = () => {
    if (meeting?.audioFiles && currentAudioIndex < meeting.audioFiles.length - 1) {
      setCurrentAudioIndex(currentAudioIndex + 1);
      setCurrentTime(0);
    }
  };

  const { data: meetingData, isLoading: meetingLoading } = useQuery({
    queryKey: ['meeting-options', meetingId],
    queryFn: async () => {
      if (!meetingId) return null;

      const { data: { user } } = await mysqlClient.auth.getUser();
      if (!user) return null;

      const { data: meetingData, error: meetingError } = await mysqlClient
        .from('meetings')
        .select(`
          *,
          audio_files (
            id,
            file_name,
            file_path,
            file_size,
            duration,
            format,
            upload_order,
            created_at,
            updated_at
          )
        `)
        .eq('id', meetingId)
        .eq('user_id', user.id)
        .single();

      if (meetingError || !meetingData) return null;

      const { data: { session } } = await mysqlClient.auth.getSession();
      const token = session?.access_token || session?.token;
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

      let audioFiles: any[] = [];

      if (token) {
        try {
          const audioFilesResponse = await fetch(`${API_BASE_URL}/meetings/${meetingId}/audio-files`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          const audioFilesData = await audioFilesResponse.json();

          if (audioFilesResponse.ok && Array.isArray(audioFilesData.data)) {
            audioFiles = audioFilesData.data;
          } else {
            audioFiles = Array.isArray(meetingData.audio_files) ? meetingData.audio_files : [];
          }
        } catch {
          audioFiles = Array.isArray(meetingData.audio_files) ? meetingData.audio_files : [];
        }
      } else {
        audioFiles = Array.isArray(meetingData.audio_files) ? meetingData.audio_files : [];
      }

      const processedAudioFiles = await Promise.all(
        audioFiles.map(async (file: any) => ({
          id: file.id,
          fileName: file.file_name,
          filePath: file.file_path,
          fileSize: file.file_size,
          duration: file.duration,
          format: file.format,
          uploadOrder: file.upload_order,
          audioUrl: await getAudioUrl(file.file_name, user.id),
        }))
      );

      return {
        id: meetingData.id,
        title: meetingData.title || `Meeting ${new Date(meetingData.meeting_date).toLocaleDateString()}`,
        commentText: meetingData.CommentText || null,
        audioFiles: processedAudioFiles,
      };
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!meetingId,
  });

  useEffect(() => {
    if (meetingData) {
      setMeeting(meetingData);
      setCommentText(meetingData.commentText || '');
    }
  }, [meetingData]);

  const handleSaveCommentText = async () => {
    if (!meeting) return;

    try {
      const { error } = await mysqlClient
        .from('meetings')
        .update({ CommentText: commentText } as any)
        .eq('id', meeting.id);

      if (error) throw error;

      setMeeting((prev: any) => ({ ...prev, commentText }));
      setIsEditingCommentText(false);
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-options', meetingId] });

      toast({
        title: 'توضیح درخواست پردازش ذخیره شد',
        description: 'توضیح درخواست پردازش با موفقیت به‌روزرسانی شد.',
      });
    } catch (error) {
      console.error('Error saving comment text:', error);
      toast({
        title: 'خطا',
        description: 'ذخیره توضیح درخواست پردازش ناموفق بود. لطفاً دوباره تلاش کنید.',
        variant: 'destructive',
      });
    }
  };

  const handleUploadFiles = async (fileList: FileList | File[] | null) => {
    if (!meeting || isUploading) return;
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    const accepted = files.filter(isAudioFile);
    if (accepted.length < files.length) {
      toast({
        title: 'فایل نامعتبر',
        description: 'فقط فایل‌های صوتی پذیرفته می‌شوند.',
        variant: 'destructive',
      });
    }
    if (accepted.length === 0) return;

    const { data: { session } } = await mysqlClient.auth.getSession();
    const token = session?.access_token || session?.token;
    if (!token) {
      toast({
        title: 'احراز هویت الزامی است',
        description: 'لطفاً دوباره وارد شوید.',
        variant: 'destructive',
      });
      return;
    }

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
    const controller = new AbortController();
    uploadAbortRef.current = controller;

    const items: PendingUpload[] = accepted.map((file, i) => ({
      key: `upload-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 10)}`,
      name: file.name,
      progress: 0,
    }));
    const setProgress = (key: string, progress: number) =>
      setPendingUploads((prev) => prev.map((item) => (item.key === key ? { ...item, progress } : item)));

    setIsAudioSectionExpanded(true);
    setIsUploading(true);
    setPendingUploads(items);

    let nextOrder =
      Math.max(0, ...(meeting.audioFiles || []).map((f: any) => Number(f.uploadOrder) || 0)) + 1;
    let uploadedCount = 0;

    try {
      for (let i = 0; i < accepted.length; i++) {
        const file = accepted[i];
        const item = items[i];
        const safeName = file.name.replace(/[^\w.\-()\u0600-\u06FF ]+/g, '_') || 'audio.m4a';

        const [fileDuration, result] = await Promise.all([
          readAudioDuration(file),
          uploadFileResumable({
            apiBaseUrl: API_BASE_URL,
            token,
            uploadId: item.key,
            file,
            fileName: safeName,
            mimeType: file.type || 'audio/mp4',
            signal: controller.signal,
            onProgress: (loaded, total) =>
              setProgress(item.key, total > 0 ? Math.round((loaded / total) * 100) : 0),
          }),
        ]);

        const { error } = await mysqlClient.from('audio_files').insert({
          meeting_id: meeting.id,
          file_name: safeName,
          file_path: result.relativePath,
          file_size: result.size,
          duration: fileDuration,
          format: result.format,
          upload_order: nextOrder,
        });
        if (error) throw new Error(error.message || 'ثبت فایل صوتی ناموفق بود');

        uploadedCount += 1;
        nextOrder += 1;
        setProgress(item.key, 100);
      }

      toast({
        title: 'فایل صوتی اضافه شد',
        description: 'برای به‌روزرسانی خلاصه، از صفحه جلسه درخواست پردازش مجدد دهید.',
      });
    } catch (error) {
      if (!(error instanceof UploadAbortedError)) {
        console.error('Error uploading audio file:', error);
        toast({
          title: 'خطا در آپلود',
          description: (error as Error).message || 'آپلود فایل صوتی ناموفق بود.',
          variant: 'destructive',
        });
      }
    } finally {
      if (uploadAbortRef.current === controller) uploadAbortRef.current = null;
      setIsUploading(false);
      setPendingUploads([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (uploadedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['meeting-options', meetingId] });
        queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      }
    }
  };

  const handleDeleteAudioFile = async () => {
    if (!audioFileToDelete) return;
    const deletedId = audioFileToDelete.id;
    setIsDeletingAudio(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/audio-files/${deletedId}`, {
        method: 'DELETE',
        headers: mysqlClient.getAuthHeaders(),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || 'حذف فایل صوتی ناموفق بود');

      setMeeting((prev: any) => ({
        ...prev,
        audioFiles: (prev?.audioFiles || []).filter((f: any) => f.id !== deletedId),
      }));
      setCurrentAudioIndex(0);
      setCurrentTime(0);
      setAudioFileToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['meeting-options', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });

      toast({
        title: 'فایل صوتی حذف شد',
        description: 'فایل برای همیشه از سرور حذف شد. برای به‌روزرسانی خلاصه، درخواست پردازش مجدد دهید.',
      });
    } catch (error) {
      console.error('Error deleting audio file:', error);
      toast({
        title: 'خطا',
        description: (error as Error).message || 'حذف فایل صوتی ناموفق بود.',
        variant: 'destructive',
      });
    } finally {
      setIsDeletingAudio(false);
    }
  };

  const hasDraggedFiles = (e: DragEvent) => Array.from(e.dataTransfer.types).includes('Files');

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = isUploading ? 'none' : 'copy';
    if (!isDraggingFile) {
      setIsDraggingFile(true);
      setIsAudioSectionExpanded(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDraggingFile(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(e)) return;
    e.preventDefault();
    setIsDraggingFile(false);
    handleUploadFiles(e.dataTransfer.files);
  };

  if (meetingLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <p className="text-muted-foreground">جلسه یافت نشد.</p>
          <Button onClick={() => navigate('/home')} variant="outline">
            بازگشت به خانه
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AppShell title="گزینه‌های جلسه" subtitle={meeting.title} onBack={`/meeting/${meetingId}`} hideNav>
      <div className="space-y-5">

        <Card
          className={`bg-card transition-colors ${
            isDraggingFile ? 'border-primary ring-2 ring-primary/30' : 'border-border'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setIsAudioSectionExpanded((prev) => !prev)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">
                {meeting.audioFiles?.length > 0
                  ? `ضبط صوتی (${meeting.audioFiles.length} فایل)`
                  : 'ضبط صوتی'}
              </CardTitle>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                  isAudioSectionExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </CardHeader>
          {isAudioSectionExpanded && (
            <CardContent className="space-y-4">
              {meeting.audioFiles?.length > 0 ? (
                <div className="space-y-2">
                  {meeting.audioFiles.map((audioFile: any, index: number) => (
                    <div
                      key={audioFile.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        index === currentAudioIndex
                          ? 'bg-primary/10 border-primary'
                          : 'bg-muted/50 border-border hover:bg-muted/70'
                      }`}
                      onClick={() => setCurrentAudioIndex(index)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            فایل {index + 1}: {audioFile.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {audioFile.duration ? formatTime(audioFile.duration) : 'نامشخص'} •{' '}
                            {audioFile.format || 'صوتی'}
                          </p>
                        </div>
                        {audioFile.audioUrl && (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <a
                              href={`${audioFile.audioUrl}&download=1`}
                              download={audioFile.fileName}
                              aria-label={`دانلود ${audioFile.fileName}`}
                              title="دانلود"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={isUploading || isDeletingAudio}
                          aria-label={`حذف ${audioFile.fileName}`}
                          title="حذف"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAudioFileToDelete(audioFile);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">هیچ فایل صوتی برای این جلسه یافت نشد.</p>
                </div>
              )}

              {meeting.audioFiles?.[currentAudioIndex] && (
                <div className="space-y-3">
                  <audio
                    ref={(audio) => {
                      if (audio) {
                        audio.addEventListener('timeupdate', () => {
                          setCurrentTime(audio.currentTime);
                        });
                        audio.addEventListener('loadedmetadata', () => {
                          setDuration(audio.duration);
                        });
                        audio.addEventListener('ended', () => {
                          if (currentAudioIndex < meeting.audioFiles.length - 1) {
                            handleNextAudio();
                          }
                        });
                      }
                    }}
                    controls
                    src={meeting.audioFiles[currentAudioIndex].audioUrl}
                    className="w-full"
                  >
                    Your browser does not support the audio element.
                  </audio>

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={`audio/*,${AUDIO_EXTENSIONS.join(',')}`}
                multiple
                className="hidden"
                onChange={(e) => handleUploadFiles(e.target.files)}
              />
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full rounded-lg border-2 border-dashed p-6 text-center transition-colors disabled:cursor-not-allowed ${
                  isDraggingFile
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/60 hover:bg-muted/50'
                }`}
              >
                {isUploading ? (
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                ) : (
                  <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                )}
                <p className="text-sm font-medium text-card-foreground">
                  {isUploading
                    ? 'در حال آپلود...'
                    : isDraggingFile
                      ? 'فایل را اینجا رها کنید'
                      : 'فایل صوتی را اینجا بکشید و رها کنید یا برای انتخاب کلیک کنید'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  MP3، WAV، M4A، OGG، WEBM، FLAC و سایر فرمت‌های صوتی
                </p>
              </button>

              {pendingUploads.length > 0 && (
                <div className="space-y-2">
                  {pendingUploads.map((item) => (
                    <div key={item.key} className="space-y-1">
                      <div className="flex justify-between gap-3 text-xs text-muted-foreground">
                        <span className="truncate">{item.name}</span>
                        <span className="shrink-0">{item.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <Card className="bg-card border-border">
          <CardHeader
            className="cursor-pointer select-none"
            onClick={() => setIsCommentSectionExpanded((prev) => !prev)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">توضیح درخواست پردازش</CardTitle>
              <ChevronDown
                className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                  isCommentSectionExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </CardHeader>
          {isCommentSectionExpanded && (
            <CardContent>
              <div className="flex justify-end mb-3">
                {isEditingCommentText ? (
                  <div className="flex gap-3">
                    <Button onClick={handleSaveCommentText} size="sm">
                      <Save className="h-4 w-4" />
                      ذخیره
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditingCommentText(false);
                        setCommentText(meeting?.commentText || '');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4" />
                      لغو
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      const dbValue = meeting?.commentText || commentText || '';
                      const editValue =
                        dbValue && dbValue.trim() !== '' ? dbValue : DEFAULT_PROCESSING_REQUEST;
                      setCommentText(editValue);
                      setIsEditingCommentText(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="h-4 w-4" />
                    ویرایش
                  </Button>
                )}
              </div>
              {isEditingCommentText ? (
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="توضیح درخواست پردازش را وارد کنید..."
                  className="min-h-[140px] resize-none"
                />
              ) : (
                <div className="text-right whitespace-pre-wrap text-foreground" dir="rtl">
                  {(() => {
                    const dbValue = meeting?.commentText || commentText;
                    return dbValue && dbValue.trim() !== '' ? dbValue : DEFAULT_PROCESSING_REQUEST;
                  })()}
                </div>
              )}
            </CardContent>
          )}
        </Card>

        <Card className="border-destructive/20 bg-card">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-base font-medium text-card-foreground">حذف جلسه</h3>
                <p className="text-sm text-muted-foreground">
                  این جلسه و ضبط صوتی آن را برای همیشه حذف کنید.
                </p>
              </div>
              <Button
                variant="destructive"
                disabled={isDeleting}
                className="w-full shrink-0 sm:w-auto"
                onClick={() =>
                  navigate(`/meeting/${meeting.id}/delete?title=${encodeURIComponent(meeting.title)}`)
                }
              >
                <Trash2 className="h-4 w-4" />
                حذف جلسه
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!audioFileToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingAudio) setAudioFileToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف فایل صوتی</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف «{audioFileToDelete?.fileName}» اطمینان دارید؟ این فایل برای همیشه از سرور حذف می‌شود و
              بازگشت‌پذیر نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAudio}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeletingAudio}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAudioFile();
              }}
            >
              {isDeletingAudio ? 'در حال حذف...' : 'حذف فایل'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default MeetingDetailsOptions;
