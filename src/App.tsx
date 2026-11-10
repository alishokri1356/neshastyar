import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import SeoHead from "@/components/SeoHead";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Search from "./pages/Search";
import MeetingsByDate from "./pages/MeetingsByDate";
import Chat from "./pages/Chat";
import ChatHistory from "./pages/ChatHistory";
import TagDetail from "./pages/TagDetail";
import MeetingDetail from "./pages/MeetingDetail";
import MeetingDetailsOptions from "./pages/MeetingDetailsOptions";
import MeetingTranscription from "./pages/MeetingTranscription";
import {
  MeetingAddParticipantsPage,
  MeetingAddTagsPage,
  MeetingBulletPointsPage,
  MeetingParticipantsPage,
  MeetingTagsPage,
} from "./pages/MeetingSections";
import DeleteConfirmation from "./pages/DeleteConfirmation";
import Record from "./pages/Record";
import TagSelection from "./pages/TagSelection";
import NotFound from "./pages/NotFound";
import UntaggedMeetings from "./pages/UntaggedMeetings";
import TagList from "./pages/TagList";
import ParticipantsList from "./pages/ParticipantsList";
import ParticipantDetail from "./pages/ParticipantDetail";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";
import ParticipantsManager from "./pages/ParticipantsManager";
import TagManager from "./pages/TagManager";
import AccountManagement from "./pages/AccountManagement";
import MeetingReport from "./pages/MeetingReport";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminUsers from "./pages/admin/AdminUsers";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

const App = () => {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SeoHead />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/report/:token" element={<MeetingReport />} />

            {/* Admin panel */}
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/users" element={<AdminUsers />} />

            {/* Protected routes — Android & Web unified */}
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings-by-date"
              element={
                <ProtectedRoute>
                  <MeetingsByDate />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meetings_by_date"
              element={<Navigate to="/meetings-by-date" replace />}
            />

            {/* AI Chat + Chat History */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:sessionKey"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat-history"
              element={
                <ProtectedRoute>
                  <ChatHistory />
                </ProtectedRoute>
              }
            />

            {/* Meeting Detail & Android Sub-screens */}
            <Route
              path="/meeting/:meetingId"
              element={
                <ProtectedRoute>
                  <MeetingDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting/:meetingId/participants"
              element={
                <ProtectedRoute>
                  <MeetingParticipantsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting/:meetingId/participants/add"
              element={
                <ProtectedRoute>
                  <MeetingAddParticipantsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting/:meetingId/tags"
              element={
                <ProtectedRoute>
                  <MeetingTagsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting/:meetingId/tags/add"
              element={
                <ProtectedRoute>
                  <MeetingAddTagsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting/:meetingId/points"
              element={
                <ProtectedRoute>
                  <MeetingBulletPointsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting/:meetingId/options"
              element={
                <ProtectedRoute>
                  <MeetingDetailsOptions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting/:meetingId/meeting_details_options"
              element={
                <ProtectedRoute>
                  <MeetingDetailsOptions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting/:meetingId/conversation"
              element={
                <ProtectedRoute>
                  <MeetingTranscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting/:meetingId/transcription"
              element={
                <ProtectedRoute>
                  <MeetingTranscription />
                </ProtectedRoute>
              }
            />
            <Route
              path="/meeting/:meetingId/delete"
              element={
                <ProtectedRoute>
                  <DeleteConfirmation />
                </ProtectedRoute>
              }
            />

            {/* Record & Tag Selection */}
            <Route
              path="/record"
              element={
                <ProtectedRoute>
                  <Record />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tag-selection"
              element={
                <ProtectedRoute>
                  <TagSelection />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tag-selection/:draftId"
              element={
                <ProtectedRoute>
                  <TagSelection />
                </ProtectedRoute>
              }
            />

            {/* Tags & Participants */}
            <Route
              path="/meetings/untagged"
              element={
                <ProtectedRoute>
                  <UntaggedMeetings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tags"
              element={
                <ProtectedRoute>
                  <TagList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tag/:tagId"
              element={
                <ProtectedRoute>
                  <TagDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tags/manage"
              element={
                <ProtectedRoute>
                  <TagManager />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participants"
              element={
                <ProtectedRoute>
                  <ParticipantsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participant/:participantId"
              element={
                <ProtectedRoute>
                  <ParticipantDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participants/manage"
              element={
                <ProtectedRoute>
                  <ParticipantsManager />
                </ProtectedRoute>
              }
            />

            {/* Account / Settings */}
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/account/manage"
              element={
                <ProtectedRoute>
                  <AccountManagement />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
