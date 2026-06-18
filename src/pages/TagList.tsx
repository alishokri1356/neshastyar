import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/useAuthStore';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';
import { ChevronLeft, Tag, Settings } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import EmptyState from '@/components/EmptyState';

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

  const manageAction = (
    <Button variant="ghost" size="icon" onClick={() => navigate('/tags/manage')} aria-label="مدیریت برچسب‌ها">
      <Settings className="h-5 w-5" />
    </Button>
  );

  if (loading) {
    return (
      <AppShell title="برچسب‌ها" subtitle="جلسات بر اساس برچسب" actions={manageAction}>
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="برچسب‌ها" subtitle="جلسات بر اساس برچسب" actions={manageAction}>
      <div className="space-y-2.5">
        {/* Without any tag option */}
        <Card
          className="cursor-pointer border border-border/50 bg-card/70 shadow-soft transition-all duration-300 hover:shadow-medium active:scale-[0.99]"
          onClick={handleUntaggedClick}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/50 bg-muted-foreground/30" />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-medium text-foreground">بدون برچسب</h3>
                <p className="text-sm text-muted-foreground">{untaggedCount} جلسه</p>
              </div>
              <Badge variant="secondary" className="shrink-0 text-xs">{untaggedCount}</Badge>
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* Tags list */}
        {tags.map((tag) => (
          <Card
            key={tag.id}
            className="cursor-pointer border border-border/50 bg-card/70 shadow-soft transition-all duration-300 hover:shadow-medium active:scale-[0.99]"
            onClick={() => handleTagClick(tag.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: tag.color }} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-foreground">{tag.name}</h3>
                  <p className="text-sm text-muted-foreground">{tag.meetingCount} جلسه</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">{tag.meetingCount}</Badge>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}

        {tags.length === 0 && (
          <EmptyState
            icon={Tag}
            title="هنوز برچسبی ندارید"
            description="جلسه‌ای ضبط کنید و برچسب اضافه کنید"
          />
        )}
      </div>
    </AppShell>
  );
};

export default TagList;