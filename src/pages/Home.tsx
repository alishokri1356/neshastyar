import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMeetingStore } from '@/store/useMeetingStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Mic2, LogOut, Plus, Calendar, Clock, FileText } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { tags, meetings, getMeetingsByTag } = useMeetingStore();
  const { user, logout } = useAuthStore();

  const handleTagClick = (tagId: string) => {
    navigate(`/tag/${tagId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  const recentMeetings = meetings
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

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
              <h1 className="text-xl font-bold text-foreground">Modiryar</h1>
              <p className="text-xs text-muted-foreground">AI Meeting Assistant</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Professional</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold text-foreground">
            Welcome back, {user?.email?.split('@')[0]}!
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Transform your meetings with AI-powered summaries and intelligent organization. 
            Record, tag, and never lose track of important discussions again.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardContent className="p-6 text-center">
              <div className="space-y-2">
                <FileText className="h-8 w-8 text-primary mx-auto" />
                <p className="text-2xl font-bold text-foreground">{meetings.length}</p>
                <p className="text-sm text-muted-foreground">Total Meetings</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardContent className="p-6 text-center">
              <div className="space-y-2">
                <Plus className="h-8 w-8 text-primary mx-auto" />
                <p className="text-2xl font-bold text-foreground">{tags.length}</p>
                <p className="text-sm text-muted-foreground">Active Tags</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardContent className="p-6 text-center">
              <div className="space-y-2">
                <Clock className="h-8 w-8 text-primary mx-auto" />
                <p className="text-2xl font-bold text-foreground">
                  {meetings.filter(m => m.status === 'Done').length}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tags Section */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-foreground">Your Tags</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tags.map((tag) => {
              const tagMeetings = getMeetingsByTag(tag.id);
              return (
                <Card
                  key={tag.id}
                  className="cursor-pointer hover:shadow-medium transition-all duration-300 hover:scale-105 bg-gradient-card border-0"
                  onClick={() => handleTagClick(tag.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <Badge variant="secondary" className="text-xs">
                        {tagMeetings.length}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-foreground">{tag.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {tagMeetings.length} meeting{tagMeetings.length !== 1 ? 's' : ''}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Meetings */}
        {recentMeetings.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground">Recent Meetings</h3>
            <div className="space-y-3">
              {recentMeetings.map((meeting) => (
                <Card
                  key={meeting.id}
                  className="cursor-pointer hover:shadow-medium transition-all duration-300 bg-gradient-card border-0"
                  onClick={() => navigate(`/meeting/${meeting.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{meeting.fileName}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {new Date(meeting.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Badge className={getStatusColor(meeting.status)}>
                        {meeting.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
            <Mic2 className="h-6 w-6 mr-3" />
            Record Meeting
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;