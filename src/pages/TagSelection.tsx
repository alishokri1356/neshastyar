import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMeetingStore } from '@/store/useMeetingStore';
import { ArrowLeft, Plus, Check, Tag } from 'lucide-react';
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

  const recordingData = location.state as { duration: number; audioBlob: Blob | null } | null;

  // Fetch user's tags from database on component mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        const { data, error } = await supabase
          .from('tags')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) {
          toast({
            title: "Error loading tags",
            description: error.message,
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
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
      }
    };

    fetchTags();
  }, [addTag, toast]);

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

        // Add to local store without id (addTag generates it)
        const newTag = {
          name: data.name,
          color: data.color,
          userId: data.user_id
        };
        
        addTag(newTag);
        
        // Create the full tag object for selection (using the generated id from store)
        const fullNewTag = {
          id: Date.now().toString(), // This matches the ID generation in the store
          name: data.name,
          color: data.color,
          userId: data.user_id
        };
        setNewTagName('');
        setIsCreatingTag(false);
        
        // Auto-select the newly created tag
        setSelectedTags(prev => [...prev, fullNewTag]);
        
        toast({
          title: "Tag created",
          description: `"${newTag.name}" has been created successfully`,
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

  const handleSaveMeeting = () => {
    const fileName = `Meeting_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    
    const newMeeting = {
      fileName,
      date: new Date(),
      summary: '',
      status: 'On Process' as const,
      tags: selectedTags,
      duration: recordingData?.duration || 0,
      audioUrl: recordingData?.audioBlob ? URL.createObjectURL(recordingData.audioBlob) : undefined,
      userId: '1' // This will be replaced with actual user ID when Supabase is connected
    };

    addMeeting(newMeeting);
    navigate('/home');
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
              <h1 className="text-xl font-bold text-foreground">Select Tags</h1>
              <p className="text-xs text-muted-foreground">Choose or create tags for your meeting</p>
            </div>
          </div>
          
          <Badge variant="secondary">
            {selectedTags.length} selected
          </Badge>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Recording Summary */}
        {recordingData && (
          <Card className="bg-gradient-card border-0 shadow-soft">
            <CardContent className="p-6">
              <h3 className="font-semibold text-foreground mb-2">Recording Complete</h3>
              <p className="text-sm text-muted-foreground">
                Duration: {Math.floor((recordingData.duration || 0) / 60)}:{((recordingData.duration || 0) % 60).toString().padStart(2, '0')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Create New Tag */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Tags</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreatingTag(!isCreatingTag)}
            >
              <Plus className="h-4 w-4 mr-2" />
              New Tag
            </Button>
          </div>

          {isCreatingTag && (
            <Card className="bg-gradient-card border-0">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tagName">Tag Name</Label>
                  <Input
                    id="tagName"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Enter tag name"
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Color</Label>
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
                    Create
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreatingTag(false)}>
                    Cancel
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
              No tags yet
            </h3>
            <p className="text-muted-foreground mb-6">
              Create your first tag to organize your meetings.
            </p>
            <Button onClick={() => setIsCreatingTag(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Tag
            </Button>
          </div>
        )}

        {/* Save Button */}
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2">
          <Button
            onClick={handleSaveMeeting}
            disabled={selectedTags.length === 0}
            className="h-14 px-8 rounded-full shadow-2xl"
          >
            Save Meeting
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedTags.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TagSelection;
