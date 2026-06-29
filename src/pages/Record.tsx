import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMeetingStore } from '@/store/useMeetingStore';
import { Mic, Pause, Square, Play, Upload, Trash2, Check, GripVertical, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AppShell from '@/components/layout/AppShell';

interface AudioFile {
  id: string;
  name: string;
  duration: number;
  blob: Blob | File;
  type: 'recording' | 'upload';
}

const SUPPORTED_AUDIO_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.aac',
  '.m4a',
  '.ogg',
  '.opus',
  '.webm',
  '.3gp',
  '.3gpp',
  '.amr',
  '.flac',
  '.caf',
  '.aiff',
  '.aif',
] as const;

const SUPPORTED_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
  'audio/m4a',
  'audio/ogg',
  'audio/opus',
  'audio/webm',
  'audio/3gpp',
  'audio/3gpp2',
  'audio/amr',
  'audio/amr-wb',
  'audio/flac',
  'audio/x-caf',
  'audio/caf',
  'audio/aiff',
  'audio/x-aiff',
];

const SUPPORTED_FORMATS_LABEL = 'MP3، WAV، AAC، M4A، OGG، OPUS، FLAC، WebM، 3GP، AMR، CAF، AIFF';

const FILE_INPUT_ACCEPT = `audio/*,${SUPPORTED_AUDIO_EXTENSIONS.join(',')}`;

const getFileExtension = (fileName: string) => {
  if (!fileName.includes('.')) return '';
  return fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
};

const isSupportedAudioFile = (file: File) => {
  const extension = getFileExtension(file.name);

  if (extension && SUPPORTED_AUDIO_EXTENSIONS.includes(extension as typeof SUPPORTED_AUDIO_EXTENSIONS[number])) {
    return true;
  }

  if (file.type && SUPPORTED_AUDIO_MIME_TYPES.includes(file.type)) {
    return true;
  }

  return false;
};

const getUnsupportedFileError = (fileNames: string[]) => {
  const listedFiles = fileNames.slice(0, 3).map((name) => `«${name}»`).join('، ');
  const remainingCount = fileNames.length > 3 ? ` و ${fileNames.length - 3} فایل دیگر` : '';

  if (fileNames.length === 1) {
    return {
      title: 'این فایل صوتی نیست',
      description: `فایل ${listedFiles} قابل آپلود نیست. لطفاً فقط فایل صوتی انتخاب کنید. فرمت‌های مجاز: ${SUPPORTED_FORMATS_LABEL}`,
    };
  }

  return {
    title: 'برخی فایل‌ها صوتی نیستند',
    description: `${fileNames.length} فایل از انتخاب شما صوتی نیستند: ${listedFiles}${remainingCount}. لطفاً فقط فایل صوتی انتخاب کنید. فرمت‌های مجاز: ${SUPPORTED_FORMATS_LABEL}`,
  };
};

