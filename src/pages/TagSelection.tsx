import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useMeetingStore } from '@/store/useMeetingStore';
import { ArrowLeft, Plus, Check, Tag, X } from 'lucide-react';
import type { Tag as TagType } from '@/store/useMeetingStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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
  
  // Debug logging (only log once per component mount)
  useEffect(() => {
    console.log('TagSelection - Recording data received:', {
      hasState: !!location.state,
      duration: recordingData?.duration,
      hasBlobData: !!recordingData?.audioBlob,
      blobSize: recordingData?.audioBlob?.size
    });

    console.log('TagSelection - Full recording data:', recordingData);
  }, []); // Empty dependency array to run only once

  // Fetch user's tags from database on component mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        console.log('TagSelection - Fetching user...');
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        console.log('TagSelection - Auth result:', { user: !!user, authError });
        
        if (authError) {
          console.error('TagSelection - Auth error:', authError);
          toast({
            title: "Authentication Error",
            description: "Please log in to view your tags",
            variant: "destructive",
          });
          return;
        }
        
        if (!user) {
          console.log('TagSelection - No authenticated user found');
          toast({
            title: "Not logged in",
            description: "Please log in to view your tags",
            variant: "destructive",
          });
          return;
        }

        console.log('TagSelection - Fetching tags for user:', user.id);
        const { data, error } = await supabase
          .from('tags')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        console.log('TagSelection - Tags fetch result:', { data, error });

        if (error) {
          console.error('TagSelection - Tags fetch error:', error);
          toast({
            title: "Error loading tags",
            description: error.message,
            variant: "destructive",
          });
          return;
        }

        // Set fetched tags directly (they already have IDs)
        if (data && data.length > 0) {
          console.log('TagSelection - Found tags:', data.length);
          const formattedTags = data.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            userId: tag.user_id
          }));
          setTags(formattedTags);
        } else {
          console.log('TagSelection - No tags found for user');
          setTags([]); // Explicitly set empty array
        }
      } catch (error) {
        console.error('TagSelection - Error fetching tags:', error);
        toast({
          title: "Unexpected Error",
          description: "Failed to load tags",
          variant: "destructive",
        });
      }
    };

    fetchTags();
  }, [setTags, toast]);

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
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          toast({
            title: "Authentication required",
            description: "Please log in to create tags",
            variant: "destructive",
          });
          return;
        }

        // Save tag to database
        const { data, error } = await supabase
          .from('tags')
          .insert({
            name: newTagName.trim(),
            color: newTagColor,
            user_id: user.id
          })
          .select()
          .single();

        if (error) {
          toast({
            title: "Error creating tag",
            description: error.message,
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
          title: "Tag created",
          description: `"${fullNewTag.name}" has been created successfully`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create tag",
          variant: "destructive",
        });
      }
    }
  };

  const handleSaveMeeting = async () => {
    if (!recordingData?.audioBlob) {
      toast({
        title: "Error",
        description: "No audio recording found",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadCancelled(false);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to save meetings",
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

      // Upload audio file to Supabase storage with duplicate handling
      let uploadError = null;
      let uploadSuccess = false;

      // First try uploading with upsert: false
      const uploadResult = await supabase.storage
        .from('meeting-audio')
        .upload(audioFilePath, recordingData.audioBlob, {
          contentType: 'audio/wav',
          upsert: false
        });

      if (uploadResult.error) {
        // If file exists (409 Duplicate), try with upsert: true to overwrite
        if (uploadResult.error.message?.includes('already exists') || uploadResult.error.message?.includes('Duplicate')) {
          console.log('File exists, attempting to overwrite...');
          const retryResult = await supabase.storage
            .from('meeting-audio')
            .upload(audioFilePath, recordingData.audioBlob, {
              contentType: 'audio/wav',
              upsert: true // This will overwrite the existing file
            });
          
          uploadError = retryResult.error;
          uploadSuccess = !retryResult.error;
        } else {
          uploadError = uploadResult.error;
        }
      } else {
        uploadSuccess = true;
      }

      clearInterval(progressInterval);
      
      // Check if cancelled after upload
      if (uploadCancelled) {
        // Clean up uploaded file if it was uploaded
        if (!uploadError) {
          await supabase.storage
            .from('meeting-audio')
            .remove([audioFilePath]);
        }
        return;
      }
      
      setUploadProgress(100);

      if (uploadError) {
        toast({
          title: "Error uploading audio",
          description: uploadError.message,
          variant: "destructive",
        });
        return;
      }

      // Create meeting in database
      console.log('Saving meeting with duration:', recordingData.duration);
      
      // Generate title from filename (remove extension)
      const meetingTitle = fileName.replace(/\.(wav|mp3|m4a)$/i, '');
      
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          meeting_date: new Date().toISOString(),
          user_id: user.id,
          summary: '',
          audio_file_name: fileName,
          title: meetingTitle,
          status: 'آماده پردازش',
          duration: recordingData.duration || 0
        })
        .select()
        .single();

      console.log('Meeting saved:', meetingData);

      if (meetingError) {
        toast({
          title: "Error saving meeting",
          description: meetingError.message,
          variant: "destructive",
        });
        return;
      }

      // Create meeting-tag relationships
      if (selectedTags.length > 0) {
        const meetingTagsData = selectedTags.map(tag => ({
          meeting_id: meetingData.id,
          tag_id: tag.id
        }));

        const { error: tagsError } = await supabase
          .from('meeting_tags')
          .insert(meetingTagsData);

        if (tagsError) {
          toast({
            title: "Error linking tags",
            description: tagsError.message,
            variant: "destructive",
          });
          return;
        }
      }

      // Automatically trigger summary generation with detailed logging
      let summaryGenerationStarted = false;
      try {
        console.log('=== STARTING SUMMARY GENERATION ===');
        console.log('Meeting ID:', meetingData.id);
        console.log('File name for summary:', fileName);
        console.log('User ID:', user.id);
        
        // Check if the Edge Function exists first
        console.log('Checking Supabase connection...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Auth session valid:', !!session);
        
        console.log('Invoking trigger-summary Edge Function...');
        const functionStartTime = Date.now();
        
        const { data: summaryData, error: summaryError } = await supabase.functions.invoke('trigger-summary', {
          body: { fileName: fileName }
        });
        
        const functionEndTime = Date.now();
        console.log(`Function call took: ${functionEndTime - functionStartTime}ms`);
        console.log('Function response data:', summaryData);
        console.log('Function response error:', summaryError);

        if (summaryError) {
          console.error('=== SUMMARY GENERATION FAILED ===');
          console.error('Error type:', summaryError.name);
          console.error('Error message:', summaryError.message);
          console.error('Error details:', summaryError);
          
          toast({
            title: "Summary Generation Failed",
            description: `Could not start automatic summary generation: ${summaryError.message}. You can manually start it from the meeting page.`,
            variant: "destructive",
          });
        } else {
          console.log('=== SUMMARY GENERATION STARTED SUCCESSFULLY ===');
          console.log('Summary trigger response:', summaryData);
          summaryGenerationStarted = true;
          
          // Update meeting status to indicate processing has started
          console.log('Updating meeting status to processing...');
          const { error: updateError } = await supabase
            .from('meetings')
            .update({ status: 'در حال پردازش' })
            .eq('id', meetingData.id);

          if (updateError) {
            console.error('Error updating meeting status:', updateError);
          } else {
            console.log('Meeting status updated successfully');
          }
        }
      } catch (error) {
        console.error('=== SUMMARY GENERATION EXCEPTION ===');
        console.error('Exception type:', error?.constructor?.name);
        console.error('Exception message:', error?.message);
        console.error('Full exception:', error);
        
        toast({
          title: "Summary Generation Error", 
          description: `Unexpected error during summary generation: ${error?.message || 'Unknown error'}. You can manually start it from the meeting page.`,
          variant: "destructive",
        });
      }

      toast({
        title: "Meeting saved",
        description: summaryGenerationStarted ? "Meeting saved and summary generation started automatically" : "Meeting saved successfully - summary generation failed to start automatically",
      });

      console.log('Navigating to home page...');
      navigate('/home');
    } catch (error) {
      console.error('Error saving meeting:', error);
      toast({
        title: "Error",
        description: "Failed to save meeting",
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
      title: "Upload cancelled",
      description: "Meeting upload has been cancelled",
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
              <h3 className="font-semibold text-foreground mb-2">ضبط تکمیل شد</h3>
              <p className="text-sm text-muted-foreground mb-2">
                مدت زمان: {Math.floor((recordingData.duration || 0) / 1000 / 60)}:{Math.floor(((recordingData.duration || 0) / 1000) % 60).toString().padStart(2, '0')}
              </p>
              <p className="text-xs text-muted-foreground/70 font-mono">
                فایل: {recordingData.audioBlob ? `${recordingData.audioBlob.size} بایت (${recordingData.audioBlob.type})` : 'داده فایل موجود نیست'}
              </p>
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
                  در حال بارگذاری جلسه... {uploadProgress}%
                </div>
                <div className="w-64 bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
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
              disabled={selectedTags.length === 0}
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
