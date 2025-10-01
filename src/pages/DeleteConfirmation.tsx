import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { mysqlClient } from '@/lib/mysql-client';

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

      // Delete audio file from storage if it exists
      if (meeting.audio_file_name) {
        const fileName = meeting.audio_file_name.includes('.') ? meeting.audio_file_name : `${meeting.audio_file_name}.wav`;
        const { error: storageError } = await mysqlClient.storage
          .from('meeting-audio')
          .remove([`${user.id}/${fileName}`]);
        
        if (storageError) {
          console.error('Error deleting audio file:', storageError);
        }
      }

      // Delete meeting_tags relationships
      const { error: tagsError } = await mysqlClient
        .from('meeting_tags')
        .delete()
        .eq('meeting_id', meeting.id);

      if (tagsError) throw tagsError;

      // Delete meeting record
      const { error: meetingError } = await mysqlClient
        .from('meetings')
        .delete()
        .eq('id', meeting.id)
        .eq('user_id', user.id);

      if (meetingError) throw meetingError;

      toast({
        title: "جلسه حذف شد",
        description: "جلسه و فایل صوتی آن با موفقیت حذف شد.",
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
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">در حال بارگذاری...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleCancel}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">تأیید حذف</h1>
        </div>

        {/* Warning Card */}
        <Card className="mb-6 border-destructive/20 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center mb-4">
              <div className="bg-destructive/10 p-2 rounded-full mr-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">آیا مطمئن هستید؟</h2>
                <p className="text-sm text-muted-foreground">این عمل قابل بازگشت نیست</p>
              </div>
            </div>

            <div className="bg-background/50 p-4 rounded-lg mb-4">
              <p className="text-sm text-muted-foreground mb-2">جلسه مورد نظر:</p>
              <p className="font-medium text-foreground">{meetingTitle}</p>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
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
            <Trash2 className="h-4 w-4 ml-2" />
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
    </div>
  );
};

export default DeleteConfirmation;