const Record = () => {
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

  const restoredAudioFiles = locationDraft?.audioFiles ?? recordDraft?.audioFiles ?? [];
  const restoredCommentText = locationDraft?.commentText ?? recordDraft?.commentText ?? '';

  // State for multiple audio files
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>(restoredAudioFiles);
  const [showFilesList, setShowFilesList] = useState(restoredAudioFiles.length > 0);

  // State for comment text
  const [commentText, setCommentText] = useState<string>(restoredCommentText);
  
  // State for audio playback
  const [playingFileId, setPlayingFileId] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<Map<string, HTMLAudioElement>>(new Map());
  
  // State for drag and drop
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout>();
  const mediaRecorderRef = useRef<MediaRecorder>();
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const draft = location.state as {
      audioFiles?: AudioFile[];
      commentText?: string;
    } | null;

    if (!draft) return;

    setAudioFiles(draft.audioFiles ?? []);
    setCommentText(draft.commentText ?? '');
    setShowFilesList((draft.audioFiles?.length ?? 0) > 0);
  }, [location.state]);

  useEffect(() => {
    if (audioFiles.length > 0 || commentText.trim()) {
      setRecordDraft({ audioFiles, commentText });
      return;
    }

    clearRecordDraft();
  }, [audioFiles, commentText, setRecordDraft, clearRecordDraft]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      intervalRef.current = setInterval(() => {
        setRecordingDuration(recordingDuration + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, isPaused, recordingDuration, setRecordingDuration]);

  // Cleanup audio elements on unmount
  useEffect(() => {
    return () => {
      audioElements.forEach((audioElement) => {
        audioElement.pause();
        URL.revokeObjectURL(audioElement.src);
      });
    };
  }, [audioElements]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording completion
      mediaRecorder.onstop = () => {
        const audioBlob = chunksRef.current.length > 0 
          ? new Blob(chunksRef.current, { type: 'audio/wav' }) 
          : null;
        
        if (audioBlob) {
          // Add recording to the list
          const newAudioFile: AudioFile = {
            id: `recording-${Date.now()}`,
            name: `ضبط ${new Date().toLocaleTimeString('fa-IR')}`,
            duration: recordingDuration,
            blob: audioBlob,
            type: 'recording'
          };
          
          setAudioFiles(prev => [...prev, newAudioFile]);
          setShowFilesList(true);
          
          toast({
            title: "ضبط تکمیل شد",
            description: "فایل صوتی به لیست اضافه شد.",
          });
        }
      };

      mediaRecorder.start();
      startRecording();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "خطا در دسترسی به میکروفون",
        description: "امکان دسترسی به میکروفون وجود ندارد. لطفاً مجوزها را بررسی کنید.",
        variant: "destructive",
      });
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
      }
      resumeRecording();
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
      }
      pauseRecording();
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    stopRecording();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const removeAudioFile = (id: string) => {
    setAudioFiles(prev => prev.filter(file => file.id !== id));
    if (audioFiles.length === 1) {
      setShowFilesList(false);
    }
    
    // Clean up audio element if it exists
    const audioElement = audioElements.get(id);
    if (audioElement) {
      audioElement.pause();
      URL.revokeObjectURL(audioElement.src);
      setAudioElements(prev => {
        const newMap = new Map(prev);
        newMap.delete(id);
        return newMap;
      });
    }
    
    // Stop playing if this file was playing
    if (playingFileId === id) {
      setPlayingFileId(null);
    }
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

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    setDraggedItemId(fileId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetFileId: string) => {
    e.preventDefault();
    
    if (!draggedItemId || draggedItemId === targetFileId) {
      setDraggedItemId(null);
      return;
    }

    setAudioFiles(prev => {
      const newFiles = [...prev];
      const draggedIndex = newFiles.findIndex(file => file.id === draggedItemId);
      const targetIndex = newFiles.findIndex(file => file.id === targetFileId);
      
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      
      // Remove the dragged item
      const [draggedItem] = newFiles.splice(draggedIndex, 1);
      
      // Insert it at the target position
      newFiles.splice(targetIndex, 0, draggedItem);
      
      return newFiles;
    });
    
    setDraggedItemId(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
  };

  const handleDone = () => {
    if (audioFiles.length === 0) {
      toast({
        title: "هیچ فایل صوتی",
        description: "لطفاً حداقل یک فایل صوتی اضافه کنید.",
        variant: "destructive",
      });
      return;
    }

    // Navigate to tag selection with all audio files and comment text
    setRecordDraft({ audioFiles, commentText });
    navigate('/tag-selection', {
      state: {
        audioFiles,
        commentText,
      },
    });
  };

  const handleBackToHome = () => {
    clearRecordDraft();
    navigate('/home');
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    
    if (!files || files.length === 0) return;
    
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    Array.from(files).forEach((file: File) => {
      if (isSupportedAudioFile(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });
    
    if (invalidFiles.length > 0) {
      const error = getUnsupportedFileError(invalidFiles);
      toast({
        title: error.title,
        description: error.description,
        variant: "destructive",
      });
    }
    
    // Process valid files
    if (validFiles.length > 0) {
      let processedCount = 0;
      const newAudioFiles: AudioFile[] = [];
      
      validFiles.forEach((file, index) => {
        // Get audio duration (approximate)
        const audio = new Audio();
        audio.src = URL.createObjectURL(file);
        
        audio.onloadedmetadata = () => {
          const duration = Math.floor(audio.duration);
          URL.revokeObjectURL(audio.src);
          
          // Add file to the list
          const newAudioFile: AudioFile = {
            id: `upload-${Date.now()}-${index}`,
            name: file.name,
            duration: duration,
            blob: file,
            type: 'upload'
          };
          
          newAudioFiles.push(newAudioFile);
          processedCount++;
          
          // When all files are processed, update state
          if (processedCount === validFiles.length) {
            setAudioFiles(prev => [...prev, ...newAudioFiles]);
            setShowFilesList(true);
            
            toast({
              title: "فایل‌ها اضافه شدند",
              description: `${validFiles.length} فایل صوتی به لیست اضافه شد.`,
            });
          }
        };
        
        audio.onerror = () => {
          URL.revokeObjectURL(audio.src);
          processedCount++;
          
          // Still count as processed even if failed
          if (processedCount === validFiles.length) {
            if (newAudioFiles.length > 0) {
              setAudioFiles(prev => [...prev, ...newAudioFiles]);
              setShowFilesList(true);
              
              toast({
                title: "برخی فایل‌ها اضافه شدند",
                description: `${newAudioFiles.length} از ${validFiles.length} فایل با موفقیت اضافه شد.`,
              });
            } else {
              toast({
                title: "خطا در بارگذاری فایل‌ها",
                description: "هیچ فایل صوتی قابل پخش نبود.",
                variant: "destructive",
              });
            }
          }
        };
      });
    }
    
    // Clear the input so the same files can be selected again
    event.target.value = '';
  };

  if (!isRecording) {
    return (
      <AppShell
        title="ضبط جلسه"
        subtitle="می‌توانید چند فایل صوتی اضافه کنید"
        onBack={handleBackToHome}
        hideNav
      >
        <div className={`mx-auto max-w-2xl ${audioFiles.length > 0 ? 'pb-24' : ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={FILE_INPUT_ACCEPT}
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Audio Files List */}
          {showFilesList && audioFiles.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 text-base font-semibold text-foreground">
                فایل‌های صوتی ({audioFiles.length})
              </h2>
              <div className="space-y-2">
                {audioFiles.map((file) => (
                  <Card
                    key={file.id}
                    className={`border border-border/50 bg-card/70 transition-all duration-200 ${
                      draggedItemId === file.id ? 'scale-95 opacity-50' : 'hover:shadow-soft'
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, file.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, file.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing">
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
                            مدت زمان: {formatTime(file.duration)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePlayPause(file)}
                            className="h-8 w-8 p-0"
                          >
                            {playingFileId === file.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAudioFile(file.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-4 flex justify-center">
                <Button
                  onClick={handleFileSelect}
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  aria-label="اضافه کردن فایل صوتی"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </div>
            </div>
          )}

          {/* Empty state add button */}
          {audioFiles.length === 0 && (
            <button
              type="button"
              onClick={handleFileSelect}
              className="mb-6 flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-card/40 px-6 py-10 text-primary transition-colors hover:bg-primary/5"
            >
              <Upload className="h-8 w-8" />
              <span className="text-base font-semibold">اضافه کردن فایل صوتی</span>
              <span className="text-xs text-muted-foreground">یا از دکمه ضبط استفاده کنید</span>
            </button>
          )}

          {/* Comment Text Input */}
          <div className="mb-6">
            <Label htmlFor="comment-text" className="mb-2 block text-base font-semibold text-foreground">
              توضیحات خاص
            </Label>
            <Textarea
              id="comment-text"
              placeholder="برای نتیجه بهتر از هوش مصنوعی، می‌توانید عنوان جلسه، نام شرکت‌کنندگان و تاریخ جلسه را وارد کنید..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="min-h-[100px] w-full resize-none"
            />
          </div>
        </div>

        {/* Sticky bottom action bar */}
        {audioFiles.length > 0 && (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-lg pb-safe">
            <div className="mx-auto w-full max-w-2xl px-4 py-3">
              <Button onClick={handleDone} variant="primary" size="lg" className="w-full">
                <Check className="h-5 w-5" />
                تمام ({audioFiles.length} فایل)
              </Button>
            </div>
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 via-background to-red-100 px-6 safe-top pb-safe">
      <div className="space-y-8 p-4 text-center">
        {/* Recording Indicator */}
        <div className="relative mx-auto h-40 w-40">
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-red-500/20">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500">
              <Mic className="h-12 w-12 text-white" />
            </div>
          </div>
          <div className="absolute inset-0 mx-auto h-40 w-40 animate-pulse rounded-full bg-red-500/30" />
        </div>

        {/* Recording Status */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            {isPaused ? 'ضبط متوقف شده' : 'در حال ضبط...'}
          </h1>
          <div className="font-mono text-4xl font-bold text-red-500">
            {formatTime(recordingDuration)}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-6">
          <Button
            onClick={handlePauseResume}
            variant="outline"
            size="lg"
            className="h-16 w-16 rounded-full border-2"
          >
            {isPaused ? (
              <Play className="h-8 w-8" />
            ) : (
              <Pause className="h-8 w-8" />
            )}
          </Button>

          <Button
            onClick={handleStopRecording}
            className="h-16 w-16 rounded-full bg-red-500 text-white hover:bg-red-600"
          >
            <Square className="h-8 w-8" />
          </Button>
        </div>

        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {isPaused 
            ? 'روی پلی کلیک کنید تا ضبط را ادامه دهید یا استاپ کنید تا تمام شود'
            : 'روی مکث کلیک کنید تا موقتاً متوقف شود یا استاپ کنید تا ضبط تمام شود'
          }
        </p>
      </div>
    </div>
  );
};

export default Record;