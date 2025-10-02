import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, session } = useAuthStore();

  useEffect(() => {
    // Check if user is not authenticated or has no session
    if (!isAuthenticated || !session) {
      console.log('🔒 User not authenticated, redirecting to landing page');
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, session, navigate]);

  // Show loading while checking authentication
  if (!isAuthenticated || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">در حال بررسی احراز هویت...</p>
        </div>
      </div>
    );
  }

  // User is authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
