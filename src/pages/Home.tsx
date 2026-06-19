import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Mic2, Calendar, ChevronLeft } from 'lucide-react';
import moment from 'moment-jalaali';
import AppShell from '@/components/layout/AppShell';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

interface DatabaseAudioFile {
  id: string;
  meeting_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  duration?: number;
  format?: string;
  upload_order: number;
  created_at: string;
  updated_at: string;
}

interface DatabaseMeeting {
  id: string;
  meeting_date: string;
  summary: string;
  status: string;
  title?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  audioFiles?: DatabaseAudioFile[];
  [key: string]: any; // Allow additional properties
}

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  
  // Persian day names and month names
  const persianDays = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه', 'شنبه'];
  const persianMonths = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
  ];

  // Format dates and times using Persian (Jalali) calendar
  const formatPersianDate = (date: Date, options?: Intl.DateTimeFormatOptions) => {
    try {
      // Use moment-jalaali for proper Persian calendar support
      const jMoment = moment(date);
      
      if (options?.weekday === 'short' && options?.month === 'short' && options?.day === 'numeric') {
        // Format like "سه‌شنبه، 17 مهر"
        const weekdayIndex = jMoment.day(); // 0 = Sunday, 1 = Monday, etc.
        const weekday = persianDays[weekdayIndex];
        const monthIndex = jMoment.jMonth(); // 0 = Farvardin, 1 = Ordibehesht, etc.
        const month = persianMonths[monthIndex];
        const day = jMoment.format('jD');
        return `${weekday}، ${day} ${month}`;
      }
      
      // Default format
      return jMoment.format('jYYYY/jMM/jDD');
    } catch {
      // Fallback to fa-IR if persian calendar not supported
      return new Intl.DateTimeFormat('fa-IR', options).format(date);
    }
  };

  const formatPersianDateTime = (date: Date) => {
    try {
      // Use moment-jalaali for proper Persian calendar support
      const jMoment = moment(date);
      const monthIndex = jMoment.jMonth();
      const month = persianMonths[monthIndex];
      const day = jMoment.format('jD');
      const year = jMoment.format('jYYYY');
      const time = jMoment.format('HH:mm');
      return `${day} ${month} ${year} - ${time}`;
    } catch {
      // Fallback to fa-IR if persian calendar not supported
      return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    }
  };
  
  // State for expanded date groups
  const [expandedDates, setExpandedDates] = React.useState<Record<string, boolean>>({});

       // Fetch initial meetings on load
       const { data: initialMeetings = [], isLoading: meetingsLoading } = useQuery({
         queryKey: ['meetings', user?.id, 'recent'],
         queryFn: async () => {
           if (!user) {
             return [];
           }

           try {
             const { data: meetingsData, error: meetingsError } = await mysqlClient
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
               .eq('user_id', user.id)
               .order('created_at', { ascending: false })
               .limit(20);

             if (meetingsError) {
               toast({
                 title: "خطا در بارگذاری جلسات",
                 description: meetingsError.message,
                 variant: "destructive",
               });
               throw meetingsError;
             }

             return meetingsData || [];
           } catch (error) {
             throw error;
           }
         },
         enabled: !!user,
         staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
         refetchOnWindowFocus: false,
       });

  // Poll for new meetings only (every 30 seconds)
  const { data: newMeetings = [] } = useQuery({
    queryKey: ['meetings', user?.id, 'new'],
    queryFn: async () => {
      if (!user || !initialMeetings.length) return [];

      // Get the latest meeting's created_at timestamp
      const latestMeetingTime = initialMeetings[0]?.created_at;
      
      const { data: meetingsData, error: meetingsError } = await mysqlClient
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
        .eq('user_id', user.id)
        .gt('created_at', latestMeetingTime)
        .order('created_at', { ascending: false });

      if (meetingsError) {
        console.error('Error fetching new meetings:', meetingsError);
        return [];
      }

      return meetingsData || [];
    },
    enabled: !!user && initialMeetings.length > 0,
    refetchInterval: 60000, // Reduce to 60 seconds
    refetchIntervalInBackground: false, // Disable background refetching
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
  });

  const meetingsByDate = React.useMemo(() => {
    if (!newMeetings.length && !initialMeetings.length) return {};

    const allMeetings = [...newMeetings, ...initialMeetings];
    const uniqueMeetings = allMeetings.filter((meeting, index, self) =>
      index === self.findIndex(m => m.id === meeting.id)
    );

    const sortedMeetings = uniqueMeetings
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return sortedMeetings.reduce((acc, meeting) => {
      const date = new Date(meeting.meeting_date || meeting.created_at);
      const dateKey = formatPersianDate(date, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(meeting);
      return acc;
    }, {} as Record<string, DatabaseMeeting[]>);
  }, [initialMeetings, newMeetings]);

  const getMeetingTitle = (meeting: DatabaseMeeting): string => {
    const audioFiles = meeting.audioFiles || [];
    const audioCountText = audioFiles.length > 1 ? ` (${audioFiles.length} فایل)` : '';
    return `${meeting.title || 'جلسه'}${audioCountText}`;
  };

  const getMeetingDuration = (meeting: DatabaseMeeting): string => {
    const audioFiles = meeting.audioFiles || [];
    const totalDuration = audioFiles.reduce((sum, file) => sum + (file.duration || 0), 0);
    if (totalDuration <= 0) return '';
    return `${Math.round(totalDuration / 60)} دقیقه`;
  };

  const loading = meetingsLoading;

  // Expand first date group by default when data loads
  React.useEffect(() => {
    const dateKeys = Object.keys(meetingsByDate);
    if (dateKeys.length > 0 && Object.keys(expandedDates).length === 0) {
      setExpandedDates({ [dateKeys[0]]: true });
    }
  }, [meetingsByDate, expandedDates]);

  if (loading) {
    return (
      <AppShell title="خانه" subtitle="جلسات اخیر">
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="خانه" subtitle="جلسات اخیر">
      <div className="space-y-2.5">
        {Object.keys(meetingsByDate).length > 0 ? (
          Object.entries(meetingsByDate).map(([dateKey, groupMeetings]) => (
            <div key={dateKey} className="space-y-2.5">
              <Card
                className="cursor-pointer border border-primary/15 bg-card shadow-soft transition-all duration-300 hover:shadow-medium active:scale-[0.99]"
                onClick={() =>
                  setExpandedDates((prev) => ({ ...prev, [dateKey]: !prev[dateKey] }))
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-foreground">{dateKey}</h3>
                      <p className="text-sm text-muted-foreground">{groupMeetings.length} جلسه</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {groupMeetings.length}
                    </Badge>
                    <ChevronLeft
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                        expandedDates[dateKey] ? '-rotate-90' : '',
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {expandedDates[dateKey] && (
                <div className="space-y-2 rounded-xl border border-border/40 bg-muted/35 p-2">
                  {groupMeetings.map((meeting) => {
                    const meetingDate = new Date(meeting.meeting_date || meeting.created_at);
                    const durationText = getMeetingDuration(meeting);

                    return (
                      <Card
                        key={meeting.id}
                        className="cursor-pointer border border-border/30 bg-background/90 shadow-none transition-all duration-300 hover:border-primary/20 hover:bg-background active:scale-[0.99]"
                        onClick={() => navigate(`/meeting/${meeting.id}`)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                              <Mic2 className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate font-medium text-foreground">
                                {getMeetingTitle(meeting)}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {formatPersianDateTime(meetingDate)}
                                {durationText ? ` · ${durationText}` : ''}
                              </p>
                            </div>
                            {meeting.status && (
                              <Badge variant="secondary" className="shrink-0 text-xs">
                                {meeting.status}
                              </Badge>
                            )}
                            <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        ) : (
          <EmptyState
            icon={Mic2}
            title="هنوز جلسه‌ای ثبت نشده است"
            description="برای شروع، روی دکمه ضبط در پایین صفحه بزنید."
            action={
              <Button variant="primary" onClick={() => navigate('/record')}>
                <Mic2 className="h-4 w-4" />
                ضبط جلسه جدید
              </Button>
            }
          />
        )}
      </div>
    </AppShell>
  );
};

export default Home;