import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { useMeetingStore } from '@/store/useMeetingStore';
import { ArrowLeft, Plus, Tag, X, Play, Pause, GripVertical } from 'lucide-react';
import type { Tag as TagType } from '@/store/useMeetingStore';

interface AudioFile {
  id: string;
  name: string;
  duration: number;
  blob: Blob | File;
  type: 'recording' | 'upload';
}
import { mysqlClient } from '@/lib/mysql-client';
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
  const { tags, addTag, addMeeting, setTags } = useMeetingStore();
  const { toast } = useToast();
  
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCancelled, setUploadCancelled] = useState(false);
  
  // State for individual file upload progress
  const [fileUploadProgress, setFileUploadProgress] = useState<Map<string, number>>(new Map());
  
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

  const audioFiles = location.state?.audioFiles as AudioFile[] | null;
  const commentText = location.state?.commentText as string | undefined;
  

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
    if (!audioFiles || audioFiles.length === 0) {
      toast({
        title: "خطا",
        description: "هیچ فایل صوتی یافت نشد",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadCancelled(false);

    try {
      // Get current user
      const { data: { session } } = await mysqlClient.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        toast({
          title: "احراز هویت الزامی است",
          description: "لطفاً برای ذخیره جلسات وارد شوید",
          variant: "destructive",
        });
        return;
      }

      // Calculate total duration
      const totalDuration = audioFiles.reduce((sum, file) => sum + file.duration, 0);
      
      // Generate meeting title from first file
      const firstFile = audioFiles[0];
      const meetingTitle = firstFile.name.replace(/\.(wav|mp3|m4a|ogg)$/i, '') || 'جلسه';

      // Upload all audio files
      const uploadedFiles = [];
      
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const fileName = `${Date.now()}-${i}-${file.name}`;
        
        // Initialize progress for this file
        setFileUploadProgress(prev => new Map(prev).set(file.id, 0));
        
        const formData = new FormData();
        formData.append('audio', file.blob, fileName);

        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setFileUploadProgress(prev => {
                const newMap = new Map(prev).set(file.id, percentComplete);
                
                // Calculate overall progress - ensure all files are counted
                const totalProgress = audioFiles.reduce((sum, file) => {
                  const fileProgress = newMap.get(file.id) || 0;
                  return sum + fileProgress;
                }, 0);
                const averageProgress = Math.round(totalProgress / audioFiles.length);
                setUploadProgress(averageProgress);
                
                return newMap;
              });
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const uploadResult = JSON.parse(xhr.responseText);
              resolve(uploadResult);
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
          });

          xhr.open('POST', `${API_BASE_URL}/upload/audio`);
          xhr.setRequestHeader('Authorization', `Bearer ${session.access_token || session.token}`);
          xhr.send(formData);
        });

        try {
          const uploadResult = await uploadPromise;
          uploadedFiles.push({
            fileName: fileName,
            filePath: uploadResult.data.relativePath,
            fileSize: uploadResult.data.size,
            duration: file.duration,
            format: uploadResult.data.format,
            uploadOrder: i + 1
          });
          
          // Set progress to 100% for completed file
          setFileUploadProgress(prev => {
            const newMap = new Map(prev).set(file.id, 100);
            
            // Calculate overall progress - ensure all files are counted
            const totalProgress = audioFiles.reduce((sum, file) => {
              const fileProgress = newMap.get(file.id) || 0;
              return sum + fileProgress;
            }, 0);
            const averageProgress = Math.round(totalProgress / audioFiles.length);
            setUploadProgress(averageProgress);
            
            return newMap;
          });
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'بارگذاری فایل ناموفق بود');
        }
      }

      // Create meeting in database
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

      // Insert audio files into audio_files table
      for (const uploadedFile of uploadedFiles) {
        const { error: audioFileError } = await mysqlClient
          .from('audio_files')
          .insert({
            meeting_id: meetingData.id || meetingData[0]?.id,
            file_name: uploadedFile.fileName,
            file_path: uploadedFile.filePath,
            file_size: uploadedFile.fileSize,
            duration: uploadedFile.duration,
            format: uploadedFile.format,
            upload_order: uploadedFile.uploadOrder
          });

        if (audioFileError) {
          console.error('Error inserting audio file:', audioFileError);
        }
      }

      // Create meeting-tag relationships
      if (selectedTags.length > 0) {
        // Create relationships one by one since backend expects single relationship per request
        for (const tag of selectedTags) {
          const { error: tagsError } = await mysqlClient
            .from('meeting_tags')
            .insert({
              meeting_id: meetingData.id || meetingData[0]?.id,
              tag_id: tag.id
            });

          if (tagsError) {
            toast({
              title: "خطا در پیوند برچسب‌ها",
              description: tagsError.message,
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Auto-trigger summary generation using the exact same method as MeetingDetail (WORKING METHOD)
      try {
        
        // Update meeting status to "ارسال درخواست پردازش"
        const updateResult = await mysqlClient
          .from('meetings')
          .update({ status: 'ارسال درخواست پردازش' });
        
        const { error: statusError } = await updateResult.eq('id', meetingData.id || meetingData[0]?.id);

        if (statusError) throw statusError;

        // Get current user email
        const userEmail = user?.email || '';
        
        
        // Try multiple approaches to ensure the request gets through (same as MeetingDetail)
        const requestData = {};

        // Approach 1: Try with no-cors first
        try {
          await fetch('https://n8nnew.teraxr.com/webhook/add5d58a-54b1-4459-96f2-ec17590e3cfd', {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          });
        } catch (e) {
        }

/*
        // Approach 2: Try with dynamic image for GET request with query params
        try {
          const img = new Image();
          const url = new URL('https://n8nnew.teraxr.com/webhook-test/add5d58a-54b1-4459-96f2-ec17590e3cfd');
          img.src = url.toString();
        } catch (e) {
        }

        */
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

      navigate('/home');
         } catch (error) {
      toast({
        title: "خطا",
        description: "ذخیره جلسه ناموفق بود",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadCancelled(false);
      setFileUploadProgress(new Map()); // Clear individual file progress
    }
  };

  const handleSaveMeetingWithoutWebhook = async () => {
    if (!audioFiles || audioFiles.length === 0) {
      toast({
        title: "خطا",
        description: "هیچ فایل صوتی یافت نشد",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadCancelled(false);

    try {
      // Get current user
      const { data: { session } } = await mysqlClient.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        toast({
          title: "احراز هویت الزامی است",
          description: "لطفاً برای ذخیره جلسات وارد شوید",
          variant: "destructive",
        });
        return;
      }

      // Calculate total duration
      const totalDuration = audioFiles.reduce((sum, file) => sum + file.duration, 0);
      
      // Generate meeting title from first file
      const firstFile = audioFiles[0];
      const meetingTitle = firstFile.name.replace(/\.(wav|mp3|m4a|ogg)$/i, '') || 'جلسه';

      // Upload all audio files
      const uploadedFiles = [];
      
      for (let i = 0; i < audioFiles.length; i++) {
        const file = audioFiles[i];
        const fileName = `${Date.now()}-${i}-${file.name}`;
        
        // Initialize progress for this file
        setFileUploadProgress(prev => new Map(prev).set(file.id, 0));
        
        const formData = new FormData();
        formData.append('audio', file.blob, fileName);

        // Create XMLHttpRequest for progress tracking
        const xhr = new XMLHttpRequest();
        
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const percentComplete = Math.round((event.loaded / event.total) * 100);
              setFileUploadProgress(prev => {
                const newMap = new Map(prev).set(file.id, percentComplete);
                
                // Calculate overall progress - ensure all files are counted
                const totalProgress = audioFiles.reduce((sum, file) => {
                  const fileProgress = newMap.get(file.id) || 0;
                  return sum + fileProgress;
                }, 0);
                const averageProgress = Math.round(totalProgress / audioFiles.length);
                setUploadProgress(averageProgress);
                
                return newMap;
              });
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const uploadResult = JSON.parse(xhr.responseText);
              resolve(uploadResult);
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error('Upload failed'));
          });

          xhr.open('POST', `${API_BASE_URL}/upload/audio`);
          xhr.setRequestHeader('Authorization', `Bearer ${session.access_token || session.token}`);
          xhr.send(formData);
        });

        try {
          const uploadResult = await uploadPromise;
          uploadedFiles.push({
            fileName: fileName,
            filePath: uploadResult.data.relativePath,
            fileSize: uploadResult.data.size,
            duration: file.duration,
            format: uploadResult.data.format,
            uploadOrder: i + 1
          });
          
          // Set progress to 100% for completed file
          setFileUploadProgress(prev => {
            const newMap = new Map(prev).set(file.id, 100);
            
            // Calculate overall progress - ensure all files are counted
            const totalProgress = audioFiles.reduce((sum, file) => {
              const fileProgress = newMap.get(file.id) || 0;
              return sum + fileProgress;
            }, 0);
            const averageProgress = Math.round(totalProgress / audioFiles.length);
            setUploadProgress(averageProgress);
            
            return newMap;
          });
        } catch (error) {
          throw new Error(error instanceof Error ? error.message : 'بارگذاری فایل ناموفق بود');
        }
      }

      // Create meeting in database
      const { data: meetingData, error: meetingError } = await mysqlClient
        .from('meetings')
        .insert({
          meeting_date: new Date().toISOString(),
          user_id: user.id,
          summary: '',
          title: meetingTitle,
          status: 'ذخیره موقت',
          CommentText: commentText || null
        });

      if (meetingError) {
        throw new Error(meetingError.message);
      }

      // Insert audio files into audio_files table
      for (const uploadedFile of uploadedFiles) {
        const { error: audioFileError } = await mysqlClient
          .from('audio_files')
          .insert({
            meeting_id: meetingData.id || meetingData[0]?.id,
            file_name: uploadedFile.fileName,
            file_path: uploadedFile.filePath,
            file_size: uploadedFile.fileSize,
            duration: uploadedFile.duration,
            format: uploadedFile.format,
            upload_order: uploadedFile.uploadOrder
          });

        if (audioFileError) {
          console.error('Error inserting audio file:', audioFileError);
        }
      }

      // Create meeting-tag relationships
      if (selectedTags.length > 0) {
        // Create relationships one by one since backend expects single relationship per request
        for (const tag of selectedTags) {
          const { error: tagsError } = await mysqlClient
            .from('meeting_tags')
            .insert({
              meeting_id: meetingData.id || meetingData[0]?.id,
              tag_id: tag.id
            });

          if (tagsError) {
            toast({
              title: "خطا در پیوند برچسب‌ها",
              description: tagsError.message,
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Note: Webhook is NOT called in this function
      
      toast({
        title: "جلسه ذخیره شد",
        description: "جلسه با موفقیت ذخیره شد.",
      });

      navigate('/home');
    } catch (error) {
      toast({
        title: "خطا",
        description: "ذخیره جلسه ناموفق بود",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadCancelled(false);
      setFileUploadProgress(new Map()); // Clear individual file progress
    }
  };

  const handleCancelUpload = () => {
    setUploadCancelled(true);
    setIsUploading(false);
    setUploadProgress(0);
    setFileUploadProgress(new Map()); // Clear individual file progress
    toast({
      title: "بارگذاری لغو شد",
      description: "بارگذاری جلسه لغو شد",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/record')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
            <h1 className="text-xl font-bold text-foreground">انتخاب برچسب</h1>
              <p className="text-xs text-muted-foreground">برچسب‌هایی برای جلسه خود انتخاب یا ایجاد کنید</p>
            </div>
          </div>
          
          <Badge variant="secondary">
            {selectedTags.length} انتخاب شده
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Audio Files List */}
        {audioFiles && audioFiles.length > 0 && !isUploading && (
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">
                فایل‌های صوتی ({audioFiles.length})
              </h3>
              <div className="space-y-3">
                {audioFiles.map((file, index) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="cursor-grab">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <Badge variant={file.type === 'recording' ? 'default' : 'secondary'}>
                            {file.type === 'recording' ? 'ضبط' : 'آپلود'}
                          </Badge>
                          <span className="font-medium text-sm">{file.name}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          مدت زمان: {formatTime(file.duration)} • اندازه: {(file.blob.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                    </div>
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
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Audio Files Upload Progress */}
        {isUploading && audioFiles && audioFiles.length > 0 && (
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-4">
                بارگذاری فایل‌های صوتی ({audioFiles.length})
              </h3>
              <div className="space-y-4">
                {audioFiles.map((file, index) => {
                  const progress = fileUploadProgress.get(file.id) || 0;
                  return (
                    <div key={file.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge variant={file.type === 'recording' ? 'default' : 'secondary'}>
                            {file.type === 'recording' ? 'ضبط' : 'آپلود'}
                          </Badge>
                          <span className="font-medium text-sm">{file.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {progress}%
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>مدت زمان: {Math.floor(file.duration / 60)}:{String(file.duration % 60).padStart(2, '0')}</span>
                        <span>اندازه: {(file.blob.size / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">برچسب‌ها</h2>
            <Button
              variant="destructive"
              size="lg"
              onClick={handleCreateTag}
              disabled={!canCreateNewTag}
              className="h-12 px-6 font-semibold"
            >
              <Plus className="h-5 w-5 ml-2" />
              برچسب جدید
            </Button>
          </div>

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border"
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {closestTags.map((tag) => (
                  <Card
                    key={tag.id}
                    className="cursor-pointer transition-all duration-200 border-2 border-transparent bg-gradient-card hover:border-primary/40 hover:shadow-medium"
                    onClick={() => handleSelectSuggestedTag(tag)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                        <h4 className="font-medium text-foreground">{tag.name}</h4>
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
          <div className="text-center py-12">
            <Tag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              هنوز برچسبی نیست
            </h3>
            <p className="text-muted-foreground">
              نام برچسب را در کادر بالا تایپ کنید و روی «برچسب جدید» بزنید.
            </p>
          </div>
        )}

        {/* Save Buttons */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
          {isUploading ? (
            <div className="bg-card border border-border rounded-full p-4 shadow-2xl">
              <div className="text-center space-y-3">
                 <div className="text-sm font-medium text-card-foreground">
                   در حال بارگذاری جلسه... {Math.round(uploadProgress)}%
                 </div>
                 <Progress value={uploadProgress} className="w-64" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <X className="h-4 w-4 ml-2" />
                      لغو
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>لغو بارگذاری؟</AlertDialogTitle>
                      <AlertDialogDescription>
                        آیا مطمئن هستید که می‌خواهید بارگذاری را لغو کنید؟ این عمل فرآیند بارگذاری فعلی را متوقف می‌کند و باید از ابتدا شروع کنید.
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
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <Button
                onClick={handleSaveMeetingWithoutWebhook}
                variant="outline"
                className="h-14 px-6 rounded-full shadow-2xl"
              >
                ذخیره موقت
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
              <Button
                onClick={handleSaveMeeting}
                className="h-14 px-8 rounded-full shadow-2xl"
              >
                ذخیره جلسه
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagSelection;
