import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('لینک تأیید ایمیل نامعتبر است');
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/auth/verify-email?token=${verificationToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('ایمیل شما با موفقیت تأیید شد! حالا می‌توانید وارد حساب کاربری خود شوید.');
      } else {
        setStatus('error');
        setMessage(data.message || 'خطا در تأیید ایمیل. لینک ممکن است منقضی شده باشد.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.');
    }
  };

  const handleGoToLogin = () => {
    navigate('/login');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md space-y-8">
        <Card className="shadow-medium border-0 bg-gradient-card">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full">
              {status === 'loading' && (
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              )}
              {status === 'success' && (
                <CheckCircle className="h-12 w-12 text-success" />
              )}
              {status === 'error' && (
                <XCircle className="h-12 w-12 text-destructive" />
              )}
            </div>
            <CardTitle className="mt-6 text-center text-2xl font-extrabold text-foreground sm:text-3xl">
              {status === 'loading' && 'در حال تأیید ایمیل...'}
              {status === 'success' && 'ایمیل تأیید شد!'}
              {status === 'error' && 'خطا در تأیید ایمیل'}
            </CardTitle>
            <CardDescription className="mt-2 text-center text-sm text-muted-foreground">
              {status === 'loading' && 'لطفاً صبر کنید...'}
              {status === 'success' && 'حالا می‌توانید وارد حساب کاربری خود شوید'}
              {status === 'error' && 'مشکلی در تأیید ایمیل شما رخ داده است'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {message}
              </p>
            </div>
            
            <div className="flex flex-col space-y-3">
              {status === 'success' && (
                <Button 
                  onClick={handleGoToLogin}
                  className="w-full"
                >
                  ورود به حساب کاربری
                </Button>
              )}
              
              {status === 'error' && (
                <div className="space-y-2">
                  <Button 
                    onClick={handleGoToLogin}
                    variant="outline"
                    className="w-full"
                  >
                    تلاش مجدد برای ورود
                  </Button>
                  <Button 
                    onClick={handleGoHome}
                    variant="ghost"
                    className="w-full"
                  >
                    بازگشت به خانه
                  </Button>
                </div>
              )}
              
              {status === 'loading' && (
                <Button 
                  onClick={handleGoHome}
                  variant="ghost"
                  className="w-full"
                >
                  بازگشت به خانه
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerifyEmail;
