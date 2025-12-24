import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMeetingStore } from '@/store/useMeetingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Mic2, LogOut, Plus, Calendar, Clock, FileText, User, Settings, X, Tag, UserCircle } from 'lucide-react';
import moment from 'moment-jalaali';

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
  
  // State for slide panel
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);

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

  const handleTagManagement = () => {
    setIsPanelOpen(false);
    // Navigate to tag management page
    navigate('/tags/manage');
  };

  const handleAccountManagement = () => {
    setIsPanelOpen(false);
    navigate('/account/manage');
  };

  const handleLogoutFromPanel = async () => {
    setIsPanelOpen(false);
    await handleLogout();
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

  // Reset expanded groups when sort changes
  React.useEffect(() => {
    setExpandedDates({});
  }, [sortBy]);

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
              <p className="text-xs text-muted-foreground mt-1">{formatPersianDateTime(new Date())}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsPanelOpen(true)}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Slide-out Settings Panel */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsPanelOpen(false)}
        />
        
        {/* Panel */}
        <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {/* Panel Header */}
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <h2 className="text-xl font-semibold text-foreground">تنظیمات</h2>
            <Button variant="ghost" size="icon" onClick={() => setIsPanelOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Panel Content */}
          <div className="p-6 space-y-4">
            {/* Tag Management */}
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-right"
              onClick={handleTagManagement}
            >
              <Tag className="h-5 w-5 ml-3" />
              <div className="text-right">
                <div className="font-medium">مدیریت برچسب‌ها</div>
                <div className="text-xs text-muted-foreground">ایجاد، ویرایش و حذف برچسب‌ها</div>
              </div>
            </Button>
            
            {/* Account Management */}
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-right"
              onClick={handleAccountManagement}
            >
              <UserCircle className="h-5 w-5 ml-3" />
              <div className="text-right">
                <div className="font-medium">مدیریت حساب</div>
                <div className="text-xs text-muted-foreground">تنظیمات پروفایل و امنیت</div>
              </div>
            </Button>
            
            {/* Divider */}
            <div className="border-t border-border/50 my-4" />
            
            {/* Logout */}
            <Button
              variant="ghost"
              className="w-full justify-start h-12 text-right text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogoutFromPanel}
            >
              <LogOut className="h-5 w-5 ml-3" />
              <div className="text-right">
                <div className="font-medium">خروج از حساب</div>
                <div className="text-xs text-muted-foreground">خروج از سیستم</div>
              </div>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground">
             {user?.email?.split('@')[0]} خوش آمدید
          </h2>
          
          {/* Sorting Buttons */}
          <div className="flex justify-center gap-2 flex-wrap">
            <Button
              variant={sortBy === 'date' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy('date')}
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              مرتب‌سازی بر اساس تاریخ
            </Button>
            <Button
              variant={sortBy === 'tags' ? 'default' : 'outline'}
              size="sm"
              onClick={() => navigate('/tags')}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              مرتب‌سازی بر اساس برچسب
            </Button>
            <Button
              variant={sortBy === 'participants' ? 'default' : 'outline'}
              size="sm"
              onClick={() => navigate('/participants')}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              مرتب‌سازی بر اساس شرکت‌کنندگان
            </Button>
          </div>
        </div>

        {/* Meetings List - Grouped by Date, Tags, or Participants */}
       {Object.keys(
         sortBy === 'date' ? meetingsByDate : 
         sortBy === 'tags' ? meetingsByTags : 
         meetingsByParticipants
       ).length > 0 && (
          <div className="space-y-6">
            
            {Object.entries(
              sortBy === 'date' ? meetingsByDate : 
              sortBy === 'tags' ? meetingsByTags : 
              meetingsByParticipants
            ).map(([groupKey, groupMeetings]) => (
              <div key={groupKey} className="space-y-3">
                {/* Group Header */}
                <h4 
                  className={`text-sm font-medium px-2 ${
                    sortBy === 'tags' || sortBy === 'participants'
                      ? 'text-primary cursor-pointer hover:underline' 
                      : 'text-muted-foreground cursor-pointer'
                  }`}
                  onClick={() => {
                    setExpandedDates(prev => ({
                      ...prev,
                      [groupKey]: !prev[groupKey]
                    }));
                  }}
                >
                  <span className="inline-flex items-center gap-2">
                    {groupKey}
                    <svg
                      className={`w-4 h-4 transition-transform ${expandedDates[groupKey] ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </h4>
                
                {/* Meetings for this group */}
                {expandedDates[groupKey] && (
                <div className="space-y-2">
                  {groupMeetings.map((meeting) => {
                    const title = meeting.title || 'جلسه';
                    const audioFiles = meeting.audioFiles || [];
                    const totalDuration = audioFiles.reduce((sum, file) => sum + (file.duration || 0), 0);
                    const durationText = totalDuration > 0 ? `${Math.round(totalDuration / 60)} min` : '';
                    const audioCountText = audioFiles.length > 1 ? ` (${audioFiles.length} فایل)` : '';
                    const meetingDate = new Date(meeting.meeting_date || meeting.created_at);
                    const dateText = formatPersianDateTime(meetingDate);
                    
                    return (
                      <Card
                        key={meeting.id}
                        className="cursor-pointer hover:shadow-medium transition-all duration-300 bg-white/50 dark:bg-gray-800/50 border-0 hover:bg-white/70 dark:hover:bg-gray-800/70"
                        onClick={() => navigate(`/meeting/${meeting.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-3">
                            {/* Profile Avatar */}
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-glow rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            
                            {/* Meeting Content */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-foreground text-sm leading-tight">
                                {title}{audioCountText}
                              </h4>
                              
                              <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                                <span>{dateText}</span>
                                {durationText && (
                                  <>
                                    <span>•</span>
                                    <span>{durationText}</span>
                                  </>
                                )}
                              </div>
                              
                              {/* Tags */}
                              {meeting.tags && meeting.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {meeting.tags.slice(0, 3).map((tag) => (
                                    <span
                                      key={tag.id}
                                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                                      style={{ 
                                        backgroundColor: `${tag.color}20`, 
                                        borderColor: tag.color,
                                        color: tag.color 
                                      }}
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                  {meeting.tags.length > 3 && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-muted-foreground border border-border">
                                      +{meeting.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Bullet Points (max 3) with ellipsis when more */}
                              {(meeting.summary) && (() => {
                                const jsonData = parseJsonSummary(meeting.summary || '');
                                const boletPoints = Array.isArray(jsonData?.["Bolet Points"]) 
                                  ? (jsonData["Bolet Points"] as string[])
                                  : (meeting.summary ? meeting.summary.split('\n').filter(Boolean) : []);

                                if (!boletPoints || boletPoints.length === 0) return null;

                                const visible = boletPoints.slice(0, 3);
                                const hasMore = boletPoints.length > 3;

                                return (
                                  <div className="mt-2 space-y-1">
                                    {visible.map((line, index) => (
                                      <div key={index} className="flex items-start space-x-2 text-xs text-muted-foreground">
                                        <span className="text-primary mt-1">•</span>
                                        <span className="leading-relaxed">
                                          {line.length > 60 ? line.substring(0, 57) + '...' : line}
                                        </span>
                                      </div>
                                    ))}
                                    {hasMore && (
                                      <div className="flex items-start space-x-2 text-xs text-muted-foreground">
                                        <span className="text-primary mt-1">•</span>
                                        <span className="leading-relaxed">...</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            
                            {/* Status Badge */}
                            <div className="flex-shrink-0">
                              <Badge className={`text-xs ${getStatusColor(meeting.status)}`}>
                                {meeting.status}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                )}
              </div>
            ))}
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