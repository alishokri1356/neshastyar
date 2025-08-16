-- Create storage bucket for meeting audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-audio', 'meeting-audio', false);

-- Create RLS policies for meeting audio bucket
CREATE POLICY "Users can upload their own meeting audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'meeting-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own meeting audio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'meeting-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own meeting audio files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'meeting-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own meeting audio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'meeting-audio' AND auth.uid()::text = (storage.foldername(name))[1]);