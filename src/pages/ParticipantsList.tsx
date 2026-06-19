import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, Search, Settings, UserCircle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import EmptyState from '@/components/EmptyState';

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredParticipants = useMemo(() => {
    if (!normalizedSearchQuery) {
      return participants;
    }

    return participants.filter((participant) =>
      participant.name.toLowerCase().includes(normalizedSearchQuery),
    );
  }, [participants, normalizedSearchQuery]);

  const showNoParticipantsCard =
    noParticipantsCount > 0 &&
    (!normalizedSearchQuery || 'بدون شرکت‌کننده'.includes(normalizedSearchQuery));

  const shellSearchProps = {
    searchActive: searchOpen,
    searchValue: searchQuery,
    onSearchChange: setSearchQuery,
    onSearchClose: () => {
      setSearchOpen(false);
      setSearchQuery('');
    },
    searchPlaceholder: 'جستجوی شرکت‌کننده...',
  };

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

  const sortParticipantsList = (list: Participant[]) =>
    [...list].sort((a, b) => {
      const countDiff = b.meetingCount - a.meetingCount;
      if (countDiff !== 0) {
        return countDiff;
      }
      return a.name.localeCompare(b.name, 'fa');
    });

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

  const headerActions = (
    <>
      {!searchOpen && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSearchOpen(true)}
          aria-label="جستجوی شرکت‌کنندگان"
        >
          <Search className="h-5 w-5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate('/participants/manage')}
        aria-label="مدیریت شرکت‌کنندگان"
      >
        <Settings className="h-5 w-5" />
      </Button>
    </>
  );

  if (loading) {
    return (
      <AppShell
        title="شرکت‌کنندگان"
        subtitle="جلسات بر اساس افراد"
        actions={headerActions}
        {...shellSearchProps}
      >
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="شرکت‌کنندگان"
      subtitle="جلسات بر اساس افراد"
      actions={headerActions}
      {...shellSearchProps}
    >
      <div className="space-y-2.5">
        {/* Without participants option */}
        {showNoParticipantsCard && (
          <Card
            className="cursor-pointer border border-border/50 bg-card/70 shadow-soft transition-all duration-300 hover:shadow-medium active:scale-[0.99]"
            onClick={handleNoParticipantsClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full border border-muted-foreground/40 bg-muted-foreground/20" />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-foreground">بدون شرکت‌کننده</h3>
                  <p className="text-sm text-muted-foreground">{noParticipantsCount} جلسه</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">{noParticipantsCount}</Badge>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Participants list */}
        {filteredParticipants.map((participant) => (
          <Card
            key={participant.name}
            className="cursor-pointer border border-border/50 bg-card/70 shadow-soft transition-all duration-300 hover:shadow-medium active:scale-[0.99]"
            onClick={() => handleParticipantClick(participant.name)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <UserCircle className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-foreground">{participant.name}</h3>
                  <p className="text-sm text-muted-foreground">{participant.meetingCount} جلسه</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">{participant.meetingCount}</Badge>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredParticipants.length === 0 && !showNoParticipantsCard && (
          <EmptyState
            icon={UserCircle}
            title={normalizedSearchQuery ? 'نتیجه‌ای یافت نشد' : 'هنوز شرکت‌کننده‌ای ندارید'}
            description={
              normalizedSearchQuery
                ? 'عبارت جستجو را تغییر دهید'
                : 'جلسه‌ای ضبط کنید تا شرکت‌کنندگان نمایش داده شوند'
            }
          />
        )}
      </div>
    </AppShell>
  );
};

export default ParticipantsList;

