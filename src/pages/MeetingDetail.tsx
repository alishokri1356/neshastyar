import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMeetingStore } from '@/store/useMeetingStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Save, Play, Pause, Plus, X, Trash2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const MeetingDetail = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { tags, addTag } = useMeetingStore();
  
  const [meeting, setMeeting] = useState<any>(null);
  const [allUserTags, setAllUserTags] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [showAddTag, setShowAddTag] = useState(false);
  const [meetingTags, setMeetingTags] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch meeting and all user tags from database
  useEffect(() => {
    const fetchData = async () => {
      if (!meetingId) return;
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Fetch all user tags
        const { data: allTags, error: allTagsError } = await supabase
          .from('tags')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (allTagsError) {
          console.error('Error fetching user tags:', allTagsError);
        } else {
          setAllUserTags(allTags || []);
        }

        // Fetch meeting details
        const { data: meetingData, error: meetingError } = await supabase
          .from('meetings')
          .select('*')
          .eq('id', meetingId)
          .eq('user_id', user.id)
          .single();

        if (meetingError) {
          console.error('Error fetching meeting:', meetingError);
          setIsLoading(false);
          return;
        }

        if (meetingData) {
          // Fetch meeting tags
          const { data: tagData, error: tagError } = await supabase
            .from('meeting_tags')
            .select(`
              tags (
                id,
                name,
                color
              )
            `)
            .eq('meeting_id', meetingId);

          const tags = tagData?.map(item => item.tags).filter(Boolean) || [];

          const transformedMeeting = {
            id: meetingData.id,
            fileName: meetingData.audio_file_name || `Meeting ${new Date(meetingData.meeting_date).toLocaleDateString()}`,
            date: new Date(meetingData.meeting_date),
            summary: meetingData.summary || '',
            status: meetingData.status,
            tags: tags,
            userId: meetingData.user_id,
            audioUrl: meetingData.audio_file_name ? await getAudioUrl(meetingData.audio_file_name, user.id) : null
          };

          setMeeting(transformedMeeting);
          setMeetingTags(tags);
          setSummary(transformedMeeting.summary);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [meetingId]);

  const getAudioUrl = async (fileName: string, userId: string) => {
    try {
      const { data } = await supabase.storage
        .from('meeting-audio')
        .createSignedUrl(`${userId}/${fileName}`, 3600); // 1 hour expiry
      
      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error getting audio URL:', error);
      return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading meeting details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Meeting not found</h1>
            <Button onClick={() => navigate('/home')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveSummary = async () => {
    try {
      const { error } = await supabase
        .from('meetings')
        .update({ summary })
        .eq('id', meeting.id);

      if (error) throw error;

      setMeeting(prev => ({ ...prev, summary }));
      toast({
        title: "Summary saved",
        description: "Meeting summary has been updated successfully.",
      });
    } catch (error) {
      console.error('Error saving summary:', error);
      toast({
        title: "Error",
        description: "Failed to save summary. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddTag = async () => {
    if (newTagName.trim()) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Create new tag in database
        const { data: newTag, error: tagError } = await supabase
          .from('tags')
          .insert({
            name: newTagName.trim(),
            color: newTagColor,
            user_id: user.id
          })
          .select()
          .single();

        if (tagError) throw tagError;

        // Link tag to meeting
        const { error: linkError } = await supabase
          .from('meeting_tags')
          .insert({
            meeting_id: meeting.id,
            tag_id: newTag.id
          });

        if (linkError) throw linkError;

        const updatedTags = [...meetingTags, newTag];
        setMeetingTags(updatedTags);
        setMeeting(prev => ({ ...prev, tags: updatedTags }));
        setAllUserTags(prev => [...prev, newTag]); // Add to all user tags as well
        
        setNewTagName('');
        setShowAddTag(false);
        
        toast({
          title: "Tag added",
          description: "New tag has been added to the meeting.",
        });
      } catch (error) {
        console.error('Error adding tag:', error);
        toast({
          title: "Error",
          description: "Failed to add tag. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('meeting_tags')
        .delete()
        .eq('meeting_id', meeting.id)
        .eq('tag_id', tagId);

      if (error) throw error;

      const updatedTags = meetingTags.filter(tag => tag.id !== tagId);
      setMeetingTags(updatedTags);
      setMeeting(prev => ({ ...prev, tags: updatedTags }));
      
      toast({
        title: "Tag removed",
        description: "Tag has been removed from the meeting.",
      });
    } catch (error) {
      console.error('Error removing tag:', error);
      toast({
        title: "Error",
        description: "Failed to remove tag. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddExistingTag = async (tag: any) => {
    const tagExists = meetingTags.some(t => t.id === tag.id);
    if (!tagExists) {
      try {
        const { error } = await supabase
          .from('meeting_tags')
          .insert({
            meeting_id: meeting.id,
            tag_id: tag.id
          });

        if (error) throw error;

        const updatedTags = [...meetingTags, tag];
        setMeetingTags(updatedTags);
        setMeeting(prev => ({ ...prev, tags: updatedTags }));
        
        toast({
          title: "Tag added",
          description: "Tag has been added to the meeting.",
        });
      } catch (error) {
        console.error('Error adding tag:', error);
        toast({
          title: "Error",
          description: "Failed to add tag. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Done': return 'bg-success text-success-foreground';
      case 'Need Review': return 'bg-warning text-warning-foreground';
      case 'On Process': return 'bg-info text-info-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const handleAutoGenerateSummary = async () => {
    try {
      console.log('Sending request to webhook with data:', { fileName: meeting.fileName });
      
      // Try multiple approaches to ensure the request gets through
      const requestData = {
        fileName: meeting.fileName
      };

      // Approach 1: Try with no-cors first
      try {
        await fetch('https://n8n.teraxr.com/webhook-test/add5d58a-54b1-4459-96f2-ec17590e3cfd', {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData)
        });
        console.log('no-cors request sent');
      } catch (e) {
        console.log('no-cors failed, trying alternative');
      }

      // Approach 2: Try with dynamic image for GET request with query params
      try {
        const img = new Image();
        const url = new URL('https://n8n.teraxr.com/webhook-test/add5d58a-54b1-4459-96f2-ec17590e3cfd');
        url.searchParams.append('fileName', meeting.fileName);
        img.src = url.toString();
        console.log('Image request sent to:', url.toString());
      } catch (e) {
        console.log('Image approach failed');
      }

      toast({
        title: "Summary generation triggered",
        description: "Request sent to webhook. Check your n8n logs to confirm receipt.",
      });
    } catch (error) {
      console.error('Error triggering auto summary:', error);
      
      toast({
        title: "Error",
        description: "Failed to trigger auto summary generation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMeeting = async () => {
    if (!meeting) return;
    
    setIsDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete audio file from storage if it exists
      if (meeting.audioUrl) {
        const fileName = meeting.fileName.includes('.') ? meeting.fileName : `${meeting.fileName}.wav`;
        const { error: storageError } = await supabase.storage
          .from('meeting-audio')
          .remove([`${user.id}/${fileName}`]);
        
        if (storageError) {
          console.error('Error deleting audio file:', storageError);
        }
      }

      // Delete meeting_tags relationships
      const { error: tagsError } = await supabase
        .from('meeting_tags')
        .delete()
        .eq('meeting_id', meeting.id);

      if (tagsError) throw tagsError;

      // Delete meeting record
      const { error: meetingError } = await supabase
        .from('meetings')
        .delete()
        .eq('id', meeting.id)
        .eq('user_id', user.id);

      if (meetingError) throw meetingError;

      toast({
        title: "Meeting deleted",
        description: "Meeting and associated audio file have been deleted successfully.",
      });

      // Navigate back to home
      navigate('/home');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({
        title: "Error",
        description: "Failed to delete meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate('/home')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>

        {/* Meeting Info */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl text-card-foreground">
                  {meeting.fileName}
                </CardTitle>
                <p className="text-muted-foreground mt-2">
                  {formatDate(meeting.date)}
                </p>
              </div>
              <Badge className={getStatusColor(meeting.status)}>
                {meeting.status}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Audio Player */}
        {meeting.audioUrl && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">Audio Recording</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-20"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <audio
                  controls
                  src={meeting.audioUrl}
                  className="flex-1"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  Your browser does not support the audio element.
                </audio>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">Meeting Summary</CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={handleAutoGenerateSummary}
                  size="sm"
                  className="bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600 hover:from-purple-600 hover:via-pink-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 font-bold tracking-wide text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2"
                >
                  <Sparkles className="mr-1 sm:mr-2 h-4 w-4" />
                  Auto Generate Summary
                </Button>
                <Button onClick={handleSaveSummary} size="sm" className="w-full sm:w-auto">
                  <Save className="mr-1 sm:mr-2 h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Enter meeting summary..."
              className="min-h-[200px] resize-none"
            />
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-card-foreground">Tags</CardTitle>
              <Button onClick={() => setShowAddTag(true)} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Tag
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current Tags */}
              <div className="flex flex-wrap gap-2">
                {meeting.tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border"
                    style={{ 
                      backgroundColor: `${tag.color}20`, 
                      borderColor: tag.color,
                      color: tag.color 
                    }}
                  >
                    {tag.name}
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="hover:opacity-70"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Tag */}
              {showAddTag && (
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="flex gap-3">
                    <Input
                      placeholder="Tag name"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="flex-1"
                    />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-12 h-10 rounded border border-border cursor-pointer"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddTag} size="sm">
                      Add Tag
                    </Button>
                    <Button 
                      onClick={() => setShowAddTag(false)} 
                      variant="outline" 
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Available Tags */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Available Tags:
                </p>
                <div className="flex flex-wrap gap-2">
                  {allUserTags
                    .filter(tag => !meetingTags.some(mt => mt.id === tag.id))
                    .map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleAddExistingTag(tag)}
                        className="px-3 py-1 rounded-full text-sm font-medium border border-border hover:bg-muted transition-colors"
                        style={{ 
                          backgroundColor: `${tag.color}10`, 
                          borderColor: `${tag.color}40`,
                          color: tag.color 
                        }}
                      >
                        {tag.name}
                      </button>
                    ))
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete Meeting */}
        <Card className="bg-card border-border border-destructive/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-card-foreground">Delete Meeting</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this meeting and its audio recording.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete Meeting'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the meeting
                      "{meeting.fileName}" and its audio recording from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteMeeting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Meeting
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MeetingDetail;