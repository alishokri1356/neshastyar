import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { safeReturnPath } from '@/lib/safeReturnPath';
import Landing from './Landing';

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const next = safeReturnPath(searchParams.get('next'));

  useEffect(() => {
    if (isAuthenticated) {
      navigate(next || '/home');
    }
  }, [isAuthenticated, navigate, next]);

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return <Landing />;
  }

  // Show loading for authenticated users while navigating
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground mt-4">در حال بارگذاری نشست یار...</p>
      </div>
    </div>
  );
};

export default Index;
