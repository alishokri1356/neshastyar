import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'form' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('لینک بازنشانی رمز عبور نامعتبر است');
      return;
    }

    // Token exists, show the form
    setStatus('form');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      setMessage('لطفاً تمام فیلدها را پر کنید');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('رمز عبور و تأیید رمز عبور باید یکسان باشند');
      return;
    }

    if (password.length < 6) {
      setMessage('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('http://localhost:3001/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          newPassword: password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('رمز عبور شما با موفقیت تغییر یافت! حالا می‌توانید با رمز عبور جدید وارد شوید.');
      } else {
        setStatus('error');
        setMessage(data.message || 'خطا در تغییر رمز عبور. لینک ممکن است منقضی شده باشد.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsSubmitting(false);
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
              {status === 'form' && (
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">🔒</span>
                </div>
              )}
              {status === 'success' && (
                <CheckCircle className="h-12 w-12 text-green-600" />
              )}
              {status === 'error' && (
                <XCircle className="h-12 w-12 text-red-600" />
              )}
            </div>
            <CardTitle className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              {status === 'loading' && 'در حال بارگذاری...'}
              {status === 'form' && 'بازنشانی رمز عبور'}
              {status === 'success' && 'رمز عبور تغییر یافت!'}
              {status === 'error' && 'خطا در بازنشانی رمز عبور'}
            </CardTitle>
            <CardDescription className="mt-2 text-center text-sm text-gray-600">
              {status === 'loading' && 'لطفاً صبر کنید...'}
              {status === 'form' && 'رمز عبور جدید خود را وارد کنید'}
              {status === 'success' && 'حالا می‌توانید با رمز عبور جدید وارد شوید'}
              {status === 'error' && 'مشکلی در بازنشانی رمز عبور رخ داده است'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {status === 'form' && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">رمز عبور جدید</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="رمز عبور جدید را وارد کنید"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">تأیید رمز عبور</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="رمز عبور را دوباره وارد کنید"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {message && (
                  <div className="text-sm text-red-600 text-center">
                    {message}
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      در حال تغییر رمز عبور...
                    </>
                  ) : (
                    'تغییر رمز عبور'
                  )}
                </Button>
              </form>
            )}

            {status !== 'form' && (
              <div className="text-center">
                <p className="text-sm text-gray-600 leading-relaxed">
                  {message}
                </p>
              </div>
            )}
            
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

export default ResetPassword;
