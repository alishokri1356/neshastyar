import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import { ArrowRight, ChevronLeft, Tag, Settings } from 'lucide-react';

interface DatabaseTag {
  id: string;
  name: string;
  color: string;
  meetingCount: number;
}

const TagList = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [tags, setTags] = useState<DatabaseTag[]>([]);
  const [untaggedCount, setUntaggedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTagsAndUntagged = async () => {
      try {
        if (!user) return;

        // Fetch tags
        const { data: tagsData, error: tagsError } = await mysqlClient
          .from('tags')
          .select('id, name, color')
          .eq('user_id', user.id);

        if (tagsError) {
          console.error('Error fetching tags:', tagsError);
          toast({
            title: "خطا در بارگذاری برچسب‌ها",
            description: tagsError.message,
            variant: "destructive",
          });
          return;
        }

        // Fetch meeting counts for each tag using the API endpoint
        // This ensures we only count meetings that belong to the user
        const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
        const authHeaders = (mysqlClient as any).getAuthHeaders();
        const taggedMeetingIds = new Set<string>();

        const tagPromises = (tagsData || []).map(async (tag) => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/meeting-tags/tags/${tag.id}/meetings`,
              {
                headers: {
                  ...authHeaders,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (response.ok) {
              const meetings = await response.json();
              const meetingCount = Array.isArray(meetings) ? meetings.length : 0;
              
              // Track which meetings are tagged
              if (Array.isArray(meetings)) {
                meetings.forEach((meeting: any) => {
                  if (meeting.id) {
                    taggedMeetingIds.add(meeting.id);
                  }
                });
              }
              
              return {
                id: tag.id,
                name: tag.name,
                color: tag.color,
                meetingCount
              };
            }
            return {
              id: tag.id,
              name: tag.name,
              color: tag.color,
              meetingCount: 0
            };
          } catch (error) {
            console.error(`Error fetching meetings for tag ${tag.id}:`, error);
            return {
              id: tag.id,
              name: tag.name,
              color: tag.color,
              meetingCount: 0
            };
          }
        });

        const formattedTags = await Promise.all(tagPromises);
        
        // Filter out tags with no meetings
        const tagsWithMeetings = formattedTags.filter(tag => tag.meetingCount > 0);
        setTags(tagsWithMeetings);

        // Fetch untagged meetings count
        // Get all meetings for this user
        const { data: allMeetings, error: meetingsError } = await mysqlClient
          .from('meetings')
          .select('id')
          .eq('user_id', user.id);

        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError);
          return;
        }

        let untaggedMeetingsCount = 0;

        if (allMeetings && allMeetings.length > 0) {
          // Calculate untagged meetings count
          // A meeting is untagged if it's not in the taggedMeetingIds set
          // (taggedMeetingIds was populated when we fetched meetings for each tag above)
          untaggedMeetingsCount = allMeetings.filter(meeting => !taggedMeetingIds.has(meeting.id)).length;
        } else {
          // If no meetings exist, untagged count is 0
          untaggedMeetingsCount = 0;
        }
        
        setUntaggedCount(untaggedMeetingsCount);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTagsAndUntagged();
  }, [user, toast]);

  const handleTagClick = (tagId: string) => {
    navigate(`/tag/${tagId}`);
  };

  const handleUntaggedClick = () => {
    navigate('/tag/untagged');
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
          
          <h1 className="text-lg font-semibold text-foreground">لیست جلسات بر اساس برچسب ها</h1>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/tags/manage')}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            مدیریت برچسب‌ها
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="space-y-3">
          {/* Without any tag option */}
          <Card
            className="cursor-pointer hover:shadow-medium transition-all duration-300 bg-gradient-card border-0"
            onClick={handleUntaggedClick}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded-full bg-muted-foreground/30 border border-muted-foreground/50" />
                  <div>
                    <h3 className="font-medium text-foreground">بدون برچسب</h3>
                    <p className="text-sm text-muted-foreground">
                      {untaggedCount} جلسه
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {untaggedCount}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tags list */}
          {tags.map((tag) => (
            <Card
              key={tag.id}
              className="cursor-pointer hover:shadow-medium transition-all duration-300 bg-gradient-card border-0"
              onClick={() => handleTagClick(tag.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    <div>
                      <h3 className="font-medium text-foreground">{tag.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {tag.meetingCount} جلسه
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {tag.meetingCount}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {tags.length === 0 && (
            <div className="text-center py-12">
              <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                هنوز برچسبی ندارید
              </h3>
              <p className="text-muted-foreground">
                جلسه‌ای ضبط کنید و برچسب اضافه کنید
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagList;