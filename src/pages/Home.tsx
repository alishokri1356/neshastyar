import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMeetingStore } from '@/store/useMeetingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
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
}

const Home = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { toast } = useToast();
  const [tags, setTags] = useState<DatabaseTag[]>([]);
  const [meetings, setMeetings] = useState<DatabaseMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch data from database
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user) return;

        // Fetch tags with meeting counts
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
            title: "Error loading tags",
            description: tagsError.message,
            variant: "destructive",
          });
          return;
        }

        // Transform tags data to include meeting count
        const formattedTags = tagsData?.map(tag => ({
          id: tag.id,
          name: tag.name,
          color: tag.color,
          meetingCount: tag.meeting_tags?.length || 0
        })) || [];

        setTags(formattedTags);

        // Fetch recent meetings
        const { data: meetingsData, error: meetingsError } = await supabase
          .from('meetings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError);
          toast({
            title: "Error loading meetings",
            description: meetingsError.message,
            variant: "destructive",
          });
          return;
        }

        setMeetings(meetingsData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, toast]);

  const handleTagClick = (tagId: string) => {
    navigate(`/tag/${tagId}`);
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
            خوش برگشتید، {user?.email?.split('@')[0]}!
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            جلسات خود را با خلاصه‌سازی هوشمند و سازماندهی باهوش تبدیل کنید. 
            ضبط کنید، برچسب بزنید و هرگز مباحث مهم را از دست ندهید.
          </p>
        </div>


        {/* Tags Dropdown */}
        {tags.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">انتخاب برچسب</h3>
            <Select onValueChange={handleTagClick}>
              <SelectTrigger className="w-full max-w-md bg-gradient-card border-0">
                <SelectValue placeholder="برچسب خود را انتخاب کنید..." />
              </SelectTrigger>
              <SelectContent className="bg-popover border border-border">
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                      <Badge variant="secondary" className="text-xs ml-auto">
                        {tag.meetingCount}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

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
                            const title = meeting.title || meeting.audio_file_name?.replace('.wav', '').replace('.ogg', '') || 'جلسه';
                            const displayTitle = title && title.length > 30 ? title.substring(0, 27) + '...' : title;
                            return displayTitle;
                          })()}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {new Date(meeting.meeting_date).toLocaleDateString()}
                          </span>
                        </div>
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
            ضبط جلسه
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;