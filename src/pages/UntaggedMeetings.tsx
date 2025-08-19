import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, FileText, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const UntaggedMeetings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch meetings without any tags from database
  useEffect(() => {
    const fetchUntaggedMeetings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get all meetings for this user
        const { data: allMeetings, error: meetingsError } = await supabase
          .from('meetings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError);
          toast({
            title: "خطا در بارگذاری جلسات",
            description: meetingsError.message,
            variant: "destructive",
          });
          return;
        }

        // Get all meeting IDs that have tags
        const { data: taggedMeetingIds, error: tagsError } = await supabase
          .from('meeting_tags')
          .select('meeting_id')
          .in('meeting_id', allMeetings?.map(m => m.id) || []);

        if (tagsError) {
          console.error('Error fetching tagged meetings:', tagsError);
          toast({
            title: "خطا در بارگذاری جلسات برچسب‌دار",
            description: tagsError.message,
            variant: "destructive",
          });
          return;
        }

        // Filter out meetings that have tags
        const taggedIds = new Set(taggedMeetingIds?.map(item => item.meeting_id) || []);
        const untaggedMeetings = allMeetings?.filter(meeting => !taggedIds.has(meeting.id)) || [];

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

        setMeetings(transformedMeetings);
      } catch (error) {
        console.error('Error fetching untagged meetings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUntaggedMeetings();
  }, [toast]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری جلسات بدون برچسب...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
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
              <div className="w-4 h-4 rounded-full bg-muted-foreground/30 border border-muted-foreground/50" />
              <h1 className="text-xl font-bold text-foreground">جلسات بدون برچسب</h1>
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
              هیچ جلسه بدون برچسبی یافت نشد
            </h3>
            <p className="text-muted-foreground mb-6">
              تمام جلسات شما دارای برچسب هستند یا هنوز جلسه‌ای ضبط نکرده‌اید.
            </p>
            <Button onClick={() => navigate('/record')}>
              ضبط جلسه جدید
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              جلسات بدون برچسب ({meetings.length})
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
                {new Date(meeting.date).toLocaleDateString('fa-IR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <span>•</span>
              <span>
                {new Date(meeting.date).toLocaleTimeString('fa-IR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
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

export default UntaggedMeetings;