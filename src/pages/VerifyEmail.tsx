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
      const response = await fetch(`http://localhost:3001/api/auth/verify-email?token=${verificationToken}`, {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full">
              {status === 'loading' && (
                <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle className="h-12 w-12 text-green-600" />
              )}
              {status === 'error' && (
                <XCircle className="h-12 w-12 text-red-600" />
              )}
            </div>
            <CardTitle className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {status === 'loading' && 'در حال تأیید ایمیل...'}
              {status === 'success' && 'ایمیل تأیید شد!'}
              {status === 'error' && 'خطا در تأیید ایمیل'}
            </CardTitle>
            <CardDescription className="mt-2 text-center text-sm text-gray-600">
              {status === 'loading' && 'لطفاً صبر کنید...'}
              {status === 'success' && 'حالا می‌توانید وارد حساب کاربری خود شوید'}
              {status === 'error' && 'مشکلی در تأیید ایمیل شما رخ داده است'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 leading-relaxed">
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
