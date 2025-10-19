import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMeetingStore } from '@/store/useMeetingStore';
import { ArrowLeft, Calendar, FileText, Clock, Trash2 } from 'lucide-react';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment-jalaali';

const TagDetail = () => {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate = useNavigate();
  const { tags } = useMeetingStore();
  const { toast } = useToast();
  
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
        // Fetch tag details
        const { data: tagData, error: tagError } = await mysqlClient
          .from('tags')
          .select('*')
          .eq('id', tagId)
          .eq('user_id', user.id)
          .single();

        if (tagError) {
          console.error('Error fetching tag:', tagError);
          throw new Error(tagError.message);
        }

        if (tagData) {
          const tag = {
            id: tagData.id,
            name: tagData.name,
            color: tagData.color,
            userId: tagData.user_id
          };

          // Fetch meetings associated with this tag
          const { data: meetingsData, error: meetingsError } = await mysqlClient
            .from('meeting_tags')
              .select(`
                meetings (
                  id,
                  meeting_date,
                  audio_file_name,
                  title,
                  summary,
                  status,
                  duration
                )
              `)
            .eq('tag_id', tagId);

          if (meetingsError) {
            console.error('Error fetching meetings:', meetingsError);
            throw new Error(meetingsError.message);
          }

          // Transform the data to match the expected format
          const transformedMeetings = meetingsData
            ?.map(item => item.meetings)
            .filter(Boolean)
            .map((meeting: any) => ({
              id: meeting.id,
              fileName: (meeting as any).title || meeting.audio_file_name?.replace(/\.(wav|mp3|m4a)$/i, '') || `Meeting ${new Date(meeting.meeting_date).toLocaleDateString()}`,
              date: new Date(meeting.meeting_date),
              summary: meeting.summary || '',
              status: meeting.status,
              duration: meeting.duration || 0,
              tags: [],
              userId: user.id
            })) || [];

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'On Process':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'Need Review':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'Done':
        return 'bg-success/10 text-success border-success/20';
      default:
        return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          <Button onClick={() => navigate('/home')}>
            بازگشت به خانه
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button onClick={() => navigate('/home')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            بازگشت به خانه
          </Button>
        </div>
      </div>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/home')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <h1 className="text-xl font-bold text-foreground">{tag.name}</h1>
            </div>
          </div>
          
          <Badge variant="secondary" className="text-sm">
            {meetings.length} جلسه
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {meetings.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              هنوز جلسه‌ای نیست
            </h3>
            <p className="text-muted-foreground mb-6">
              ضبط جلسات را شروع کنید و برچسب بزنید تا آنها را اینجا ببینید.
            </p>
            <div className="flex flex-col gap-3 items-center">
              <Button onClick={() => navigate('/record')}>
                ضبط جلسه
              </Button>
              {tagId !== 'untagged' && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteTag}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف برچسب
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              جلسات ({meetings.length})
            </h2>
            
            <div className="space-y-3">
              {meetings
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((meeting) => (
                  <Card
                    key={meeting.id}
                    className="cursor-pointer hover:shadow-medium transition-all duration-300 hover:scale-[1.02] bg-gradient-card border-0"
                    onClick={() => navigate(`/meeting/${meeting.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                           <h3 className="font-semibold text-foreground text-lg">
                             {meeting.fileName}
                           </h3>
                           
                           {meeting.duration > 0 && (
                             <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                               <Clock className="h-3 w-3" />
                               <span>{formatDuration(meeting.duration)}</span>
                             </div>
                           )}
                           
                           <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                             <Calendar className="h-4 w-4" />
                             <span>
                               {moment(meeting.date).format('jYYYY/jMM/jDD')}
                             </span>
                             <span>•</span>
                             <span>
                               {moment(meeting.date).format('HH:mm')}
                             </span>
                           </div>

                          {meeting.summary && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {meeting.summary}
                            </p>
                          )}
                        </div>
                        
                        <div className="ml-4">
                          <Badge className={getStatusColor(meeting.status)}>
                            {meeting.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagDetail;