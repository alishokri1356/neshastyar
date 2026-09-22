import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { mysqlClient } from '@/lib/mysql-client';
import AppShell from '@/components/layout/AppShell';
import { isHtmlContent } from '@/lib/meetingSummary';

const MeetingTranscription = () => {
  const { meetingId } = useParams<{ meetingId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['meeting-transcription', meetingId],
    queryFn: async () => {
      if (!meetingId) return null;

      const {
        data: { user },
      } = await mysqlClient.auth.getUser();
      if (!user) return null;

      const { data: meetingData, error } = await mysqlClient
        .from('meetings')
        .select('id, title, transcription')
        .eq('id', meetingId)
        .eq('user_id', user.id)
        .single();

      if (error || !meetingData) {
        console.error('Error fetching meeting transcription:', error);
        return null;
      }

      return {
        title: meetingData.title || 'جلسه',
        transcription: meetingData.transcription || '',
      };
    },
    enabled: !!meetingId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <AppShell title="جزییات صحبت های جلسه" onBack={`/meeting/${meetingId}`} hideNav>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell title="جزییات صحبت های جلسه" onBack={`/meeting/${meetingId}`} hideNav>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">جلسه یافت نشد.</p>
        </div>
      </AppShell>
    );
  }

  const transcription = data.transcription.trim();
  const renderAsHtml = transcription.length > 0 && isHtmlContent(transcription);

  return (
    <AppShell title="جزییات صحبت های جلسه" subtitle={data.title} onBack={`/meeting/${meetingId}`} hideNav>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg text-card-foreground">جزییات صحبت های جلسه</CardTitle>
        </CardHeader>
        <CardContent>
          {!transcription ? (
            <p className="text-muted-foreground text-center py-8">جزییات صحبت های این جلسه موجود نیست.</p>
          ) : renderAsHtml ? (
            <div
              className="prose prose-sm max-w-none text-card-foreground leading-7"
              dir="rtl"
              dangerouslySetInnerHTML={{ __html: transcription }}
            />
          ) : (
            <pre
              className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-card-foreground"
              dir="rtl"
            >
              {transcription}
            </pre>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
};

export default MeetingTranscription;
