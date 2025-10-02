import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { useMeetingStore } from '@/store/useMeetingStore';
import { ArrowLeft, Plus, Check, Tag, X } from 'lucide-react';
import type { Tag as TagType } from '@/store/useMeetingStore';
import { mysqlClient } from '@/lib/mysql-client';
import { useToast } from '@/components/ui/use-toast';

// Get API base URL from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const TagSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tags, addTag, addMeeting, setTags } = useMeetingStore();
  const { toast } = useToast();
  
  const [selectedTags, setSelectedTags] = useState<TagType[]>([]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadCancelled, setUploadCancelled] = useState(false);

  const recordingData = location.state as { duration: number; audioBlob: Blob | null; fileName?: string } | null;
  

  // Fetch user's tags from database on component mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const { data: { session } } = await mysqlClient.auth.getSession();
        
        if (!session) {
          toast({
            title: "وارد نشده‌اید",
            description: "لطفاً برای مشاهده برچسب‌های خود وارد شوید",
            variant: "destructive",
          });
          navigate('/login');
          return;
        }

        const { data, error } = await mysqlClient
          .from('tags')
          .select('*')
          .order('created_at', { ascending: false });


        if (error) {
          console.error('TagSelection - Tags fetch error:', error);
          
          // Check if it's an authentication error
          if (error.message?.includes('Access token required') || error.message?.includes('Unauthorized')) {
            navigate('/login');
            return;
          }
          
          toast({
            title: "خطا در بارگذاری برچسب‌ها",
            description: error.message || "بارگزاری برچسب ها نا موفق بود",
            variant: "destructive",
          });
          return;
        }

        // Set fetched tags directly (they already have IDs)
        if (data && data.length > 0) {
          const formattedTags = data.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            userId: tag.user_id
          }));
          setTags(formattedTags);
        } else {
          setTags([]); // Explicitly set empty array - this is normal!
        }
      } catch (error) {
        console.error('TagSelection - Error fetching tags:', error);
        
        // Check if it's a network error or authentication issue
        if (error instanceof TypeError && error.message.includes('fetch')) {
          toast({
            title: "خطا در اتصال",
            description: "خطا در اتصال به سرور. لطفاً اتصال اینترنت خود را بررسی کنید.",
            variant: "destructive",
          });
        } else if (error.message?.includes('Access token required') || error.message?.includes('Unauthorized')) {
          navigate('/login');
        } else {
          toast({
            title: "خطای غیرمنتظره",
            description: "بارگذاری برچسب‌ها ناموفق بود",
            variant: "destructive",
          });
        }
      }
    };

    fetchTags();
  }, [setTags, toast, navigate]);

  const tagColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
    '#F97316', // Orange
  ];

  const handleTagToggle = (tag: TagType) => {
    setSelectedTags(prev => {
      const isSelected = prev.some(t => t.id === tag.id);
      if (isSelected) {
        return prev.filter(t => t.id !== tag.id);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleCreateTag = async () => {
    if (newTagName.trim()) {
      try {
        // Get current user
        const { data: { session } } = await mysqlClient.auth.getSession();
        
        if (!session) {
          toast({
            title: "احراز هویت الزامی است",
            description: "لطفاً برای ایجاد برچسب وارد شوید",
            variant: "destructive",
          });
          return;
        }

        // Save tag to database
        const { data, error } = await mysqlClient
          .from('tags')
          .insert({
            name: newTagName.trim(),
            color: newTagColor,
            user_id: session.user.id
          });

        if (error) {
          toast({
            title: "خطا در ایجاد برچسب",
            description: error.message || "ایجاد برچسب ناموفق بود",
            variant: "destructive",
          });
          return;
        }

        // Create the full tag object for selection using the database ID
        const fullNewTag = {
          id: data.id, // Use the actual UUID from database
          name: data.name,
          color: data.color,
          userId: data.user_id
        };
        
        // Add to local store with the database ID
        addTag(fullNewTag);
        
        setNewTagName('');
        setIsCreatingTag(false);
        
        // Auto-select the newly created tag
        setSelectedTags(prev => [...prev, fullNewTag]);
        
        toast({
          title: "برچسب ایجاد شد",
          description: `"${fullNewTag.name}" با موفقیت ایجاد شد`,
        });
      } catch (error) {
        toast({
          title: "خطا",
          description: "ایجاد برچسب ناموفق بود",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveMeeting = async () => {
    if (!recordingData?.audioBlob) {
      toast({
        title: "خطا",
        description: "ضبط صوتی یافت نشد",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadCancelled(false);

    try {
      // Get current user
      const { data: { session } } = await mysqlClient.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        toast({
          title: "احراز هویت الزامی است",
          description: "لطفاً برای ذخیره جلسات وارد شوید",
          variant: "destructive",
        });
        return;
      }

      // Use original filename if available, otherwise generate one
      const fileName = recordingData.fileName || `Meeting_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.wav`;
      const audioFilePath = `${user.id}/${fileName}`;

      // Simulate upload progress based on file size for better accuracy
      const fileSizeInMB = recordingData.audioBlob.size / (1024 * 1024);
      const estimatedUploadTime = Math.max(2000, Math.min(fileSizeInMB * 1000, 10000)); // 2-10 seconds based on file size
      const progressStep = 85 / (estimatedUploadTime / 300); // Update every 300ms to reach 85%
      
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85 || uploadCancelled) {
            clearInterval(progressInterval);
            return uploadCancelled ? prev : 85; // Keep at 85% until upload completes
          }
          return Math.min(prev + progressStep + Math.random() * 2, 85);
        });
      }, 300);

      // Check if cancelled before starting upload
      if (uploadCancelled) {
        clearInterval(progressInterval);
        return;
      }

      // Upload audio file to backend
      
      const formData = new FormData();
      formData.append('audio', recordingData.audioBlob, fileName);

      const uploadResponse = await fetch(`${API_BASE_URL}/upload/audio`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token || session.token}`
        },
        body: formData
      });

           clearInterval(progressInterval);
      
      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();
        toast({
          title: "خطا در بارگذاری فایل",
          description: uploadError.message || "بارگذاری فایل ناموفق بود",
          variant: "destructive",
        });
        return;
      }

           const uploadResult = await uploadResponse.json();
      
      setUploadProgress(100);

      // Create meeting in database
      
      // Generate title from filename (remove extension)
      const meetingTitle = fileName.replace(/\.(wav|mp3|m4a|ogg)$/i, '');
      
      const { data: meetingData, error: meetingError } = await mysqlClient
        .from('meetings')
        .insert({
          meeting_date: new Date().toISOString(),
          user_id: user.id,
          summary: '',
          audio_file_name: fileName,
          audio_file_path: uploadResult.data.relativePath,
          audio_file_size: uploadResult.data.size,
          audio_duration: Math.floor(recordingData.duration / 1000),
          audio_format: uploadResult.data.format,
          title: meetingTitle,
          status: 'آماده پردازش',
          storage_type: 'local'
        });

           if (meetingError) {
        toast({
          title: "خطا در ذخیره جلسه",
          description: meetingError.message,
          variant: "destructive",
        });
        return;
      }

      // Create meeting-tag relationships
      if (selectedTags.length > 0) {
        // Create relationships one by one since backend expects single relationship per request
        for (const tag of selectedTags) {
          const { error: tagsError } = await mysqlClient
            .from('meeting_tags')
            .insert({
              meeting_id: meetingData.id,
              tag_id: tag.id
            });

          if (tagsError) {
            toast({
              title: "خطا در پیوند برچسب‌ها",
              description: tagsError.message,
              variant: "destructive",
            });
            return;
          }
        }
      }

      // Auto-trigger summary generation using the exact same method as MeetingDetail (WORKING METHOD)
      try {
        
        // Update meeting status to "ارسال درخواست پردازش"
        const updateResult = await mysqlClient
          .from('meetings')
          .update({ status: 'ارسال درخواست پردازش' });
        
        const { error: statusError } = await updateResult.eq('id', meetingData.id);

        if (statusError) throw statusError;

        // Get current user email
        const userEmail = user?.email || '';
        
        
        // Try multiple approaches to ensure the request gets through (same as MeetingDetail)
        const requestData = {
          fileName: fileName,
          userEmail: userEmail,
          meetingId: meetingData.id
        };

        // Approach 1: Try with no-cors first
        try {
          await fetch('https://n8nnew.teraxr.com/webhook/add5d58a-54b1-4459-96f2-ec17590e3cfd', {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
          });
        } catch (e) {
        }

/*
        // Approach 2: Try with dynamic image for GET request with query params
        try {
          const img = new Image();
          const url = new URL('https://n8nnew.teraxr.com/webhook-test/add5d58a-54b1-4459-96f2-ec17590e3cfd');
          url.searchParams.append('fileName', fileName);
          url.searchParams.append('userEmail', userEmail);
          url.searchParams.append('meetingId', meetingData.id);
          img.src = url.toString();
        } catch (e) {
        }

        */
        toast({
          title: "تولید خلاصه آغاز شد",
          description: "تولید خلاصه خودکار شروع شد. زمانی که آماده شد به شما ایمیل شماارسال خواهد شد.",
        });
      } catch (error) {
        console.error('=== SUMMARY GENERATION EXCEPTION ===');
        console.error('Exception type:', error?.constructor?.name);
        console.error('Exception message:', error?.message);
        console.error('Full exception:', error);
        
        toast({
          title: "خطای تولید خلاصه", 
          description: `خطای غیرمنتظره در حین تولید خلاصه: ${error?.message || 'خطای نامشخص'}. می‌توانید آن را از صفحه جلسه به صورت دستی شروع کنید.`,
          variant: "destructive",
        });
      }

      toast({
        title: "جلسه ذخیره شد",
        description: "خلاصه جلسه پس از پردازش به ایمیل شما ارسال خواهد شد.",
      });

      navigate('/home');
         } catch (error) {
      toast({
        title: "خطا",
        description: "ذخیره جلسه ناموفق بود",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadCancelled(false);
    }
  };

  const handleCancelUpload = () => {
    setUploadCancelled(true);
    setIsUploading(false);
    setUploadProgress(0);
    toast({
      title: "بارگذاری لغو شد",
      description: "بارگذاری جلسه لغو شد",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/record')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
            <h1 className="text-xl font-bold text-foreground">انتخاب برچسب</h1>
              <p className="text-xs text-muted-foreground">برچسب‌هایی برای جلسه خود انتخاب یا ایجاد کنید</p>
            </div>
          </div>
          
          <Badge variant="secondary">
            {selectedTags.length} انتخاب شده
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Recording Summary */}
        {recordingData && (
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-2">
                {recordingData.fileName ? `فایل انتخاب شده: ${recordingData.fileName}` : 'ضبط تکمیل شد'}
              </h3>
              <p className="text-sm text-muted-foreground mb-2">
                مدت زمان: {Math.floor((recordingData.duration || 0) / 1000 / 60)}:{Math.floor(((recordingData.duration || 0) / 1000) % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-xs text-muted-foreground/70 font-mono">
                فایل: {recordingData.audioBlob ? `${recordingData.audioBlob.size} بایت (${recordingData.audioBlob.type})` : 'داده فایل موجود نیست'}
              </p>
              {recordingData.audioBlob && (
                <div className="mt-4">
                  <audio controls src={URL.createObjectURL(recordingData.audioBlob)} className="w-full" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Create New Tag */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">برچسب‌ها</h2>
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setIsCreatingTag(!isCreatingTag)}
              className="h-12 px-6 font-semibold"
            >
              <Plus className="h-5 w-5 ml-2" />
              برچسب جدید
            </Button>
          </div>

          {isCreatingTag && (
            <Card className="bg-gradient-card border-0">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tagName">نام برچسب</Label>
                  <Input
                    id="tagName"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="نام برچسب را وارد کنید"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>رنگ</Label>
                  <div className="flex space-x-2">
                    {tagColors.map((color) => (
                      <button
                        key={color}
                        className={`w-8 h-8 rounded-full border-2 ${
                          newTagColor === color ? 'border-foreground' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setNewTagColor(color)}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button onClick={handleCreateTag} disabled={!newTagName.trim()}>
                    ایجاد
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreatingTag(false)}>
                    لغو
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Existing Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tags.map((tag) => {
            const isSelected = selectedTags.some(t => t.id === tag.id);
            return (
              <Card
                key={tag.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-medium' 
                    : 'border-transparent bg-gradient-card hover:shadow-medium'
                }`}
                onClick={() => handleTagToggle(tag)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <h4 className="font-medium text-foreground">{tag.name}</h4>
                    </div>
                    {isSelected && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* No tags message */}
        {tags.length === 0 && !isCreatingTag && (
          <div className="text-center py-12">
            <Tag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              هنوز برچسبی نیست
            </h3>
            <p className="text-muted-foreground mb-6">
              اولین برچسب خود را برای سازماندهی جلسات ایجاد کنید.
            </p>
            <Button onClick={() => setIsCreatingTag(true)}>
              <Plus className="h-4 w-4 ml-2" />
              ایجاد اولین برچسب
            </Button>
          </div>
        )}

        {/* Save Button */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
          {isUploading ? (
            <div className="bg-card border border-border rounded-full p-4 shadow-2xl">
              <div className="text-center space-y-3">
                 <div className="text-sm font-medium text-card-foreground">
                   در حال بارگذاری جلسه... {Math.round(uploadProgress)}%
                 </div>
                 <Progress value={uploadProgress} className="w-64" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <X className="h-4 w-4 ml-2" />
                      لغو
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>لغو بارگذاری؟</AlertDialogTitle>
                      <AlertDialogDescription>
                        آیا مطمئن هستید که می‌خواهید بارگذاری را لغو کنید؟ این عمل فرآیند بارگذاری فعلی را متوقف می‌کند و باید از ابتدا شروع کنید.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>ادامه بارگذاری</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCancelUpload}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        بله، لغو بارگذاری
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleSaveMeeting}
              className="h-14 px-8 rounded-full shadow-2xl"
            >
              ذخیره جلسه
              {selectedTags.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedTags.length}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagSelection;
