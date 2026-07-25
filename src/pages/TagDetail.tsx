import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMeetingStore } from '@/store/useMeetingStore';
import { FileText, Trash2, Pencil, MoreVertical } from 'lucide-react';
import { mysqlClient } from '@/lib/mysql-client';
import { normalizeBulletPoints, parseMeetingSummaryJson } from '@/lib/meetingSummary';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment-jalaali';
import AppShell from '@/components/layout/AppShell';
import MeetingCard from '@/components/MeetingCard';
import EmptyState from '@/components/EmptyState';

const TagDetail = () => {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate = useNavigate();
  const { tags } = useMeetingStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Rename dialog state
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  
  // Fetch tag and its meetings from database with auto-refresh
  const { data: tagAndMeetings, isLoading } = useQuery({
    queryKey: ['tag-detail', tagId],
    queryFn: async () => {
      if (!tagId) return null;
      
      const { data: { user } } = await mysqlClient.auth.getUser();
      if (!user) return null;

      // Handle untagged meetings case
      if (tagId === 'untagged') {
        const tag = {
          id: 'untagged',
          name: 'بدون برچسب',
          color: '#6B7280',
          userId: user.id
        };

        // Get all meetings for this user
        const { data: allMeetings, error: meetingsError } = await mysqlClient
          .from('meetings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError);
          throw new Error(meetingsError.message);
        }

        let untaggedMeetings = [];

        if (allMeetings && allMeetings.length > 0) {
          // Get all meeting tags
          const { data: allMeetingTags, error: tagsError } = await mysqlClient
            .from('meeting_tags')
            .select('meeting_id');

          if (tagsError) {
            console.error('Error fetching tagged meetings:', tagsError);
            throw new Error(tagsError.message);
          }

          // Filter out meetings that have tags
          const taggedIds = new Set(allMeetingTags?.map(item => item.meeting_id) || []);
          untaggedMeetings = allMeetings.filter(meeting => !taggedIds.has(meeting.id));
        } else {
          // If no meetings exist, untagged meetings is empty array
          untaggedMeetings = [];
        }

        // Transform the data to match the expected format
        const transformedMeetings = untaggedMeetings.map((meeting: any) => ({
          id: meeting.id,
          fileName: meeting.title || meeting.audio_file_name?.replace(/\.(wav|mp3|m4a)$/i, '') || `Meeting ${new Date(meeting.meeting_date).toLocaleDateString()}`,
          date: new Date(meeting.meeting_date),
          summary: meeting.summary || '',
          status: meeting.status,
          duration: meeting.duration || 0,
          tags: [],
          userId: user.id
        }));

        return { tag, meetings: transformedMeetings };
      } else {
        // Handle regular tag case
        // Fetch tag details using the API endpoint to ensure correct filtering
        const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
        const authHeaders = (mysqlClient as any).getAuthHeaders();
        
        const tagResponse = await fetch(
          `${API_BASE_URL}/tags/${tagId}`,
          {
            headers: {
              ...authHeaders,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!tagResponse.ok) {
          const errorData = await tagResponse.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch tag');
        }

        const tagData = await tagResponse.json();

        if (tagData) {
          const tag = {
            id: tagData.id,
            name: tagData.name,
            color: tagData.color,
            userId: tagData.user_id
          };

          // Fetch meetings associated with this tag using the proper API endpoint
          // This ensures we get meetings filtered by both tag and user
          
          const meetingsResponse = await fetch(
            `${API_BASE_URL}/meeting-tags/tags/${tagId}/meetings`,
            {
              headers: {
                ...authHeaders,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!meetingsResponse.ok) {
            const errorData = await meetingsResponse.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to fetch meetings for tag');
          }

          const meetingsData = await meetingsResponse.json();

          // Transform the data to match the expected format
          const transformedMeetings = Array.isArray(meetingsData)
            ? meetingsData.map((meeting: any) => ({
                id: meeting.id,
                fileName: meeting.title || meeting.audio_file_name?.replace(/\.(wav|mp3|m4a)$/i, '') || `Meeting ${new Date(meeting.meeting_date).toLocaleDateString()}`,
                date: new Date(meeting.meeting_date),
                summary: meeting.summary || '',
                status: meeting.status,
                duration: meeting.duration || 0,
                tags: [],
                userId: user.id
              }))
            : [];

          return { tag, meetings: transformedMeetings };
        }
      }
      return null;
    },
    refetchInterval: 30000, // Reduce to 30 seconds
    refetchIntervalInBackground: false, // Disable background refetching
    refetchOnWindowFocus: false, // Disable refetch on window focus
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
    enabled: !!tagId,
  });

  const tag = (tagAndMeetings as any)?.tag || null;
  const meetings = (tagAndMeetings as any)?.meetings || [];

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return undefined;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSummaryBullets = (summary: string): string[] => {
    if (!summary) return [];
    const parsed = parseMeetingSummaryJson(summary);
    if (parsed) {
      const bullets = normalizeBulletPoints(parsed['Bolet Points'] ?? parsed['Bullet Points']);
      if (bullets.length > 0) return bullets;
      if (typeof parsed.Summary === 'string') return [parsed.Summary];
    }
    return summary.split('\n').filter(Boolean);
  };

  const handleOpenRenameDialog = () => {
    if (!tag) return;
    setNameInput(tag.name);
    setRenameDialogOpen(true);
  };

  const handleRenameDialogChange = (open: boolean) => {
    if (!open && isRenaming) {
      return;
    }
    setRenameDialogOpen(open);
    if (!open) {
      setNameInput('');
    }
  };

  const handleRenameTag = async () => {
    if (!tagId || !tag) return;

    const trimmedName = nameInput.trim();

    if (!trimmedName) {
      toast({
        title: "نام جدید وارد نشده است",
        description: "لطفاً یک نام معتبر برای برچسب وارد کنید.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedName === tag.name) {
      toast({
        title: "نام بدون تغییر است",
        description: "برای بروزرسانی، نام جدیدی وارد کنید.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsRenaming(true);
      const { data, error } = await mysqlClient.tags.rename({
        id: tagId,
        newName: trimmedName,
      });

      if (error) {
        const message =
          typeof error === "string"
            ? error
            : error?.message || error?.error || "خطایی در بروزرسانی نام برچسب رخ داد.";
        throw new Error(message);
      }

      toast({
        title: "نام برچسب بروزرسانی شد",
        description: `${tag.name} به ${trimmedName} تغییر یافت.`,
      });

      handleRenameDialogChange(false);
      
      // Invalidate and refetch the tag data
      await queryClient.invalidateQueries({ queryKey: ['tag-detail', tagId] });
    } catch (error: any) {
      toast({
        title: "خطا در بروزرسانی برچسب",
        description: error?.message || "امکان بروزرسانی نام برچسب وجود ندارد.",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!tagId) return;
    
    try {
      const { data: { user } } = await mysqlClient.auth.getUser();
      if (!user) return;

      const { error } = await mysqlClient
        .from('tags')
        .delete()
        .eq('id', tagId);

      if (error) {
        toast({
          title: "خطا در حذف برچسب",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "برچسب حذف شد",
        description: "برچسب با موفقیت حذف شد.",
      });

      navigate('/tags');
    } catch (error) {
      console.error('Error deleting tag:', error);
      toast({
        title: "خطا در حذف برچسب",
        description: "مشکلی در حذف برچسب پیش آمد.",
        variant: "destructive",
      });
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری جزئیات برچسب...</p>
        </div>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">برچسب پیدا نشد</h2>
          <Button onClick={() => navigate('/tags')}>
            بازگشت به لیست برچسب‌ها
          </Button>
        </div>
      </div>
    );
  }

  const headerActions =
    tagId !== 'untagged' ? (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="گزینه‌های برچسب">
            <MoreVertical className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuItem onClick={handleOpenRenameDialog}>
            <Pencil className="me-2 h-4 w-4" />
            تغییر نام
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeleteTag} className="text-destructive focus:text-destructive">
            <Trash2 className="me-2 h-4 w-4" />
            حذف برچسب
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ) : undefined;

  return (
    <AppShell
      title={tag.name}
      subtitle={`${meetings.length} جلسه`}
      onBack="/tags"
      clickableBack
      actions={headerActions}
    >
      {meetings.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="هنوز جلسه‌ای نیست"
          description="ضبط جلسات را شروع کنید و برچسب بزنید تا آنها را اینجا ببینید."
          action={
            <Button variant="primary" onClick={() => navigate('/record')}>
              ضبط جلسه
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {[...meetings]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((meeting) => (
              <MeetingCard
                key={meeting.id}
                title={meeting.fileName}
                dateText={`${moment(meeting.date).format('jYYYY/jMM/jDD')} - ${moment(meeting.date).format('HH:mm')}`}
                durationText={formatDuration(meeting.duration)}
                status={meeting.status}
                bulletPoints={getSummaryBullets(meeting.summary)}
                onClick={() => navigate(`/meeting/${meeting.id}`)}
              />
            ))}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={handleRenameDialogChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>تغییر نام برچسب</DialogTitle>
            <DialogDescription>
              نام جدید برچسب را وارد کنید تا تمامی جلسات مرتبط با آن بروزرسانی شوند.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="tag-new-name">نام جدید</Label>
            <Input
              id="tag-new-name"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              disabled={isRenaming}
              placeholder="نام جدید را وارد کنید"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isRenaming) {
                  handleRenameTag();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleRenameDialogChange(false)} disabled={isRenaming}>
              انصراف
            </Button>
            <Button onClick={handleRenameTag} disabled={isRenaming}>
              {isRenaming ? "در حال بروزرسانی..." : "ذخیره تغییرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default TagDetail;