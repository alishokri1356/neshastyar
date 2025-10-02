import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import TagDetail from "./pages/TagDetail";
import MeetingDetail from "./pages/MeetingDetail";
import DeleteConfirmation from "./pages/DeleteConfirmation";
import Record from "./pages/Record";
import TagSelection from "./pages/TagSelection";
import NotFound from "./pages/NotFound";
import UntaggedMeetings from "./pages/UntaggedMeetings";
import TagList from "./pages/TagList";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // Reduce retry attempts
      refetchOnWindowFocus: false, // Disable refetch on window focus globally
      staleTime: 5 * 60 * 1000, // 5 minutes default stale time
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
          <Routes>
            {/* Public routes - accessible without authentication */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            
            {/* Protected routes - require authentication */}
            <Route path="/home" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/tag/:tagId" element={
              <ProtectedRoute>
                <TagDetail />
              </ProtectedRoute>
            } />
            <Route path="/meeting/:meetingId" element={
              <ProtectedRoute>
                <MeetingDetail />
              </ProtectedRoute>
            } />
            <Route path="/meeting/:meetingId/delete" element={
              <ProtectedRoute>
                <DeleteConfirmation />
              </ProtectedRoute>
            } />
            <Route path="/record" element={
              <ProtectedRoute>
                <Record />
              </ProtectedRoute>
            } />
            <Route path="/tag-selection" element={
              <ProtectedRoute>
                <TagSelection />
              </ProtectedRoute>
            } />
            <Route path="/meetings/untagged" element={
              <ProtectedRoute>
                <UntaggedMeetings />
              </ProtectedRoute>
            } />
            <Route path="/tags" element={
              <ProtectedRoute>
                <TagList />
              </ProtectedRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
