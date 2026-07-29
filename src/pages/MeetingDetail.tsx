import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMeetingStore } from '@/store/useMeetingStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Save, Plus, X, Sparkles, Edit, Check, Mail, Settings, MoreVertical, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AppShell from '@/components/layout/AppShell';
import { getStatusBadgeClass } from '@/lib/status';

import { mysqlClient } from '@/lib/mysql-client';
import {
  type EditableMeetingSummary,
  parseMeetingSummaryJson,
  jsonToEditableSummary,
  editableSummaryToJson,
  linesToList,
  emptyEditableSummary,
  normalizeBulletPoints,
  formatSummaryForClipboard,
  formatEditableSummaryForClipboard,
} from '@/lib/meetingSummary';

const nameMatchesSearch = (name: string, query: string) => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return name.toLowerCase().includes(normalizedQuery);
};

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
  const [showAddParticipant, setShowAddParticipant] = useState(false);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [linkedParticipants, setLinkedParticipants] = useState<any[]>([]);
  const [localAllUserParticipants, setLocalAllUserParticipants] = useState<any[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryEditMode, setSummaryEditMode] = useState<'plain' | 'structured'>('plain');
  const [editedSummaryFields, setEditedSummaryFields] = useState<EditableMeetingSummary>(
    emptyEditableSummary()
  );

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
        .select('*')
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

        const transformedMeeting = {
          id: meetingData.id,
          title: meetingData.title || `Meeting ${new Date(meetingData.meeting_date).toLocaleDateString()}`,
          date: new Date(meetingData.meeting_date),
          summary: meetingData.summary || '',
          status: meetingData.status,
          tags: tags,
          userId: meetingData.user_id,
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
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: meetingParticipants = [] } = useQuery({
    queryKey: ['meeting-participants', meetingId],
    queryFn: async () => {
      if (!meetingId) return [];

      const { data, error } = await mysqlClient.meetingParticipants.getForMeeting(meetingId);
      if (error) {
        console.error('Error fetching meeting participants:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!meetingId,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allUserParticipants = [] } = useQuery({
    queryKey: ['user-participants'],
    queryFn: async () => {
      const { data, error } = await mysqlClient.participants.list();
      if (error) {
        console.error('Error fetching user participants:', error);
        return [];
      }
      return data?.participants ?? [];
    },
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
  });

  // Update local states when data changes
  useEffect(() => {
    if (meetingData) {
      setMeeting(meetingData);
      setMeetingTags(meetingData.tags);
      setSummary(meetingData.summary);
      setEditedTitle(meetingData.title);
    }
  }, [meetingData]);

  useEffect(() => {
    setLocalAllUserTags(allUserTags);
  }, [allUserTags]);

  useEffect(() => {
    setLinkedParticipants(meetingParticipants);
  }, [meetingParticipants]);

  useEffect(() => {
    setLocalAllUserParticipants(allUserParticipants);
  }, [allUserParticipants]);

  const participantSearchQuery = newParticipantName.trim();

  const matchingParticipants = useMemo(() => {
    if (!participantSearchQuery) {
      return [];
    }

    return localAllUserParticipants.filter(
      (participant) =>
        !linkedParticipants.some((linked) => linked.id === participant.id) &&
        nameMatchesSearch(participant.name, participantSearchQuery),
    );
  }, [localAllUserParticipants, linkedParticipants, participantSearchQuery]);

  const tagSearchQuery = newTagName.trim();

  const matchingTags = useMemo(() => {
    if (!tagSearchQuery) {
      return [];
    }

    return localAllUserTags.filter(
      (tag) =>
        !meetingTags.some((linked) => linked.id === tag.id) &&
        nameMatchesSearch(tag.name, tagSearchQuery),
    );
  }, [localAllUserTags, meetingTags, tagSearchQuery]);

  // Update summary when status data changes (for auto-refresh)
  // Don't update if user is currently editing
  useEffect(() => {
    if (statusData?.summary && statusData.summary !== summary && !isEditingSummary) {
      setSummary(statusData.summary);
    }
  }, [statusData?.summary, isEditingSummary]);

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
              بازگشت به خانه
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveSummary = async () => {
    try {
      const summaryToSave =
        summaryEditMode === 'structured'
          ? editableSummaryToJson(
              editedSummaryFields,
              parseMeetingSummaryJson(originalSummary),
            )
          : summary;

      const { error } = await mysqlClient
        .from('meetings')
        .update({ summary: summaryToSave })
        .eq('id', meeting.id);

      if (error) throw error;

      setSummary(summaryToSave);
      setMeeting((prev) => ({ ...prev, summary: summaryToSave }));
      setIsEditingSummary(false);
      setSummaryEditMode('plain');
      
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

        refreshMeetingSummary();
        
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

  const refreshMeetingParticipants = async (participants?: any[]) => {
    if (participants) {
      setLinkedParticipants(participants);
    } else {
      queryClient.invalidateQueries({ queryKey: ['meeting-participants', meetingId] });
    }
    queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
    queryClient.invalidateQueries({ queryKey: ['meeting-status', meetingId] });
    queryClient.invalidateQueries({ queryKey: ['user-participants'] });
  };

  const refreshMeetingSummary = () => {
    queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
    queryClient.invalidateQueries({ queryKey: ['meeting-status', meetingId] });
  };

  const handleAddParticipant = async () => {
    const trimmedName = newParticipantName.trim();
    if (!trimmedName) return;

    try {
      const { data, error } = await mysqlClient.meetingParticipants.add({
        meetingId: meeting.id,
        name: trimmedName,
      });

      if (error) throw error;

      const participants = data?.participants ?? [];
      await refreshMeetingParticipants(participants);

      const added = participants.find(
        (p: { name: string }) => p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (added && !localAllUserParticipants.some((p) => p.id === added.id)) {
        setLocalAllUserParticipants((prev) => [...prev, added]);
      }

      setNewParticipantName('');
      setShowAddParticipant(false);

      toast({
        title: "شرکت‌کننده اضافه شد",
        description: "شرکت‌کننده جدید به جلسه اضافه شد.",
      });
    } catch (error: any) {
      console.error('Error adding participant:', error);
      if (error?.message?.includes('already exists') || error?.error === 'Relationship already exists') {
        toast({
          title: "قبلاً اضافه شده",
          description: "این شرکت‌کننده قبلاً به جلسه اضافه شده است.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطا",
          description: "افزودن شرکت‌کننده ناموفق بود. لطفاً دوباره تلاش کنید.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    try {
      const { data, error } = await mysqlClient.meetingParticipants.remove({
        meetingId: meeting.id,
        participantId,
      });

      if (error) throw error;

      const participants = data?.participants ?? linkedParticipants.filter((p) => p.id !== participantId);
      await refreshMeetingParticipants(participants);

      toast({
        title: "شرکت‌کننده حذف شد",
        description: "شرکت‌کننده از جلسه حذف شد.",
      });
    } catch (error) {
      console.error('Error removing participant:', error);
      toast({
        title: "خطا",
        description: "حذف شرکت‌کننده ناموفق بود. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    }
  };

  const handleAddExistingParticipant = async (participant: { id: string; name: string }) => {
    const alreadyLinked = linkedParticipants.some((p) => p.id === participant.id);
    if (alreadyLinked) return;

    try {
      const { data, error } = await mysqlClient.meetingParticipants.add({
        meetingId: meeting.id,
        participantId: participant.id,
      });

      if (error) throw error;

      await refreshMeetingParticipants(data?.participants);

      toast({
        title: "شرکت‌کننده اضافه شد",
        description: "شرکت‌کننده به جلسه اضافه شد.",
      });
    } catch (error: any) {
      console.error('Error adding participant:', error);
      if (error?.message?.includes('already exists') || error?.error === 'Relationship already exists') {
        toast({
          title: "قبلاً اضافه شده",
          description: "این شرکت‌کننده قبلاً به جلسه اضافه شده است.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطا",
          description: "افزودن شرکت‌کننده ناموفق بود. لطفاً دوباره تلاش کنید.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddSuggestedParticipant = async (personName: string) => {
    const trimmedName = personName.trim();
    if (!trimmedName) return;

    const existing = localAllUserParticipants.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (existing) {
      await handleAddExistingParticipant(existing);
      return;
    }

    try {
      const { data, error } = await mysqlClient.meetingParticipants.add({
        meetingId: meeting.id,
        name: trimmedName,
      });

      if (error) throw error;

      await refreshMeetingParticipants(data?.participants);

      const added = (data?.participants ?? []).find(
        (p: { name: string }) => p.name.toLowerCase() === trimmedName.toLowerCase()
      );
      if (added) {
        setLocalAllUserParticipants((prev) =>
          prev.some((p) => p.id === added.id) ? prev : [...prev, added]
        );
      }

      toast({
        title: "شرکت‌کننده اضافه شد",
        description: "شرکت‌کننده با موفقیت به جلسه اضافه شد.",
      });
    } catch (error: any) {
      console.error('Error adding suggested participant:', error);
      if (error?.message?.includes('already exists') || error?.error === 'Relationship already exists') {
        toast({
          title: "قبلاً اضافه شده",
          description: "این شرکت‌کننده قبلاً به جلسه اضافه شده است.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطا",
          description: "افزودن شرکت‌کننده ناموفق بود. لطفاً دوباره تلاش کنید.",
          variant: "destructive",
        });
      }
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

        refreshMeetingSummary();
        
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
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/meetings/${meeting.id}/analyze`,
        {
          method: 'POST',
          headers: {
            ...mysqlClient.getAuthHeaders(),
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to trigger analysis');
      }

      setMeeting((prev) => ({ ...prev, status: 'ارسال درخواست پردازش' }));

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
      const apiBase = import.meta.env.VITE_API_URL || 'https://neshastyar.com/api';
      const origin = apiBase.replace(/\/api\/?$/, '');
      const webhookUrl = `${origin}/sendmail/${meeting.id}`;
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

  const handleCancelEditSummary = () => {
    setIsEditingSummary(false);
    setSummaryEditMode('plain');
    setSummary(originalSummary);
    setEditedSummaryFields(emptyEditableSummary());
  };

  const handleStartEditSummary = () => {
    const currentSummary = statusData?.summary || summary;
    const jsonData = parseMeetingSummaryJson(currentSummary);

    setOriginalSummary(currentSummary);

    if (jsonData) {
      setEditedSummaryFields(jsonToEditableSummary(jsonData));
      setSummaryEditMode('structured');
    } else {
      setSummary(currentSummary);
      setSummaryEditMode('plain');
    }

    setIsEditingSummary(true);
  };

  const handleCopySummary = async () => {
    let text: string | null;

    if (isEditingSummary) {
      if (summaryEditMode === 'structured') {
        text = formatEditableSummaryForClipboard(editedSummaryFields);
      } else {
        text = summary.trim() ? `خلاصه:\n${summary.trim()}` : null;
      }
    } else {
      const currentSummary = statusData?.summary || summary;
      text = formatSummaryForClipboard(currentSummary);
    }

    if (!text) {
      toast({
        title: 'خطا',
        description: 'خلاصه‌ای برای کپی وجود ندارد.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'کپی شد',
        description: 'موضوع، خلاصه و نکات کلیدی در کلیپ‌بورد کپی شد.',
      });
    } catch (error) {
      console.error('Error copying summary:', error);
      toast({
        title: 'خطا',
        description: 'کپی به کلیپ‌بورد با خطا مواجه شد.',
        variant: 'destructive',
      });
    }
  };

  // Helper function to check if summary is JSON
  const parseJsonSummary = (summaryText: string) => parseMeetingSummaryJson(summaryText);

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

      refreshMeetingSummary();
      
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
    const bulletPoints = normalizeBulletPoints(
      jsonData['Bolet Points'] ?? jsonData['Bullet Points'],
    );

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

        {/* Bullet Points */}
        {bulletPoints.length > 0 && (
          <div>
            <h3 className="text-lg font-bold text-card-foreground mb-2">نکات کلیدی:</h3>
            <ul className="list-disc list-inside space-y-2">
              {bulletPoints.map((point, index) => (
                <li key={index} className="text-foreground leading-relaxed">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    );
  };

  const currentStatus = statusData?.status || meeting?.status || '';
  const isProcessed = currentStatus === 'پردازش شده';

  const headerActions = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="گزینه‌ها">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem onClick={() => navigate(`/meeting/${meetingId}/meeting_details_options`)}>
          <Settings className="me-2 h-4 w-4" />
          گزینه‌های جلسه
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSendSummaryToEmail}>
          <Mail className="me-2 h-4 w-4" />
          ارسال به ایمیل
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AppShell title={meeting.title} onBack={true} clickableBack actions={headerActions}>
      <div className="space-y-5">
        {/* Process request CTA */}
        <div className="space-y-2">
          {isProcessed ? (
            <Button
              onClick={handleSendSummaryToEmail}
              className="w-full border-blue-500 bg-white font-bold tracking-wide text-blue-600 shadow-lg transition-all duration-300 hover:border-blue-600 hover:bg-blue-50 hover:shadow-xl"
              variant="outline"
            >
              <Mail className="h-4 w-4" />
              ارسال به ایمیل
            </Button>
          ) : (
            <Button
              onClick={handleAutoGenerateSummary}
              className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 font-bold tracking-wide text-white shadow-lg transition-all duration-300 hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 hover:shadow-xl"
            >
              <Sparkles className="h-4 w-4" />
              درخواست پردازش
            </Button>
          )}
        </div>

        {/* Meeting Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
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
                        <Check className="h-4 w-4" />
                        ذخیره
                      </Button>
                      <Button onClick={handleCancelEditTitle} variant="outline" size="sm">
                        <X className="h-4 w-4" />
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
              <Badge
                variant="outline"
                className={`shrink-0 ${getStatusBadgeClass(currentStatus)}`}
              >
                {currentStatus}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {isProcessed && (
          <Button
            onClick={handleAutoGenerateSummary}
            className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 font-bold tracking-wide text-white shadow-lg transition-all duration-300 hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 hover:shadow-xl"
          >
            <Sparkles className="h-4 w-4" />
            درخواست پردازش مجدد
          </Button>
        )}

        {/* Summary */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg text-card-foreground">خلاصه جلسه</CardTitle>
              <div className="flex flex-col gap-2 xs:flex-row">
                {isEditingSummary ? (
                  <>
                    <Button onClick={handleSaveSummary} size="sm" className="w-full sm:w-auto">
                      <Save className="h-4 w-4" />
                      ذخیره
                    </Button>
                    <Button
                      onClick={handleCancelEditSummary}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <X className="h-4 w-4" />
                      لغو
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleCopySummary}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Copy className="h-4 w-4" />
                      کپی
                    </Button>
                    <Button
                      onClick={handleStartEditSummary}
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Edit className="h-4 w-4" />
                      ویرایش
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentSummary = statusData?.summary || summary;
              const jsonData = parseJsonSummary(currentSummary);
              
              if (isEditingSummary) {
                if (summaryEditMode === 'structured') {
                  return (
                    <div className="space-y-4 text-right" dir="rtl">
                      <div className="space-y-2">
                        <Label htmlFor="summary-subject">موضوع</Label>
                        <Input
                          id="summary-subject"
                          value={editedSummaryFields.subject}
                          onChange={(e) =>
                            setEditedSummaryFields((prev) => ({
                              ...prev,
                              subject: e.target.value,
                            }))
                          }
                          placeholder="موضوع جلسه"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="summary-text">خلاصه</Label>
                        <Textarea
                          id="summary-text"
                          value={editedSummaryFields.summaryText}
                          onChange={(e) =>
                            setEditedSummaryFields((prev) => ({
                              ...prev,
                              summaryText: e.target.value,
                            }))
                          }
                          placeholder="خلاصه جلسه را وارد کنید..."
                          className="min-h-[200px] resize-y"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="summary-people">افراد پیشنهادی (هر نام در یک خط)</Label>
                        <Textarea
                          id="summary-people"
                          value={editedSummaryFields.people.join('\n')}
                          onChange={(e) =>
                            setEditedSummaryFields((prev) => ({
                              ...prev,
                              people: linesToList(e.target.value),
                            }))
                          }
                          placeholder="هر نام را در یک خط جداگانه بنویسید"
                          className="min-h-[100px] resize-y"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="summary-bullets">نکات کلیدی (هر مورد در یک خط)</Label>
                        <Textarea
                          id="summary-bullets"
                          value={editedSummaryFields.bulletPoints.join('\n')}
                          onChange={(e) =>
                            setEditedSummaryFields((prev) => ({
                              ...prev,
                              bulletPoints: linesToList(e.target.value),
                            }))
                          }
                          placeholder="هر نکته را در یک خط جداگانه بنویسید"
                          className="min-h-[120px] resize-y"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="summary-tags">برچسب‌های پیشنهادی (هر مورد در یک خط)</Label>
                        <Textarea
                          id="summary-tags"
                          value={editedSummaryFields.tags.join('\n')}
                          onChange={(e) =>
                            setEditedSummaryFields((prev) => ({
                              ...prev,
                              tags: linesToList(e.target.value),
                            }))
                          }
                          placeholder="هر برچسب را در یک خط جداگانه بنویسید"
                          className="min-h-[80px] resize-y"
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="خلاصه جلسه را وارد کنید..."
                    className="min-h-[200px] resize-y"
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

        {/* Participants */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">افراد حاضر در جلسه</CardTitle>
              <Button
                onClick={() => {
                  setShowAddParticipant(true);
                  setNewParticipantName('');
                }}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                افزودن شرکت‌کننده
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {linkedParticipants.length > 0 ? (
                  linkedParticipants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border bg-blue-50 border-blue-400 text-blue-900"
                    >
                      {participant.name}
                      <button
                        onClick={() => handleRemoveParticipant(participant.id)}
                        className="hover:opacity-70"
                        aria-label={`حذف ${participant.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    هیچ شرکت‌کننده‌ای برای این جلسه ثبت نشده است.
                  </p>
                )}
              </div>

              {(() => {
                const currentSummary = statusData?.summary || summary;
                const jsonData = parseJsonSummary(currentSummary);
                const suggestedPeople =
                  jsonData?.['People in meetings'] && Array.isArray(jsonData['People in meetings'])
                    ? jsonData['People in meetings']
                    : [];
                const unassignedSuggestedPeople = suggestedPeople.filter(
                  (person: string) =>
                    !linkedParticipants.some(
                      (p) => p.name.toLowerCase().trim() === person.toLowerCase().trim()
                    )
                );

                if (unassignedSuggestedPeople.length === 0) return null;

                return (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      شرکت‌کنندگان پیشنهادی:
                      <span className="text-xs font-normal me-2">(برای افزودن کلیک کنید)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {unassignedSuggestedPeople.map((person: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => handleAddSuggestedParticipant(person)}
                          className="px-3 py-1 rounded-full text-sm font-medium border bg-yellow-100 border-yellow-400 text-yellow-900 hover:bg-yellow-200 hover:border-yellow-500 cursor-pointer transition-all transform hover:scale-105"
                        >
                          {person}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {showAddParticipant && (
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <Input
                    placeholder="نام شرکت‌کننده"
                    value={newParticipantName}
                    onChange={(e) => setNewParticipantName(e.target.value)}
                    className="flex-1"
                  />

                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      شرکت‌کنندگان موجود:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {participantSearchQuery.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          برای جستجو، نام شرکت‌کننده را در کادر بالا تایپ کنید.
                        </p>
                      ) : matchingParticipants.length > 0 ? (
                        matchingParticipants.map((participant) => (
                          <button
                            key={participant.id}
                            onClick={() => {
                              handleAddExistingParticipant(participant);
                              setNewParticipantName('');
                            }}
                            className="px-3 py-1 rounded-full text-sm font-medium border border-border hover:bg-muted transition-colors bg-muted/40"
                          >
                            {participant.name}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          شرکت‌کننده‌ای با این نام پیدا نشد. با دکمه «افزودن شرکت‌کننده» می‌توانید فرد جدید بسازید.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleAddParticipant} size="sm">
                      افزودن شرکت‌کننده
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddParticipant(false);
                        setNewParticipantName('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      لغو
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">برچسب‌ها</CardTitle>
              <Button
                onClick={() => {
                  setShowAddTag(true);
                  setNewTagName('');
                }}
                size="sm"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
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
                      className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border bg-green-100 border-green-500 text-green-800"
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

              {/* Suggested Tags from Summary */}
              {(() => {
                const currentSummary = statusData?.summary || summary;
                const jsonData = parseJsonSummary(currentSummary);
                const suggestedTags = jsonData?.Tags && Array.isArray(jsonData.Tags) ? jsonData.Tags : [];
                const unassignedSuggestedTags = suggestedTags.filter(
                  (tag: string) => !meetingTags.some(
                    mt => mt.name.toLowerCase().trim() === tag.toLowerCase().trim()
                  )
                );

                if (unassignedSuggestedTags.length === 0) return null;

                return (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      برچسب‌های پیشنهادی:
                      <span className="text-xs font-normal me-2">(برای افزودن کلیک کنید)</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {unassignedSuggestedTags.map((tag: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => handleAddSuggestedTag(tag)}
                          className="px-3 py-1 rounded-full text-sm font-medium border bg-yellow-100 border-yellow-400 text-yellow-900 hover:bg-yellow-200 hover:border-yellow-500 cursor-pointer transition-all transform hover:scale-105"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}

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

                  {/* Available Tags */}
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      برچسب‌های موجود:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {tagSearchQuery.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          برای جستجو، نام برچسب را در کادر بالا تایپ کنید.
                        </p>
                      ) : matchingTags.length > 0 ? (
                        matchingTags.map((tag) => (
                          <button
                            key={tag.id}
                            onClick={() => {
                              handleAddExistingTag(tag);
                              setNewTagName('');
                            }}
                            className="px-3 py-1 rounded-full text-sm font-medium border border-border hover:bg-muted transition-colors"
                            style={{
                              backgroundColor: `${tag.color}10`,
                              borderColor: `${tag.color}40`,
                              color: tag.color,
                            }}
                          >
                            {tag.name}
                          </button>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          برچسبی با این نام پیدا نشد. با دکمه «افزودن برچسب» می‌توانید برچسب جدید بسازید.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleAddTag} size="sm">
                      افزودن برچسب
                    </Button>
                    <Button
                      onClick={() => {
                        setShowAddTag(false);
                        setNewTagName('');
                      }}
                      variant="outline"
                      size="sm"
                    >
                      لغو
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export default MeetingDetail;