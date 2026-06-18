import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mysqlClient } from '@/lib/mysql-client';
import AppShell from '@/components/layout/AppShell';

const DeleteConfirmation = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [meeting, setMeeting] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const meetingTitle = searchParams.get('title') || 'جلسه';

  useEffect(() => {
    const fetchMeeting = async () => {
      if (!meetingId) return;
      
      try {
        const { data: { user } } = await mysqlClient.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        const { data: meetingData, error } = await mysqlClient
          .from('meetings')
          .select('*')
          .eq('id', meetingId)
          .eq('user_id', user.id)
          .single();

        if (error || !meetingData) {
          console.error('Error fetching meeting:', error);
          navigate('/home');
          return;
        }

        setMeeting(meetingData);
      } catch (error) {
        console.error('Error:', error);
        navigate('/home');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeeting();
  }, [meetingId, navigate]);

  const handleDeleteMeeting = async () => {
    if (!meeting) return;
    
    setIsDeleting(true);
    try {
      const { data: { user } } = await mysqlClient.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Delete meeting_tags relationships
      // First, get all meeting-tag relationships for this meeting
      const { data: meetingTags, error: fetchTagsError } = await mysqlClient
        .from('meeting_tags')
        .select('*')
        .eq('meeting_id', meeting.id);

      if (fetchTagsError) {
        console.error('Error fetching meeting tags:', fetchTagsError);
      } else if (meetingTags && meetingTags.length > 0) {
        // Delete each relationship individually
        for (const meetingTag of meetingTags) {
          const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/meeting-tags?meeting_id=${meeting.id}&tag_id=${meetingTag.tag_id}`, {
            method: 'DELETE',
            headers: {
              ...mysqlClient.getAuthHeaders(),
            },
          });
          
          if (!response.ok) {
            console.error('Error deleting meeting-tag relationship:', response.statusText);
          }
        }
      }

      // Delete meeting record
      const { error: meetingError } = await mysqlClient
        .from('meetings')
        .delete()
        .eq('id', meeting.id);

      if (meetingError) throw meetingError;

      toast({
        title: "جلسه حذف شد",
        description: "جلسه با موفقیت حذف شد.",
      });

      // Navigate back to home
      navigate('/home');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast({
        title: "خطا",
        description: "حذف جلسه با خطا مواجه شد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    navigate(`/meeting/${meetingId}`);
  };

  if (isLoading) {
    return (
      <AppShell title="تأیید حذف" onBack={handleCancel} hideNav>
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="تأیید حذف" onBack={handleCancel} hideNav>
      <div className="mx-auto max-w-md">
        {/* Warning Card */}
        <Card className="mb-6 border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full bg-destructive/10 p-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">آیا مطمئن هستید؟</h2>
                <p className="text-sm text-muted-foreground">این عمل قابل بازگشت نیست</p>
              </div>
            </div>

            <div className="mb-4 rounded-lg bg-background/50 p-4">
              <p className="mb-2 text-sm text-muted-foreground">جلسه مورد نظر:</p>
              <p className="font-medium text-foreground">{meetingTitle}</p>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              با حذف این جلسه، تمام اطلاعات مربوط به آن از جمله ضبط صوتی، خلاصه و برچسب‌ها برای همیشه از سرورهای ما حذف خواهد شد.
            </p>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={handleDeleteMeeting}
            disabled={isDeleting}
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            size="lg"
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? 'در حال حذف...' : 'حذف جلسه'}
          </Button>

          <Button
            onClick={handleCancel}
            variant="outline"
            className="w-full"
            size="lg"
            disabled={isDeleting}
          >
            لغو
          </Button>
        </div>
      </div>
    </AppShell>
  );
};

export default DeleteConfirmation;