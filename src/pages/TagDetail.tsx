import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMeetingStore } from '@/store/useMeetingStore';
import { ArrowLeft, Calendar, FileText, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const TagDetail = () => {
  const { tagId } = useParams<{ tagId: string }>();
  const navigate = useNavigate();
  const { tags } = useMeetingStore();
  const { toast } = useToast();
  
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tag, setTag] = useState<any>(null);

  // Fetch tag and its meetings from database
  useEffect(() => {
    const fetchTagAndMeetings = async () => {
      if (!tagId) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch tag details
        const { data: tagData, error: tagError } = await supabase
          .from('tags')
          .select('*')
          .eq('id', tagId)
          .eq('user_id', user.id)
          .single();

        if (tagError) {
          console.error('Error fetching tag:', tagError);
          return;
        }

        if (tagData) {
          setTag({
            id: tagData.id,
            name: tagData.name,
            color: tagData.color,
            userId: tagData.user_id
          });

          // Fetch meetings associated with this tag
          const { data: meetingsData, error: meetingsError } = await supabase
            .from('meeting_tags')
              .select(`
                meetings (
                  id,
                  meeting_date,
                  audio_file_name,
                  summary,
                  status
                )
              `)
            .eq('tag_id', tagId);

          if (meetingsError) {
            console.error('Error fetching meetings:', meetingsError);
            toast({
              title: "Error loading meetings",
              description: meetingsError.message,
              variant: "destructive",
            });
            return;
          }

          // Transform the data to match the expected format
          const transformedMeetings = meetingsData
            ?.map(item => item.meetings)
            .filter(Boolean)
            .map(meeting => ({
              id: meeting.id,
              fileName: meeting.audio_file_name || `Meeting ${new Date(meeting.meeting_date).toLocaleDateString()}`,
              date: new Date(meeting.meeting_date),
              summary: meeting.summary || '',
              status: meeting.status,
              duration: 0, // Will be updated once duration field is added
              tags: [],
              userId: user.id
            })) || [];

          setMeetings(transformedMeetings);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTagAndMeetings();
  }, [tagId, toast]);

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

  const getAudioDuration = async (fileName: string, userId: string): Promise<number> => {
    try {
      // Get signed URL for the audio file
      const { data } = await supabase.storage
        .from('meeting-audio')
        .createSignedUrl(`${userId}/${fileName}`, 60); // 1 minute expiry
      
      if (!data?.signedUrl) return 0;

      // Create audio element to get duration
      return new Promise((resolve) => {
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
          resolve(Math.floor(audio.duration));
        });
        audio.addEventListener('error', () => {
          resolve(0);
        });
        audio.src = data.signedUrl;
      });
    } catch (error) {
      console.error('Error getting audio duration:', error);
      return 0;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tag details...</p>
        </div>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Tag not found</h2>
          <Button onClick={() => navigate('/home')}>
            Back to Home
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
              onClick={() => navigate('/home')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <h1 className="text-xl font-bold text-foreground">{tag.name}</h1>
            </div>
          </div>
          
          <Badge variant="secondary" className="text-sm">
            {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-6">
        {meetings.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No meetings yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Start recording meetings and tag them to see them here.
            </p>
            <Button onClick={() => navigate('/record')}>
              Record Meeting
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">
              Meetings ({meetings.length})
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
                               {new Date(meeting.date).toLocaleDateString('en-US', {
                                 weekday: 'long',
                                 year: 'numeric',
                                 month: 'long',
                                 day: 'numeric'
                               })}
                             </span>
                             <span>•</span>
                             <span>
                               {new Date(meeting.date).toLocaleTimeString('en-US', {
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

export default TagDetail;