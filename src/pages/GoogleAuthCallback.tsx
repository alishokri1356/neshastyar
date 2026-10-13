import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2, XCircle } from 'lucide-react';

const GoogleAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const completeGoogleHandoff = useAuthStore((s) => s.completeGoogleHandoff);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryError = searchParams.get('error');
    const handoff = searchParams.get('handoff');

    if (queryError) {
      setError(queryError);
      return;
    }

    if (!handoff) {
      setError('نشست گوگل دریافت نشد. لطفاً دوباره وارد شوید.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await completeGoogleHandoff(handoff);
        if (!cancelled) {
          navigate('/home', { replace: true });
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || 'ورود با گوگل ناموفق بود.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, completeGoogleHandoff, navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <Card className="w-full max-w-md shadow-medium border-0 bg-gradient-card">
          <CardHeader className="text-center space-y-3">
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <CardTitle>خطا در ورود با گوگل</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="primary">
              <Link to="/login">بازگشت به ورود</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <div className="text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">در حال تکمیل ورود با گوگل...</p>
      </div>
    </div>
  );
};

export default GoogleAuthCallback;
