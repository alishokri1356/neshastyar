import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMeetingStore } from '@/store/useMeetingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Mic2, LogOut, Plus, Calendar, Clock, FileText } from 'lucide-react';

interface DatabaseTag {
  id: string;
  name: string;
  color: string;
  meetingCount: number;
}

interface DatabaseMeeting {
  id: string;
  meeting_date: string;
  summary: string;
  status: string;
  audio_file_name: string;
  title?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  duration?: number;
  [key: string]: any; // Allow additional properties
}

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { toast } = useToast();

  // Fetch tags with auto-refresh every 10 seconds
  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ['tags', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select(`
          id,
          name,
          color,
          meeting_tags (
            meeting_id
          )
        `)
        .eq('user_id', user.id);

      if (tagsError) {
        console.error('Error fetching tags:', tagsError);
        toast({
          title: "خطا در بارگذاری برچسب‌ها",
          description: tagsError.message,
          variant: "destructive",
        });
        throw tagsError;
      }

      // Transform tags data to include meeting count
      return tagsData?.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        meetingCount: tag.meeting_tags?.length || 0
      })) || [];
    },
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Fetch meetings with auto-refresh every 10 seconds
  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['meetings', user?.id, 'recent'],
    queryFn: async () => {
      if (!user) return [];

      const { data: meetingsData, error: meetingsError } = await supabase
        .from('meetings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (meetingsError) {
        console.error('Error fetching meetings:', meetingsError);
        toast({
          title: "خطا در بارگذاری جلسات",
          description: meetingsError.message,
          variant: "destructive",
        });
        throw meetingsError;
      }

      return meetingsData || [];
    },
    enabled: !!user,
    refetchInterval: 10000, // Refresh every 10 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const loading = tagsLoading || meetingsLoading;

  const handleTagClick = (tagId: string) => {
    if (tagId === 'no-tags') {
      navigate('/meetings/untagged');
    } else {
      navigate(`/tag/${tagId}`);
    }
  };

  const handleLogout = async () => {
    await logout();
    // Force navigation to landing page
    window.location.href = '/';
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
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
            <div className="relative">
              <Mic2 className="h-8 w-8 text-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-glow rounded-full animate-pulse" />
            </div>
            <div>
            <h1 className="text-xl font-bold text-foreground">مدیریار</h1>
              <p className="text-xs text-muted-foreground">دستیار هوشمند جلسات</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">حرفه‌ای</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground">
             {user?.email?.split('@')[0]} خوش آمدید
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            برای دسترسی به جلسات قبلی بر روی دکمه زیر کلیک کنید.
          </p>
        </div>


        {/* Previous Meetings Button */}
        <div className="flex justify-center">
          <Button
            variant="default"
            className="group relative px-8 py-6 text-lg bg-gradient-to-r from-primary to-primary-glow hover:from-primary-glow hover:to-primary border-0 shadow-elegant hover:shadow-glow transition-all duration-500 hover:scale-105 overflow-hidden"
            onClick={() => navigate('/tags')}
          >
            <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
            <FileText className="h-5 w-5 ml-3 transition-transform group-hover:scale-110 duration-300" />
            <span className="relative z-10 font-semibold">نمایش لیست جلسات</span>
          </Button>
        </div>

        {/* Recent Meetings */}
        {meetings.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">جلسات اخیر</h3>
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <Card
                  key={meeting.id}
                  className="cursor-pointer hover:shadow-medium transition-all duration-300 bg-gradient-card border-0"
                  onClick={() => navigate(`/meeting/${meeting.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">
                          {(() => {
                            const title = (meeting as any).title || meeting.audio_file_name?.replace('.wav', '').replace('.ogg', '') || 'جلسه';
                            const displayTitle = title && title.length > 30 ? title.substring(0, 27) + '...' : title;
                            return displayTitle;
                          })()}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
  <Calendar className="h-3 w-3 text-muted-foreground" />
  <span className="text-sm text-muted-foreground">
    {new Date(meeting.meeting_date).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })}
  </span>
</div>
                        {meeting.summary && (
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                            {meeting.summary.length > 50 ? meeting.summary.substring(0, 50) + '...' : meeting.summary}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(meeting.status)}>
                        {meeting.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Record Meeting Button */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
          <Button
            variant="record"
            size="lg"
            className="h-16 px-8 rounded-full shadow-2xl"
            onClick={() => navigate('/record')}
          >
            <Mic2 className="h-6 w-6 ml-3" />
            شروع
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;