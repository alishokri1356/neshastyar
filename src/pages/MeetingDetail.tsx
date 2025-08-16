import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMeetingStore } from '@/store/useMeetingStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Play, Pause, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MeetingDetail = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { meetings, tags, updateMeeting, addTag } = useMeetingStore();
  const meeting = meetings.find(m => m.id === meetingId);
  
  const [summary, setSummary] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [showAddTag, setShowAddTag] = useState(false);

  useEffect(() => {
    if (meeting) {
      setSummary(meeting.summary || '');
    }
  }, [meeting]);

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

  const handleSaveSummary = () => {
    updateMeeting(meeting.id, { summary });
    toast({
      title: "Summary saved",
      description: "Meeting summary has been updated successfully.",
    });
  };

  const handleAddTag = () => {
    if (newTagName.trim()) {
      const newTag = {
        name: newTagName.trim(),
        color: newTagColor,
        userId: meeting.userId,
      };
      addTag(newTag);
      
      // Add tag to meeting
      const updatedTags = [...meeting.tags, { ...newTag, id: Date.now().toString() }];
      updateMeeting(meeting.id, { tags: updatedTags });
      
      setNewTagName('');
      setShowAddTag(false);
      toast({
        title: "Tag added",
        description: "New tag has been added to the meeting.",
      });
    }
  };

  const handleRemoveTag = (tagId: string) => {
    const updatedTags = meeting.tags.filter(tag => tag.id !== tagId);
    updateMeeting(meeting.id, { tags: updatedTags });
    toast({
      title: "Tag removed",
      description: "Tag has been removed from the meeting.",
    });
  };

  const handleAddExistingTag = (tag: any) => {
    const tagExists = meeting.tags.some(t => t.id === tag.id);
    if (!tagExists) {
      const updatedTags = [...meeting.tags, tag];
      updateMeeting(meeting.id, { tags: updatedTags });
      toast({
        title: "Tag added",
        description: "Tag has been added to the meeting.",
      });
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
              <Button onClick={handleSaveSummary} size="sm">
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
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
                  {tags
                    .filter(tag => !meeting.tags.some(mt => mt.id === tag.id))
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
      </div>
    </div>
  );
};

export default MeetingDetail;