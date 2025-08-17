import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useMeetingStore } from '@/store/useMeetingStore';
import { Mic, Pause, Square, Play } from 'lucide-react';

const Record = () => {
  const navigate = useNavigate();
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
        console.log('Recording stopped, chunks collected:', chunksRef.current.length);
        const audioBlob = chunksRef.current.length > 0 
          ? new Blob(chunksRef.current, { type: 'audio/wav' }) 
          : null;
        
        console.log('Audio blob created:', audioBlob?.size || 'null');
        console.log('Final duration captured:', recordingDuration);
        
        // Navigate to tag selection with recording data
        navigate('/tag-selection', { 
          state: { 
            duration: recordingDuration,
            audioBlob: audioBlob
          }
        });
      };

      mediaRecorder.start();
      startRecording();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions.');
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

  if (!isRecording) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center space-y-8">
          <div className="relative">
            <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mic className="h-16 w-16 text-primary" />
            </div>
            <div className="absolute inset-0 w-32 h-32 bg-primary/20 rounded-full animate-ping mx-auto" />
          </div>
          
          <div className="space-y-4">
            <h1 className="text-3xl font-bold text-foreground">آماده ضبط</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              روی دکمه زیر کلیک کنید تا ضبط جلسه را شروع کنید. اطمینان حاصل کنید که در محیط آرامی هستید تا کیفیت بهتری داشته باشید.
            </p>
          </div>

          <Button
            onClick={handleStartRecording}
            className="bg-red-500 hover:bg-red-600 text-white h-16 px-8 rounded-full text-lg font-semibold shadow-lg"
          >
            <Mic className="h-6 w-6 ml-3" />
            شروع ضبط
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate('/home')}
            className="mt-4"
          >
            لغو
          </Button>
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