import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment-jalaali';
import AppShell from '@/components/layout/AppShell';
import MeetingCard from '@/components/MeetingCard';
import EmptyState from '@/components/EmptyState';

const UntaggedMeetings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch meetings without any tags from database
  useEffect(() => {
    const fetchUntaggedMeetings = async () => {
      try {
        const { data: { user } } = await mysqlClient.auth.getUser();
        if (!user) return;

        // Get all meetings for this user
        const { data: allMeetings, error: meetingsError } = await mysqlClient
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

        let untaggedMeetings = [];

        if (allMeetings && allMeetings.length > 0) {
          // Get all meeting tags
          const { data: allMeetingTags, error: tagsError } = await mysqlClient
            .from('meeting_tags')
            .select('meeting_id');

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

        setMeetings(transformedMeetings);
      } catch (error) {
        console.error('Error fetching untagged meetings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUntaggedMeetings();
  }, [toast]);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return undefined;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSummaryBullets = (summary: string): string[] => {
    if (!summary) return [];
    try {
      const parsed = JSON.parse(summary);
      if (Array.isArray(parsed?.['Bolet Points'])) return parsed['Bolet Points'] as string[];
      if (typeof parsed?.Summary === 'string') return [parsed.Summary];
    } catch {
      // not JSON
    }
    return summary.split('\n').filter(Boolean);
  };

  if (isLoading) {
    return (
      <AppShell title="جلسات بدون برچسب" onBack="/home">
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">در حال بارگذاری جلسات بدون برچسب...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="جلسات بدون برچسب" subtitle={`${meetings.length} جلسه`} onBack="/home">
      {meetings.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="هیچ جلسه بدون برچسبی یافت نشد"
          description="تمام جلسات شما دارای برچسب هستند یا هنوز جلسه‌ای ضبط نکرده‌اید."
          action={
            <Button variant="primary" onClick={() => navigate('/record')}>
              ضبط جلسه جدید
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
    </AppShell>
  );
};

export default UntaggedMeetings;