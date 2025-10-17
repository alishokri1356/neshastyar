import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMeetingStore } from '@/store/useMeetingStore';
import { Mic, Pause, Square, Play, Upload, Trash2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AudioFile {
  id: string;
  name: string;
  duration: number;
  blob: Blob | File;
  type: 'recording' | 'upload';
}

const Record = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State for multiple audio files
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [showFilesList, setShowFilesList] = useState(false);
  
  const {
    isRecording,
    isPaused,
    recordingDuration,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    setRecordingDuration
  } = useMeetingStore();

  const intervalRef = useRef<NodeJS.Timeout>();
  const mediaRecorderRef = useRef<MediaRecorder>();
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Navigate to tag selection with all audio files
    navigate('/tag-selection', { 
      state: { 
        audioFiles: audioFiles
      }
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    // File size check removed - no limitations
    
    // Define supported audio MIME types for mobile devices
    const supportedAudioTypes = [
      'audio/mpeg', // MP3
      'audio/mp3',
      'audio/wav', // WAV
      'audio/wave',
      'audio/x-wav',
      'audio/aac', // AAC
      'audio/mp4', // M4A
      'audio/x-m4a',
      'audio/ogg', // OGG
      'audio/webm', // WebM
      'audio/3gpp', // 3GP (common on Android)
      'audio/amr', // AMR (common on older Android)
      'audio/flac' // FLAC
    ];
    
    if (file && supportedAudioTypes.includes(file.type)) {
      // Get audio duration (approximate)
      const audio = new Audio();
      audio.src = URL.createObjectURL(file);
      
      audio.onloadedmetadata = () => {
        const duration = Math.floor(audio.duration);
        URL.revokeObjectURL(audio.src);
        
        // Add file to the list
        const newAudioFile: AudioFile = {
          id: `upload-${Date.now()}`,
          name: file.name,
          duration: duration,
          blob: file,
          type: 'upload'
        };
        
        setAudioFiles(prev => [...prev, newAudioFile]);
        setShowFilesList(true);
        
        toast({
          title: "فایل اضافه شد",
          description: "فایل صوتی به لیست اضافه شد.",
        });
      };
      
      audio.onerror = () => {
        URL.revokeObjectURL(audio.src);
        toast({
          title: "خطا در پخش فایل صوتی",
          description: "فایل صوتی نامعتبر است یا قابل پخش نیست.",
          variant: "destructive",
        });
      };
    } else {
      toast({
        title: "فرمت فایل نامعتبر",
        description: "لطفاً یک فایل صوتی معتبر انتخاب کنید (MP3, WAV, AAC, M4A, OGG, WebM, 3GP, AMR, FLAC)",
        variant: "destructive",
      });
    }
  };

  if (!isRecording) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center space-y-4 mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute inset-0 w-24 h-24 bg-primary/20 rounded-full animate-ping mx-auto" />
            </div>
            
            <h1 className="text-3xl font-bold text-foreground">ضبط جلسه</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              می‌توانید چندین فایل صوتی ضبط یا آپلود کنید. پس از اتمام روی "تمام" کلیک کنید.
            </p>
          </div>

          {/* Audio Files List */}
          {showFilesList && audioFiles.length > 0 && (
            <div className="max-w-2xl mx-auto mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4 text-center">
                فایل‌های صوتی ({audioFiles.length})
              </h2>
              <div className="space-y-3">
                {audioFiles.map((file, index) => (
                  <Card key={file.id} className="bg-white/50 dark:bg-gray-800/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <Badge variant={file.type === 'recording' ? 'default' : 'secondary'}>
                              {file.type === 'recording' ? 'ضبط' : 'آپلود'}
                            </Badge>
                            <span className="font-medium">{file.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            مدت زمان: {formatTime(file.duration)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAudioFile(file.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="text-center space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={handleStartRecording}
                className="bg-red-500 hover:bg-red-600 text-white h-16 px-8 rounded-full text-lg font-semibold shadow-lg"
              >
                <Mic className="h-6 w-6 ml-3" />
                شروع ضبط
              </Button>

              <Button
                onClick={handleFileSelect}
                variant="outline"
                className="h-16 px-8 rounded-full text-lg font-semibold border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Upload className="h-6 w-6 ml-3" />
                انتخاب فایل
              </Button>
            </div>

            {/* Done Button */}
            {audioFiles.length > 0 && (
              <Button
                onClick={handleDone}
                className="bg-green-500 hover:bg-green-600 text-white h-16 px-8 rounded-full text-lg font-semibold shadow-lg"
              >
                <Check className="h-6 w-6 ml-3" />
                تمام ({audioFiles.length} فایل)
              </Button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/mpeg,audio/mp3,audio/wav,audio/wave,audio/x-wav,audio/aac,audio/mp4,audio/x-m4a,audio/ogg,audio/webm,audio/3gpp,audio/amr,audio/flac,.mp3,.wav,.aac,.m4a,.ogg,.3gp,.amr,.flac"
              onChange={handleFileChange}
              className="hidden"
            />

            <Button
              variant="ghost"
              onClick={() => navigate('/home')}
              className="mt-4"
            >
              لغو
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-background to-red-100 flex items-center justify-center">
      <div className="text-center space-y-8 p-8">
        {/* Recording Indicator */}
        <div className="relative">
          <div className="w-40 h-40 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center">
              <Mic className="h-12 w-12 text-white" />
            </div>
          </div>
          <div className="absolute inset-0 w-40 h-40 bg-red-500/30 rounded-full animate-pulse mx-auto" />
        </div>

        {/* Recording Status */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {isPaused ? 'ضبط متوقف شده' : 'در حال ضبط...'}
          </h1>
          <div className="text-4xl font-mono font-bold text-red-500">
            {formatTime(recordingDuration)}
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center space-x-6">
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
            className="bg-red-500 hover:bg-red-600 text-white h-16 w-16 rounded-full"
          >
            <Square className="h-8 w-8" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground max-w-md mx-auto">
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