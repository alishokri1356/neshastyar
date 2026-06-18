import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/useAuthStore';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Mic2, LogOut, Calendar, FileText, User, Settings, Tag, UserCircle, ChevronDown } from 'lucide-react';
import moment from 'moment-jalaali';
import AppShell from '@/components/layout/AppShell';
import MeetingCard from '@/components/MeetingCard';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/utils';

interface DatabaseTag {
  id: string;
  name: string;
  color: string;
  meetingCount: number;
}

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
  const { user, logout } = useAuthStore();
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
  
  // State for sorting
  const [sortBy, setSortBy] = React.useState<'date' | 'tags' | 'participants'>('date');
  const [expandedDates, setExpandedDates] = React.useState<Record<string, boolean>>({});

  // Fetch tags once on load (no aggressive polling)
  const { data: tags = [], isLoading: tagsLoading } = useQuery({
    queryKey: ['tags', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: tagsData, error: tagsError } = await mysqlClient
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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false,
  });

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

             // Fetch tags for each meeting
             const meetingsWithTags = await Promise.all(
               (meetingsData || []).map(async (meeting) => {
                 try {
                   // Fetch meeting tags directly with JOIN query
                   const { data: tags, error: tagError } = await mysqlClient
                     .from('meeting_tags')
                     .select('*')
                     .eq('meeting_id', meeting.id);

                   return { ...meeting, tags };
                 } catch (error) {
                   console.error('Error fetching tags for meeting:', meeting.id, error);
                   return { ...meeting, tags: [] };
                 }
               })
             );

             return meetingsWithTags;
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

      // Fetch tags for each new meeting
      const meetingsWithTags = await Promise.all(
        (meetingsData || []).map(async (meeting) => {
          try {
            // Fetch meeting tags directly with JOIN query
            const { data: tags, error: tagError } = await mysqlClient
              .from('meeting_tags')
              .select('*')
              .eq('meeting_id', meeting.id);

            return { ...meeting, tags };
          } catch (error) {
            console.error('Error fetching tags for meeting:', meeting.id, error);
            return { ...meeting, tags: [] };
          }
        })
      );

      return meetingsWithTags;
    },
    enabled: !!user && initialMeetings.length > 0,
    refetchInterval: 60000, // Reduce to 60 seconds
    refetchIntervalInBackground: false, // Disable background refetching
    staleTime: 2 * 60 * 1000, // 2 minutes stale time
  });

  // Helper function to check if summary is JSON and return parsed object
  const parseJsonSummary = (summaryText: string) => {
    try {
      const parsed = JSON.parse(summaryText);
      return parsed;
    } catch {
      return null;
    }
  };

       // Merge initial meetings with new ones and group by date, tags, or participants
       const { meetings, meetingsByDate, meetingsByTags, meetingsByParticipants } = React.useMemo(() => {
         if (!newMeetings.length && !initialMeetings.length) return { meetings: [], meetingsByDate: {}, meetingsByTags: {}, meetingsByParticipants: {} };
         
         // Combine and deduplicate meetings
         const allMeetings = [...newMeetings, ...initialMeetings];
         const uniqueMeetings = allMeetings.filter((meeting, index, self) => 
           index === self.findIndex(m => m.id === meeting.id)
         );
         
         // Sort by created_at
         const sortedMeetings = uniqueMeetings
           .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
         
        // Group by date (Persian calendar)
         const groupedByDate = sortedMeetings.reduce((acc, meeting) => {
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

         // Group by tags
         const groupedByTags = sortedMeetings.reduce((acc, meeting) => {
           // Get tags for this meeting (meeting.tags is already populated)
           const meetingTags = meeting.tags || [];
           
           if (meetingTags.length === 0) {
             // Meetings without tags go to "بدون برچسب"
             const noTagKey = 'بدون برچسب';
             if (!acc[noTagKey]) {
               acc[noTagKey] = [];
             }
             acc[noTagKey].push(meeting);
           } else {
             // Group by each tag
             meetingTags.forEach(tag => {
               if (!acc[tag.name]) {
                 acc[tag.name] = [];
               }
               acc[tag.name].push(meeting);
             });
           }
           
           return acc;
         }, {} as Record<string, DatabaseMeeting[]>);

         // Group by participants
         const groupedByParticipants = sortedMeetings.reduce((acc, meeting) => {
           // Extract participants from summary or people field
           let participants: string[] = [];
           
           // Try to get participants from summary JSON first
           const summaryData = parseJsonSummary(meeting.summary || '');
           if (summaryData && summaryData['People in meetings']) {
             participants = Array.isArray(summaryData['People in meetings']) 
               ? summaryData['People in meetings'] 
               : [];
           } else if (meeting.people) {
             // Fallback to people field if it exists
             try {
               const peopleData = JSON.parse(meeting.people);
               participants = Array.isArray(peopleData) ? peopleData : [];
             } catch {
               // If people field is not JSON, treat as plain text
               participants = meeting.people.split(',').map(p => p.trim()).filter(p => p);
             }
           }
           
           if (participants.length === 0) {
             // Meetings without participants go to "بدون شرکت‌کننده"
             const noParticipantsKey = 'بدون شرکت‌کننده';
             if (!acc[noParticipantsKey]) {
               acc[noParticipantsKey] = [];
             }
             acc[noParticipantsKey].push(meeting);
           } else {
             // Group by each participant
             participants.forEach(participant => {
               if (!acc[participant]) {
                 acc[participant] = [];
               }
               acc[participant].push(meeting);
             });
           }
           
           return acc;
         }, {} as Record<string, DatabaseMeeting[]>);
         
         return { 
           meetings: sortedMeetings, 
           meetingsByDate: groupedByDate,
           meetingsByTags: groupedByTags,
           meetingsByParticipants: groupedByParticipants
         };
       }, [initialMeetings, newMeetings, tags]);

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

  // Reset expanded groups when sort changes
  React.useEffect(() => {
    setExpandedDates({});
  }, [sortBy]);

  const getBulletPoints = (meeting: DatabaseMeeting): string[] => {
    if (!meeting.summary) return [];
    const jsonData = parseJsonSummary(meeting.summary);
    if (Array.isArray(jsonData?.['Bolet Points'])) {
      return jsonData['Bolet Points'] as string[];
    }
    return meeting.summary.split('\n').filter(Boolean);
  };

  const sortOptions: { key: 'date' | 'tags' | 'participants'; label: string; icon: typeof Calendar; onClick: () => void }[] = [
    { key: 'date', label: 'تاریخ', icon: Calendar, onClick: () => setSortBy('date') },
    { key: 'tags', label: 'برچسب‌ها', icon: FileText, onClick: () => navigate('/tags') },
    { key: 'participants', label: 'افراد', icon: User, onClick: () => navigate('/participants') },
  ];

  const settingsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="تنظیمات">
          <Settings className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="truncate">{user?.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/tags/manage')}>
          <Tag className="me-2 h-4 w-4" />
          مدیریت برچسب‌ها
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/account/manage')}>
          <UserCircle className="me-2 h-4 w-4" />
          مدیریت حساب
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="me-2 h-4 w-4" />
          خروج از حساب
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const activeGroups = sortBy === 'date' ? meetingsByDate : sortBy === 'tags' ? meetingsByTags : meetingsByParticipants;

  if (loading) {
    return (
      <AppShell title="مدیریار" subtitle="دستیار هوشمند جلسات" actions={settingsMenu}>
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="مدیریار" subtitle="دستیار هوشمند جلسات" actions={settingsMenu}>
      {/* Greeting */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-foreground">
          {user?.email?.split('@')[0]} خوش آمدید
        </h2>
        <p className="text-sm text-muted-foreground">{formatPersianDateTime(new Date())}</p>
      </div>

      {/* Segmented sort control */}
      <div className="mb-6 grid grid-cols-3 gap-1 rounded-xl border border-border/60 bg-card/60 p-1">
        {sortOptions.map((opt) => {
          const Icon = opt.icon;
          const active = sortBy === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={opt.onClick}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow-soft'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{opt.label}</span>
            </button>
          );
        })}
      </div>

      {/* Meetings list grouped by date */}
      {Object.keys(activeGroups).length > 0 ? (
        <div className="space-y-5">
          {Object.entries(activeGroups).map(([groupKey, groupMeetings]) => (
            <div key={groupKey} className="space-y-3">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-start"
                onClick={() =>
                  setExpandedDates((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
                }
              >
                <span
                  className={cn(
                    'truncate text-sm font-semibold',
                    sortBy === 'tags' || sortBy === 'participants'
                      ? 'text-primary'
                      : 'text-muted-foreground',
                  )}
                >
                  {groupKey}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {groupMeetings.length}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      expandedDates[groupKey] ? 'rotate-180' : '',
                    )}
                  />
                </span>
              </button>

              {expandedDates[groupKey] && (
                <div className="space-y-2">
                  {groupMeetings.map((meeting) => {
                    const audioFiles = meeting.audioFiles || [];
                    const totalDuration = audioFiles.reduce(
                      (sum, file) => sum + (file.duration || 0),
                      0,
                    );
                    const durationText =
                      totalDuration > 0 ? `${Math.round(totalDuration / 60)} دقیقه` : '';
                    const audioCountText =
                      audioFiles.length > 1 ? ` (${audioFiles.length} فایل)` : '';
                    const meetingDate = new Date(meeting.meeting_date || meeting.created_at);

                    return (
                      <MeetingCard
                        key={meeting.id}
                        title={`${meeting.title || 'جلسه'}${audioCountText}`}
                        dateText={formatPersianDateTime(meetingDate)}
                        durationText={durationText}
                        status={meeting.status}
                        tags={meeting.tags || []}
                        bulletPoints={getBulletPoints(meeting)}
                        onClick={() => navigate(`/meeting/${meeting.id}`)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
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
    </AppShell>
  );
};

export default Home;