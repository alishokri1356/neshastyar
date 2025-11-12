import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Calendar, FileText, Clock, UserCircle } from 'lucide-react';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import moment from 'moment-jalaali';

const ParticipantDetail = () => {
  const { participantName } = useParams<{ participantName: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Helper function to parse JSON summary
  const parseJsonSummary = (summaryText: string) => {
    try {
      const parsed = JSON.parse(summaryText);
      return parsed;
    } catch {
      return null;
    }
  };

  // Helper function to extract participants from a meeting
  const extractParticipants = (meeting: any): string[] => {
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
        participants = meeting.people.split(',').map((p: string) => p.trim()).filter((p: string) => p);
      }
    }
    
    return participants;
  };

  // Fetch participant and its meetings from database
  const { data: participantAndMeetings, isLoading } = useQuery({
    queryKey: ['participant-detail', participantName],
    queryFn: async () => {
      if (!participantName) return null;
      
      const { data: { user } } = await mysqlClient.auth.getUser();
      if (!user) return null;

      // Decode the participant name
      const decodedName = decodeURIComponent(participantName);

      // Handle no participants case
      if (decodedName === 'no-participants') {
        const participant = {
          name: 'بدون شرکت‌کننده',
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

        // Filter meetings without participants
        const meetingsWithoutParticipants = (allMeetings || []).filter((meeting) => {
          const participants = extractParticipants(meeting);
          return participants.length === 0;
        });

        // Transform the data to match the expected format
        const transformedMeetings = meetingsWithoutParticipants.map((meeting: any) => ({
          id: meeting.id,
          fileName: meeting.title || meeting.audio_file_name?.replace(/\.(wav|mp3|m4a)$/i, '') || `Meeting ${new Date(meeting.meeting_date).toLocaleDateString()}`,
          date: new Date(meeting.meeting_date),
          summary: meeting.summary || '',
          status: meeting.status,
          duration: meeting.duration || 0,
          tags: [],
          userId: user.id
        }));

        return { participant, meetings: transformedMeetings };
      } else {
        // Handle regular participant case
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

        // Filter meetings that include this participant
        const participantMeetings = (allMeetings || []).filter((meeting) => {
          const participants = extractParticipants(meeting);
          return participants.includes(decodedName);
        });

        const participant = {
          name: decodedName,
          userId: user.id
        };

        // Transform the data to match the expected format
        const transformedMeetings = participantMeetings.map((meeting: any) => ({
          id: meeting.id,
          fileName: meeting.title || meeting.audio_file_name?.replace(/\.(wav|mp3|m4a)$/i, '') || `Meeting ${new Date(meeting.meeting_date).toLocaleDateString()}`,
          date: new Date(meeting.meeting_date),
          summary: meeting.summary || '',
          status: meeting.status,
          duration: meeting.duration || 0,
          tags: [],
          userId: user.id
        }));

        return { participant, meetings: transformedMeetings };
      }
    },
    refetchInterval: 30000, // 30 seconds
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
    enabled: !!participantName,
  });

  const participant = (participantAndMeetings as any)?.participant || null;
  const meetings = (participantAndMeetings as any)?.meetings || [];

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
          <p className="text-muted-foreground">در حال بارگذاری جزئیات شرکت‌کننده...</p>
        </div>
      </div>
    );
  }

  if (!participant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">شرکت‌کننده پیدا نشد</h2>
          <Button onClick={() => navigate('/home')}>
            بازگشت به خانه
          </Button>
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
              onClick={() => navigate('/participants')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground">{participant.name}</h1>
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
              ضبط جلسات را شروع کنید تا آنها را اینجا ببینید.
            </p>
            <Button onClick={() => navigate('/record')}>
              ضبط جلسه
            </Button>
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

export default ParticipantDetail;

