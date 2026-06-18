import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Save, Play, Pause, X, Trash2, Edit, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mysqlClient } from '@/lib/mysql-client';
import AppShell from '@/components/layout/AppShell';

const DEFAULT_PROCESSING_REQUEST =
  'فایل/ فایل های صوتی پیوست در خصوص یک جلسه است . خلاصه جلسه و نکات مهم و شرکت کنندگان را استخراج کن';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
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

        {meeting.audioFiles && meeting.audioFiles.length > 0 ? (
          <Card className="bg-card border-border">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setIsAudioSectionExpanded((prev) => !prev)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-card-foreground">
                  ضبط صوتی ({meeting.audioFiles.length} فایل)
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
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            فایل {index + 1}: {audioFile.fileName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {audioFile.duration ? formatTime(audioFile.duration) : 'نامشخص'} •{' '}
                            {audioFile.format || 'صوتی'}
                          </p>
                        </div>
                        {index === currentAudioIndex && (
                          <Badge variant="secondary" className="text-xs">
                            در حال پخش
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {meeting.audioFiles[currentAudioIndex] && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <Button
                        variant="default"
                        size="lg"
                        onClick={handlePlayPause}
                        className="rounded-full w-12 h-12"
                      >
                        {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                      </Button>
                    </div>

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
                            setIsPlaying(false);
                            if (currentAudioIndex < meeting.audioFiles.length - 1) {
                              handleNextAudio();
                            }
                          });
                          audio.addEventListener('play', () => setIsPlaying(true));
                          audio.addEventListener('pause', () => setIsPlaying(false));
                        }
                      }}
                      controls
                      src={meeting.audioFiles[currentAudioIndex].audioUrl}
                      className="w-full"
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    >
                      Your browser does not support the audio element.
                    </audio>

                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardHeader
              className="cursor-pointer select-none"
              onClick={() => setIsAudioSectionExpanded((prev) => !prev)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-card-foreground">ضبط صوتی</CardTitle>
                <ChevronDown
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                    isAudioSectionExpanded ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </CardHeader>
            {isAudioSectionExpanded && (
              <CardContent>
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">هیچ فایل صوتی برای این جلسه یافت نشد.</p>
                  <p className="text-sm text-muted-foreground">
                    ممکن است فایل‌های صوتی هنوز در حال پردازش باشند یا به سیستم جدید منتقل نشده باشند.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        )}

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
    </AppShell>
  );
};

export default MeetingDetailsOptions;
