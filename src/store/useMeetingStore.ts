import { create } from 'zustand';

export interface Tag {
  id: string;
  name: string;
  color: string;
  userId: string;
}

export interface Meeting {
  id: string;
  fileName: string;
  date: Date;
  summary: string;
  status: 'On Process' | 'Need Review' | 'Done';
  tags: Tag[];
  audioUrl?: string;
  duration?: number;
  userId: string;
}

interface MeetingState {
  meetings: Meeting[];
  tags: Tag[];
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
  
  // Actions
  addMeeting: (meeting: Omit<Meeting, 'id'>) => void;
  updateMeeting: (id: string, updates: Partial<Meeting>) => void;
  deleteMeeting: (id: string) => void;
  addTag: (tag: Omit<Tag, 'id'>) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  setRecordingDuration: (duration: number) => void;
  getMeetingsByTag: (tagId: string) => Meeting[];
  getMeetingsByStatus: (status: Meeting['status']) => Meeting[];
}

export const useMeetingStore = create<MeetingState>((set, get) => ({
  meetings: [],
  tags: [
    // Sample tags
    { id: '1', name: 'Team Meeting', color: '#3B82F6', userId: '1' },
    { id: '2', name: 'Client Call', color: '#EF4444', userId: '1' },
    { id: '3', name: 'Project Review', color: '#10B981', userId: '1' },
    { id: '4', name: 'Brainstorming', color: '#F59E0B', userId: '1' },
  ],
  isRecording: false,
  isPaused: false,
  recordingDuration: 0,

  addMeeting: (meeting) => {
    const newMeeting = {
      ...meeting,
      id: Date.now().toString(),
    };
    set((state) => ({
      meetings: [...state.meetings, newMeeting],
    }));
  },

  updateMeeting: (id, updates) => {
    set((state) => ({
      meetings: state.meetings.map((meeting) =>
        meeting.id === id ? { ...meeting, ...updates } : meeting
      ),
    }));
  },

  deleteMeeting: (id) => {
    set((state) => ({
      meetings: state.meetings.filter((meeting) => meeting.id !== id),
    }));
  },

  addTag: (tag) => {
    const newTag = {
      ...tag,
      id: Date.now().toString(),
    };
    set((state) => ({
      tags: [...state.tags, newTag],
    }));
  },

  updateTag: (id, updates) => {
    set((state) => ({
      tags: state.tags.map((tag) =>
        tag.id === id ? { ...tag, ...updates } : tag
      ),
    }));
  },

  deleteTag: (id) => {
    set((state) => ({
      tags: state.tags.filter((tag) => tag.id !== id),
      meetings: state.meetings.map((meeting) => ({
        ...meeting,
        tags: meeting.tags.filter((tag) => tag.id !== id),
      })),
    }));
  },

  startRecording: () => {
    set({ isRecording: true, isPaused: false, recordingDuration: 0 });
  },

  pauseRecording: () => {
    set({ isPaused: true });
  },

  resumeRecording: () => {
    set({ isPaused: false });
  },

  stopRecording: () => {
    set({ isRecording: false, isPaused: false, recordingDuration: 0 });
  },

  setRecordingDuration: (duration) => {
    set({ recordingDuration: duration });
  },

  getMeetingsByTag: (tagId) => {
    const { meetings } = get();
    return meetings.filter((meeting) =>
      meeting.tags.some((tag) => tag.id === tagId)
    );
  },

  getMeetingsByStatus: (status) => {
    const { meetings } = get();
    return meetings.filter((meeting) => meeting.status === status);
  },
}));