import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import { ArrowRight, ChevronLeft, UserCircle } from 'lucide-react';

interface Participant {
  name: string;
  meetingCount: number;
}

const ParticipantsList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [noParticipantsCount, setNoParticipantsCount] = useState(0);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        if (!user) return;

        // Fetch all meetings for this user
        const { data: allMeetings, error: meetingsError } = await mysqlClient
          .from('meetings')
          .select('*')
          .eq('user_id', user.id);

        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError);
          toast({
            title: "خطا در بارگذاری جلسات",
            description: meetingsError.message,
            variant: "destructive",
          });
          return;
        }

        // Extract participants from all meetings
        const participantMap = new Map<string, number>();
        let noParticipantsCount = 0;

        if (allMeetings && allMeetings.length > 0) {
          allMeetings.forEach((meeting) => {
            const meetingParticipants = extractParticipants(meeting);
            
            if (meetingParticipants.length === 0) {
              noParticipantsCount++;
            } else {
              meetingParticipants.forEach((participant) => {
                const count = participantMap.get(participant) || 0;
                participantMap.set(participant, count + 1);
              });
            }
          });
        }

        // Convert map to array and sort by meeting count (descending)
        const participantsArray: Participant[] = Array.from(participantMap.entries())
          .map(([name, meetingCount]) => ({ name, meetingCount }))
          .sort((a, b) => b.meetingCount - a.meetingCount);

        setParticipants(participantsArray);
        setNoParticipantsCount(noParticipantsCount);
      } catch (error) {
        console.error('Error fetching participants:', error);
        toast({
          title: "خطا",
          description: "خطایی در بارگذاری شرکت‌کنندگان رخ داد.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [user, toast]);

  const handleParticipantClick = (participantName: string) => {
    // Encode the participant name for URL
    const encodedName = encodeURIComponent(participantName);
    navigate(`/participant/${encodedName}`);
  };

  const handleNoParticipantsClick = () => {
    navigate('/participant/no-participants');
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
          <Button 
            variant="ghost"
            onClick={() => navigate('/home')}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            بازگشت به خانه
          </Button>
          
          <h1 className="text-lg font-semibold text-foreground">لیست جلسات بر اساس شرکت‌کنندگان</h1>
          
          <div className="w-[100px]" /> {/* Spacer for centering */}
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="space-y-3">
          {/* Without participants option */}
          {noParticipantsCount > 0 && (
            <Card
              className="cursor-pointer hover:shadow-medium transition-all duration-300 bg-gradient-card border-0"
              onClick={handleNoParticipantsClick}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full bg-muted-foreground/30 border border-muted-foreground/50" />
                    <div>
                      <h3 className="font-medium text-foreground">بدون شرکت‌کننده</h3>
                      <p className="text-sm text-muted-foreground">
                        {noParticipantsCount} جلسه
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {noParticipantsCount}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Participants list */}
          {participants.map((participant) => (
            <Card
              key={participant.name}
              className="cursor-pointer hover:shadow-medium transition-all duration-300 bg-gradient-card border-0"
              onClick={() => handleParticipantClick(participant.name)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <UserCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{participant.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {participant.meetingCount} جلسه
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {participant.meetingCount}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {participants.length === 0 && noParticipantsCount === 0 && (
            <div className="text-center py-12">
              <UserCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                هنوز شرکت‌کننده‌ای ندارید
              </h3>
              <p className="text-muted-foreground">
                جلسه‌ای ضبط کنید تا شرکت‌کنندگان نمایش داده شوند
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;

