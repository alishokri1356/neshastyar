import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import { ArrowRight, ChevronLeft, Tag } from 'lucide-react';

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

        // Use the optimized backend endpoint that uses a single SQL query with JOIN
        // This reduces API calls from N (one per tag) to just 1 call
        const { data: tagsData, error: tagsError } = await mysqlClient
          .from('tags')
          .select('id, name, color')
          .eq('user_id', user.id)
          .withCount(true);

        if (tagsError) {
          console.error('Error fetching tags:', tagsError);
          toast({
            title: "خطا در بارگذاری برچسب‌ها",
            description: tagsError.message,
            variant: "destructive",
          });
          return;
        }

        // Get all meetings for this user to calculate untagged count
        const { data: allMeetings, error: meetingsError } = await mysqlClient
          .from('meetings')
          .select('id')
          .eq('user_id', user.id);

        if (meetingsError) {
          console.error('Error fetching meetings:', meetingsError);
          return;
        }

        const userMeetingIds = new Set(allMeetings?.map(m => m.id) || []);
        const taggedMeetingIds = new Set<string>();

        // Fetch meeting_tags to verify counts and track tagged meetings
        // We'll fetch all meeting_tags once and filter by user's meetings client-side
        const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
        const authHeaders = (mysqlClient as any).getAuthHeaders();

        // Note: The /meeting-tags endpoint returns tags, not meeting_tags directly
        // So we'll use the backend's meeting_count for now, but we need to verify
        // by checking if meeting_tags belong to user's meetings
        // For now, we'll trust the backend count and filter tags with 0 meetings
        const formattedTags = (tagsData || []).map((tag: any) => {
          const meetingCount = tag.meeting_count || 0;
          return {
            id: tag.id,
            name: tag.name,
            color: tag.color,
            meetingCount: meetingCount
          };
        }).filter(tag => tag.meetingCount > 0);

        setTags(formattedTags);

        // Calculate untagged meetings count
        // Use the backend's untagged meetings endpoint (single API call)
        let untaggedMeetingsCount = 0;

        if (allMeetings && allMeetings.length > 0) {
          try {
            const untaggedResponse = await fetch(
              `${API_BASE_URL}/meetings/untagged`,
              {
                headers: {
                  ...authHeaders,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (untaggedResponse.ok) {
              const untaggedMeetings = await untaggedResponse.json();
              untaggedMeetingsCount = Array.isArray(untaggedMeetings) ? untaggedMeetings.length : 0;
            }
          } catch (error) {
            console.error('Error fetching untagged meetings:', error);
            // Fallback: calculate from tags data if available
            // For now, set to 0 if we can't fetch
            untaggedMeetingsCount = 0;
          }
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
          
          <div className="w-[100px]" /> {/* Spacer for centering */}
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