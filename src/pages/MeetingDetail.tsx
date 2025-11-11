import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMeetingStore } from '@/store/useMeetingStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Save, Play, Pause, Plus, X, Trash2, Sparkles, Edit, Check, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { mysqlClient } from '@/lib/mysql-client';

const MeetingDetail = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { tags, addTag } = useMeetingStore();
  
  const [meeting, setMeeting] = useState<any>(null);
  const [localAllUserTags, setLocalAllUserTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [originalSummary, setOriginalSummary] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [showAddTag, setShowAddTag] = useState(false);
  const [meetingTags, setMeetingTags] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [originalCommentText, setOriginalCommentText] = useState('');
  const [isEditingCommentText, setIsEditingCommentText] = useState(false);
  
  // Audio player state
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Audio player control functions
  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNextAudio = () => {
    if (meeting?.audioFiles && currentAudioIndex < meeting.audioFiles.length - 1) {
      setCurrentAudioIndex(currentAudioIndex + 1);
      setCurrentTime(0);
    }
  };

  const handlePreviousAudio = () => {
    if (currentAudioIndex > 0) {
      setCurrentAudioIndex(currentAudioIndex - 1);
      setCurrentTime(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Fetch meeting and all user tags from database with auto-refresh
  const { data: meetingData, isLoading: meetingLoading } = useQuery({
    queryKey: ['meeting', meetingId],
    queryFn: async () => {
      if (!meetingId) {
        console.log('🔍 No meetingId provided');
        return null;
      }
      
      console.log('🔍 Fetching meeting with ID:', meetingId);
      
      const { data: { user } } = await mysqlClient.auth.getUser();
      if (!user) {
        console.log('🔍 No user found');
        return null;
      }

      console.log('🔍 User ID:', user.id);

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

      console.log('🔍 Meeting query result:', { meetingData, meetingError });
      console.log('🔍 Raw meeting data:', JSON.stringify(meetingData, null, 2));

      if (meetingError) {
        console.error('Error fetching meeting:', meetingError);
        return null;
      }

      if (meetingData) {
        // Fetch meeting tags directly with JOIN query
        const { data: tags, error: tagError } = await mysqlClient
          .from('meeting_tags')
          .select('*')
          .eq('meeting_id', meetingId);

        console.log('🔍 Meeting tags data:', tags, tagError);

        // Fetch audio files using the new API endpoint
        const { data: { session } } = await mysqlClient.auth.getSession();
        const audioFilesResponse = await fetch(`/api/meetings/${meetingId}/audio-files`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const audioFilesData = await audioFilesResponse.json();
        console.log('🔍 Audio files API response:', audioFilesData);
        
        const audioFiles = audioFilesData.data || [];
        console.log('🔍 Final audio files to process:', audioFiles);
        
        const processedAudioFiles = await Promise.all(
          audioFiles.map(async (file: any) => ({
            id: file.id,
            fileName: file.file_name,
            filePath: file.file_path,
            fileSize: file.file_size,
            duration: file.duration,
            format: file.format,
            uploadOrder: file.upload_order,
            audioUrl: await getAudioUrl(file.file_name, user.id)
          }))
        );
        
        console.log('🔍 Processed audio files:', processedAudioFiles);

        const transformedMeeting = {
          id: meetingData.id,
          title: meetingData.title || `Meeting ${new Date(meetingData.meeting_date).toLocaleDateString()}`,
          date: new Date(meetingData.meeting_date),
          summary: meetingData.summary || '',
          commentText: meetingData.CommentText || '',
          status: meetingData.status,
          tags: tags,
          userId: meetingData.user_id,
          audioFiles: processedAudioFiles,
          totalDuration: processedAudioFiles.reduce((sum, file) => sum + (file.duration || 0), 0)
        };

        console.log('🔍 Final transformed meeting:', transformedMeeting);
        return transformedMeeting;
      }
      return null;
    },
    refetchOnWindowFocus: false, // Disable aggressive refetching
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    enabled: !!meetingId
  });

  // Separate query for status updates (with auto-refresh)
  const { data: statusData } = useQuery({
    queryKey: ['meeting-status', meetingId],
    queryFn: async () => {
      if (!meetingId) return null;
      
      const { data: { user } } = await mysqlClient.auth.getUser();
      if (!user) return null;

      const { data: meetingData, error: meetingError } = await mysqlClient
        .from('meetings')
        .select('status, summary')
        .eq('id', meetingId)
        .eq('user_id', user.id)
        .single();

      if (meetingError || !meetingData) return null;
      
      return {
        status: meetingData.status,
        summary: meetingData.summary || ''
      };
    },
    refetchInterval: 30000, // Reduce to 30 seconds
    refetchIntervalInBackground: false, // Disable background refetching
    enabled: !!meetingId && !!meetingData
  });

  const { data: allUserTags = [] } = useQuery({
    queryKey: ['user-tags'],
    queryFn: async () => {
      const { data: { user } } = await mysqlClient.auth.getUser();
      if (!user) return [];

      const { data: allTags, error: allTagsError } = await mysqlClient
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (allTagsError) {
        console.error('Error fetching user tags:', allTagsError);
        return [];
      }
      return allTags || [];
    },
    refetchInterval: 30000, // Reduce to 30 seconds
    refetchIntervalInBackground: false, // Disable background refetching
    refetchOnWindowFocus: false, // Disable refetch on window focus
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
  });

  // Update local states when data changes
  useEffect(() => {
    if (meetingData) {
      setMeeting(meetingData);
      setMeetingTags(meetingData.tags);
      setSummary(meetingData.summary);
      setCommentText(meetingData.commentText || '');
      setEditedTitle(meetingData.title);
    }
  }, [meetingData]);

  useEffect(() => {
    setLocalAllUserTags(allUserTags);
  }, [allUserTags]);

  // Update summary when status data changes (for auto-refresh)
  // Don't update if user is currently editing
  useEffect(() => {
    if (statusData?.summary && statusData.summary !== summary && !isEditingSummary) {
      setSummary(statusData.summary);
    }
  }, [statusData?.summary, isEditingSummary]);

  // Note: Real-time subscriptions are not implemented in the MySQL client
  // The component will rely on React Query's refetchInterval for updates

  const getAudioUrl = async (fileName: string, userId: string) => {
    try {
      // Get the current session token
      const { data: { session } } = await mysqlClient.auth.getSession();
      if (!session) {
        console.error('No session found for audio access');
        return null;
      }

      const token = session.access_token || session.token;
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      return `${API_BASE_URL}/audio/${userId}/${fileName}?token=${token}`;
    } catch (error) {
      console.error('Error getting audio URL:', error);
      return null;
    }
  };

  if (meetingLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">در حال بارگذاری جزئیات جلسه...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">جلسه پیدا نشد</h1>
            <Button onClick={() => navigate('/home')} variant="outline">
              <ArrowLeft className="ml-2 h-4 w-4" />
              بازگشت به خانه
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveSummary = async () => {
    try {
      const { error } = await mysqlClient
        .from('meetings')
        .update({ summary })
        .eq('id', meeting.id);

      if (error) throw error;

      setMeeting(prev => ({ ...prev, summary }));
      setIsEditingSummary(false);
      
      // Invalidate queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meeting-status', meetingId] });
      
      toast({
        title: "خلاصه ذخیره شد",
        description: "خلاصه جلسه با موفقیت به‌روزرسانی شد.",
      });
    } catch (error) {
      console.error('Error saving summary:', error);
      toast({
        title: "خطا",
        description: "ذخیره خلاصه ناموفق بود. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    }
  };

  const handleSaveCommentText = async () => {
    try {
      const { error } = await mysqlClient
        .from('meetings')
        .update({ CommentText: commentText } as any)
        .eq('id', meeting.id);

      if (error) throw error;

      setMeeting(prev => ({ ...prev, commentText }));
      setIsEditingCommentText(false);

      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });

      toast({
        title: "یادداشت ذخیره شد",
        description: "یادداشت جلسه با موفقیت به‌روزرسانی شد.",
      });
    } catch (error) {
      console.error('Error saving comment text:', error);
      toast({
        title: "خطا",
        description: "ذخیره یادداشت ناموفق بود. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    }
  };

  const handleAddTag = async () => {
    if (newTagName.trim()) {
      try {
        const { data: { user } } = await mysqlClient.auth.getUser();
        if (!user) return;

        // Create new tag in database
        const { data: newTag, error: tagError } = await mysqlClient
          .from('tags')
          .insert({
            name: newTagName.trim(),
            color: newTagColor,
            user_id: user.id
          })
          .select()
          .single();

        if (tagError) throw tagError;

        // Link tag to meeting
        const { error: linkError } = await mysqlClient
          .from('meeting_tags')
          .insert({
            meeting_id: meeting.id,
            tag_id: newTag.id
          });

        if (linkError) throw linkError;

        const updatedTags = [...meetingTags, newTag];
        setMeetingTags(updatedTags);
        setMeeting(prev => ({ ...prev, tags: updatedTags }));
        setLocalAllUserTags(prev => [...prev, newTag]); // Add to all user tags as well
        
        setNewTagName('');
        setShowAddTag(false);
        
        toast({
          title: "برچسب اضافه شد",
          description: "برچسب جدید به جلسه اضافه شد.",
        });
      } catch (error: any) {
        console.error('Error adding tag:', error);
        
        // Handle specific error cases
        if (error?.message?.includes('Relationship already exists') || error?.error === 'Relationship already exists') {
          toast({
            title: "برچسب قبلاً اضافه شده",
            description: "این برچسب قبلاً به جلسه اضافه شده است.",
            variant: "destructive",
          });
        } else if (error?.message?.includes('Tag already exists') || error?.error === 'Tag already exists') {
          toast({
            title: "برچسب قبلاً وجود دارد",
            description: "برچسبی با این نام قبلاً ایجاد شده است.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "خطا",
            description: "افزودن برچسب ناموفق بود. لطفاً دوباره تلاش کنید.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      // Delete meeting-tag relationship using direct API call
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/meeting-tags?meeting_id=${meeting.id}&tag_id=${tagId}`, {
        method: 'DELETE',
        headers: {
          ...mysqlClient.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete meeting-tag relationship');
      }

      const updatedTags = meetingTags.filter(tag => tag.id !== tagId);
      setMeetingTags(updatedTags);
      setMeeting(prev => ({ ...prev, tags: updatedTags }));
      
      toast({
        title: "برچسب حذف شد",
        description: "برچسب از جلسه حذف شد.",
      });
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: "خطا",
        description: "حذف برچسب ناموفق بود. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    }
  };

  const handleAddExistingTag = async (tag: any) => {
    const tagExists = meetingTags && meetingTags.some(t => t.id === tag.id);
    if (!tagExists) {
      try {
        const { error } = await mysqlClient
          .from('meeting_tags')
          .insert({
            meeting_id: meeting.id,
            tag_id: tag.id
          });

        if (error) throw error;

        const updatedTags = [...meetingTags, tag];
        setMeetingTags(updatedTags);
        setMeeting(prev => ({ ...prev, tags: updatedTags }));
        
        toast({
          title: "برچسب اضافه شد",
          description: "برچسب به جلسه اضافه شد.",
        });
      } catch (error: any) {
        console.error('Error adding tag:', error);
        
        // Handle specific error cases
        if (error?.message?.includes('Relationship already exists') || error?.error === 'Relationship already exists') {
          toast({
            title: "برچسب قبلاً اضافه شده",
            description: "این برچسب قبلاً به جلسه اضافه شده است.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "خطا",
            description: "افزودن برچسب ناموفق بود. لطفاً دوباره تلاش کنید.",
            variant: "destructive",
          });
        }
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-success text-success-foreground';
      case 'Need Review': return 'bg-warning text-warning-foreground';
      case 'On Process': return 'bg-info text-info-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleAutoGenerateSummary = async () => {
    try {
      // Update meeting status to "ارسال درخواست پردازش"
      const { error: statusError } = await mysqlClient
        .from('meetings')
        .update({ status: 'ارسال درخواست پردازش' })
        .eq('id', meeting.id);

      if (statusError) throw statusError;

      // Update local state
      setMeeting(prev => ({ ...prev, status: 'ارسال درخواست پردازش' }));

      // Get current user email
      const { data: { user } } = await mysqlClient.auth.getUser();
      const userEmail = user?.email || '';
      
      
      // Try multiple approaches to ensure the request gets through
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
//        const url = new URL('https://n8n.teraxr.com/webhook-test/add5d58a-54b1-4459-96f2-ec17590e3cfd');
        const url = new URL('https://n8nnew.teraxr.com/webhook-test/add5d58a-54b1-4459-96f2-ec17590e3cfd');
        img.src = url.toString();
      } catch (e) {
      }
*/
      toast({
        title: "درخواست تولید اتوماتیک خلاصه ارسال شد",
        description: "خلاصه جلسه پی از تکمیل به ایمیل شما ارسال خواهد شد.",
      });
    } catch (error) {
      console.error('Error triggering auto summary:', error);
      
      toast({
        title: "خطا",
        description: "شروع تولید خلاصه خودکار ناموفق بود. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    }
  };

  const handleSendSummaryToEmail = async () => {
    try {
      const currentSummary = statusData?.summary || summary;
      if (!currentSummary || currentSummary.trim() === '') {
        toast({
          title: "خطا",
          description: "خلاصه‌ای برای ارسال وجود ندارد.",
          variant: "destructive",
        });
        return;
      }

      // Call the webhook endpoint (no authentication required)
      const webhookUrl = `https://modiryar.online/sendmail/${meeting.id}`;
      console.log('🔗 Calling webhook:', webhookUrl);
      
      const response = await fetch(webhookUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log('❌ Webhook error:', response.status, errorData);
        
        // Handle cooldown error specifically
        if (response.status === 429 && errorData.cooldownRemaining) {
          toast({
            title: "لطفاً صبر کنید",
            description: `برای ارسال ایمیل بعدی ${errorData.cooldownRemaining} ثانیه صبر کنید.`,
            variant: "destructive",
          });
          return;
        }
        
        throw new Error(errorData.message || 'Failed to send email');
      }

      const result = await response.json();
      console.log('✅ Webhook response:', result);
      
      toast({
        title: "خلاصه ارسال شد",
        description: `خلاصه جلسه به ایمیل ${result.data.userEmail} ارسال شد.`,
      });
    } catch (error) {
      console.error('Error sending summary to email:', error);
      toast({
        title: "خطا",
        description: "ارسال خلاصه به ایمیل ناموفق بود. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMeeting = async () => {
    if (!meeting) return;
    
    setIsDeleting(true);
    try {
      const { data: { user } } = await mysqlClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete meeting_tags relationships
      // First, get all meeting-tag relationships for this meeting
      const { data: meetingTags, error: fetchTagsError } = await mysqlClient
        .from('meeting_tags')
        .select('*')
        .eq('meeting_id', meeting.id);

      if (fetchTagsError) {
        console.error('Error fetching meeting tags:', fetchTagsError);
      } else if (meetingTags && meetingTags.length > 0) {
        // Delete each relationship individually
        for (const meetingTag of meetingTags) {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/meeting-tags?meeting_id=${meeting.id}&tag_id=${meetingTag.tag_id}`, {
            method: 'DELETE',
            headers: {
              ...mysqlClient.getAuthHeaders(),
            },
          });
          
          if (!response.ok) {
            console.error('Error deleting meeting-tag relationship:', response.statusText);
          }
        }
      }

      // Delete meeting record
      const { error: meetingError } = await mysqlClient
        .from('meetings')
        .delete()
        .eq('id', meeting.id);

      if (meetingError) throw meetingError;

      toast({
        title: "جلسه حذف شد",
        description: "جلسه با موفقیت حذف شد.",
      });

      // Navigate back to home
      navigate('/home');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({
        title: "خطا",
        description: "حذف جلسه ناموفق بود. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditTitle = () => {
    setIsEditingTitle(true);
    setEditedTitle(meeting.title);
  };

  const handleSaveTitle = async () => {
    if (!editedTitle.trim()) {
      toast({
        title: "خطا",
        description: "عنوان نمی‌تواند خالی باشد.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await mysqlClient
        .from('meetings')
        .update({ title: editedTitle.trim() } as any)
        .eq('id', meeting.id);

      if (error) throw error;

      setMeeting(prev => ({ ...prev, title: editedTitle.trim() }));
      setIsEditingTitle(false);
      
      toast({
        title: "عنوان به‌روزرسانی شد",
        description: "عنوان جلسه با موفقیت به‌روزرسانی شد.",
      });
    } catch (error) {
      console.error('Error saving title:', error);
      toast({
        title: "خطا",
        description: "ذخیره عنوان ناموفق بود. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    }
  };

  const handleCancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle(meeting.title);
  };

  // Helper function to check if summary is JSON
  const parseJsonSummary = (summaryText: string) => {
    try {
      const parsed = JSON.parse(summaryText);
      return parsed;
    } catch {
      return null;
    }
  };

  const handleAddSuggestedTag = async (tagName: string) => {
    try {
      const { data: { user } } = await mysqlClient.auth.getUser();
      if (!user) return;

      // Check if tag already exists in user's tags
      const existingTag = localAllUserTags.find(
        (tag) => tag.name.toLowerCase().trim() === tagName.toLowerCase().trim()
      );

      let tagToAdd = existingTag;

      if (!existingTag) {
        // Create new tag with a default color
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const { data: newTag, error: tagError } = await mysqlClient
          .from('tags')
          .insert({
            name: tagName.trim(),
            color: randomColor,
            user_id: user.id
          })
          .select()
          .single();

        if (tagError) throw tagError;

        tagToAdd = newTag;
        setLocalAllUserTags(prev => [...prev, newTag]);
      }

      // Check if tag is already linked to the meeting
      const isAlreadyLinked = meetingTags.some(mt => mt.id === tagToAdd.id);
      
      if (isAlreadyLinked) {
        toast({
          title: "برچسب قبلاً اضافه شده",
          description: "این برچسب قبلاً به جلسه اضافه شده است.",
          variant: "destructive",
        });
        return;
      }

      // Link tag to meeting
      const { error: linkError } = await mysqlClient
        .from('meeting_tags')
        .insert({
          meeting_id: meeting.id,
          tag_id: tagToAdd.id
        });

      if (linkError) throw linkError;

      const updatedTags = [...meetingTags, tagToAdd];
      setMeetingTags(updatedTags);
      setMeeting(prev => ({ ...prev, tags: updatedTags }));
      
      toast({
        title: "برچسب اضافه شد",
        description: "برچسب با موفقیت به جلسه اضافه شد.",
      });
    } catch (error: any) {
      console.error('Error adding suggested tag:', error);
      
      if (error?.message?.includes('Relationship already exists') || error?.error === 'Relationship already exists') {
        toast({
          title: "برچسب قبلاً اضافه شده",
          description: "این برچسب قبلاً به جلسه اضافه شده است.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطا",
          description: "افزودن برچسب ناموفق بود. لطفاً دوباره تلاش کنید.",
          variant: "destructive",
        });
      }
    }
  };

  const renderJsonSummary = (jsonData: any) => {
    return (
      <div className="space-y-6 text-right" dir="rtl">
        {/* Subject */}
        {jsonData.Subject && (
          <div>
            <h3 className="text-lg font-bold text-card-foreground mb-2">موضوع:</h3>
            <p className="text-foreground leading-relaxed">{jsonData.Subject}</p>
          </div>
        )}

        {/* Summary */}
        {jsonData.Summary && (
          <div>
            <h3 className="text-lg font-bold text-card-foreground mb-2">خلاصه:</h3>
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">{jsonData.Summary}</p>
          </div>
        )}

        {/* People in meetings */}
        {jsonData["People in meetings"] && jsonData["People in meetings"].length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-card-foreground mb-2">
              افراد حاضر در جلسه:
              <span className="text-sm font-normal text-muted-foreground mr-2">(برای افزودن به برچسب‌ها کلیک کنید)</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {jsonData["People in meetings"].map((person: string, index: number) => {
                // Check if this person is already added as a tag to the meeting
                const isAdded = meetingTags.some(
                  mt => mt.name.toLowerCase().trim() === person.toLowerCase().trim()
                );
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAddSuggestedTag(person)}
                    disabled={isAdded}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                      isAdded
                        ? 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-60'
                        : 'bg-secondary/50 text-foreground border-border hover:bg-secondary hover:border-secondary-foreground/20 cursor-pointer transform hover:scale-105'
                    }`}
                  >
                    {person}
                    {isAdded && ' ✓'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bullet Points */}
        {jsonData["Bolet Points"] && jsonData["Bolet Points"].length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-card-foreground mb-2">نکات کلیدی:</h3>
            <ul className="list-disc list-inside space-y-2">
              {jsonData["Bolet Points"].map((point: string, index: number) => (
                <li key={index} className="text-foreground leading-relaxed">{point}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags from JSON */}
        {jsonData.Tags && jsonData.Tags.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-card-foreground mb-2">
              برچسب‌های پیشنهادی:
              <span className="text-sm font-normal text-muted-foreground mr-2">(برای افزودن کلیک کنید)</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {jsonData.Tags.map((tag: string, index: number) => {
                // Check if this tag is already added to the meeting
                const isAdded = meetingTags.some(
                  mt => mt.name.toLowerCase().trim() === tag.toLowerCase().trim()
                );
                
                return (
                  <button
                    key={index}
                    onClick={() => handleAddSuggestedTag(tag)}
                    disabled={isAdded}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                      isAdded
                        ? 'bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-60'
                        : 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 hover:border-primary/40 cursor-pointer transform hover:scale-105'
                    }`}
                  >
                    {tag}
                    {isAdded && ' ✓'}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate('/home')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            بازگشت به خانه
          </Button>
          <Button 
            onClick={handleAutoGenerateSummary}
            className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-bold tracking-wide"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            درخواست پردازش
          </Button>
        </div>

        {/* Meeting Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {isEditingTitle ? (
                  <div className="space-y-2">
                    <Input
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="text-2xl font-bold"
                      placeholder="عنوان جلسه"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveTitle();
                        } else if (e.key === 'Escape') {
                          handleCancelEditTitle();
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveTitle} size="sm">
                        <Check className="mr-2 h-4 w-4" />
                        ذخیره
                      </Button>
                      <Button onClick={handleCancelEditTitle} variant="outline" size="sm">
                        <X className="mr-2 h-4 w-4" />
                        لغو
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-2xl text-card-foreground">
                      {meeting.title}
                    </CardTitle>
                    <Button onClick={handleEditTitle} variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {meeting.fileName}
                </p>
<p className="text-muted-foreground mt-2">
  {new Date(meeting.date).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  })}
</p>
              </div>
              <Badge className={getStatusColor(statusData?.status || meeting?.status || '')}>
                {statusData?.status || meeting?.status || ''}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Audio Player */}
        {meeting?.audioFiles && meeting.audioFiles.length > 0 ? (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">
                ضبط صوتی ({meeting.audioFiles.length} فایل)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Audio File List */}
              <div className="space-y-2">
                {meeting.audioFiles.map((audioFile, index) => (
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
                          {audioFile.duration ? formatTime(audioFile.duration) : 'نامشخص'} • {audioFile.format || 'صوتی'}
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

              {/* Audio Controls */}
              {meeting.audioFiles[currentAudioIndex] && (
                <div className="space-y-3">
                  <div className="flex items-center justify-center space-x-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousAudio}
                      disabled={currentAudioIndex === 0}
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="default"
                      size="lg"
                      onClick={handlePlayPause}
                      className="rounded-full w-12 h-12"
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextAudio}
                      disabled={currentAudioIndex === meeting.audioFiles.length - 1}
                    >
                      <ArrowLeft className="h-4 w-4 rotate-180" />
                    </Button>
                  </div>

                  {/* Audio Element */}
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

                  {/* Progress Info */}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">ضبط صوتی</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  هیچ فایل صوتی برای این جلسه یافت نشد.
                </p>
                <p className="text-sm text-muted-foreground">
                  ممکن است فایل‌های صوتی هنوز در حال پردازش باشند یا به سیستم جدید منتقل نشده باشند.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CommentText (Note) */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">یادداشت جلسه</CardTitle>
              <div className="flex gap-3">
                {isEditingCommentText ? (
                  <>
                    <Button onClick={handleSaveCommentText} size="sm">
                      <Save className="mr-2 h-4 w-4" />
                      ذخیره
                    </Button>
                    <Button
                      onClick={() => {
                        setIsEditingCommentText(false);
                        setCommentText(originalCommentText);
                      }}
                      variant="outline"
                      size="sm"
                    >
                      <X className="mr-2 h-4 w-4" />
                      لغو
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      const current = meeting?.commentText || commentText || '';
                      setOriginalCommentText(current);
                      setCommentText(current);
                      setIsEditingCommentText(true);
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    ویرایش
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isEditingCommentText ? (
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="یادداشت یا توضیحات جلسه را وارد کنید..."
                className="min-h-[140px] resize-none"
              />
            ) : (
              <div className="text-right whitespace-pre-wrap text-foreground" dir="rtl">
                {(meeting?.commentText || commentText || '').trim() !== '' ? (
                  meeting?.commentText || commentText
                ) : (
                  <span className="text-muted-foreground">یادداشتی ثبت نشده است.</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">خلاصه جلسه</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleSendSummaryToEmail}
                  size="sm"
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50 hover:border-blue-600 transition-all duration-300 font-medium text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2"
                >
                  <Mail className="mr-1 sm:mr-2 h-4 w-4" />
                  Send to email
                </Button>
                {isEditingSummary ? (
                  <>
                    <Button onClick={handleSaveSummary} size="sm" className="w-full sm:w-auto">
                      <Save className="mr-1 sm:mr-2 h-4 w-4" />
                      ذخیره
                    </Button>
                    <Button 
                      onClick={() => {
                        setIsEditingSummary(false);
                        setSummary(originalSummary);
                      }} 
                      variant="outline" 
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <X className="mr-1 sm:mr-2 h-4 w-4" />
                      لغو
                    </Button>
                  </>
                ) : (
                  <Button 
                    onClick={() => {
                      const currentSummary = statusData?.summary || summary;
                      setOriginalSummary(currentSummary);
                      setSummary(currentSummary);
                      setIsEditingSummary(true);
                    }} 
                    variant="outline" 
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <Edit className="mr-1 sm:mr-2 h-4 w-4" />
                    ویرایش
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentSummary = statusData?.summary || summary;
              const jsonData = parseJsonSummary(currentSummary);
              
              if (isEditingSummary) {
                return (
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="خلاصه جلسه را وارد کنید..."
                    className="min-h-[200px] resize-none"
                  />
                );
              }
              
              if (!currentSummary) {
                // If no summary exists, show Textarea
                // User must click Edit button to enter edit mode and see Save button
                return (
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="خلاصه جلسه را وارد کنید..."
                    className="min-h-[200px] resize-none"
                  />
                );
              }
              
              if (jsonData) {
                return renderJsonSummary(jsonData);
              }
              
              return (
                <div className="text-right whitespace-pre-wrap text-foreground" dir="rtl">
                  {currentSummary}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">برچسب‌ها</CardTitle>
              <Button onClick={() => setShowAddTag(true)} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                افزودن برچسب
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current Tags */}
              <div className="flex flex-wrap gap-2">
                {meeting.tags && meeting.tags.length > 0 ? (
                  meeting.tags.map((tag) => (
                    <div
                      key={tag.id}
                      className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border"
                      style={{ 
                        backgroundColor: `${tag.color}20`, 
                        borderColor: tag.color,
                        color: tag.color 
                      }}
                    >
                      {tag.name}
                      <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    هیچ برچسبی برای این جلسه تعریف نشده است.
                  </p>
                )}
              </div>

              {/* Add New Tag */}
              {showAddTag && (
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex gap-3">
                    <Input
                      placeholder="نام برچسب"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="flex-1"
                    />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-12 h-10 rounded border border-border cursor-pointer"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddTag} size="sm">
                      افزودن برچسب
                    </Button>
                    <Button 
                      onClick={() => setShowAddTag(false)} 
                      variant="outline" 
                      size="sm"
                    >
                      لغو
                    </Button>
                  </div>
                </div>
              )}

              {/* Available Tags */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  برچسب‌های موجود:
                </p>
                <div className="flex flex-wrap gap-2">
                  {localAllUserTags
                    .filter(tag => !meetingTags || !meetingTags.some(mt => mt.id === tag.id))
                    .length > 0 ? (
                    localAllUserTags
                      .filter(tag => !meetingTags || !meetingTags.some(mt => mt.id === tag.id))
                      .map((tag) => (
                        <button
                          key={tag.id}
                          onClick={() => handleAddExistingTag(tag)}
                          className="px-3 py-1 rounded-full text-sm font-medium border border-border hover:bg-muted transition-colors"
                          style={{ 
                            backgroundColor: `${tag.color}10`, 
                            borderColor: `${tag.color}40`,
                            color: tag.color 
                          }}
                        >
                          {tag.name}
                        </button>
                      ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      همه برچسب‌های شما به این جلسه اضافه شده‌اند.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete Meeting */}
        <Card className="bg-card border-border border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-card-foreground">حذف جلسه</h3>
                <p className="text-sm text-muted-foreground">
                  این جلسه و ضبط صوتی آن را برای همیشه حذف کنید.
                </p>
              </div>
              <Button 
                variant="destructive" 
                disabled={isDeleting}
                onClick={() => navigate(`/meeting/${meeting.id}/delete?title=${encodeURIComponent(meeting.title)}`)}
              >
                <Trash2 className="ml-2 h-4 w-4" />
                حذف جلسه
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MeetingDetail;