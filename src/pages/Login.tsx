import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/hooks/use-toast';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { Mic2, Sparkles } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, loginWithGoogle, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      toast({
        title: 'خوش آمدید!',
        description: 'شما با موفقیت وارد شدید.',
      });
      navigate('/');
    } catch (error) {
      const errorMessage = (error as Error).message;

      if (errorMessage.includes('Email not verified') || errorMessage.includes('verify your email')) {
        toast({
          title: 'ایمیل تأیید نشده',
          description:
            'لطفاً ابتدا ایمیل خود را تأیید کنید. لینک تأیید به ایمیل شما ارسال شده است.',
          variant: 'destructive',
          duration: 8000,
        });
      } else {
        toast({
          title: 'خطا',
          description: 'ایمیل یا رمز عبور نامعتبر است. لطفاً دوباره تلاش کنید.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = useCallback(
    async (idToken: string) => {
      setGoogleLoading(true);
      try {
        await loginWithGoogle(idToken);
        toast({
          title: 'خوش آمدید!',
          description: 'با حساب گوگل وارد شدید.',
        });
        navigate('/');
      } catch (error) {
        toast({
          title: 'خطا در ورود با گوگل',
          description: (error as Error).message || 'ورود ناموفق بود.',
          variant: 'destructive',
        });
        throw error;
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle, navigate, toast]
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
              <Mic2 className="h-6 w-6 text-white" />
              <Sparkles className="absolute -top-1 -left-1 h-4 w-4 animate-pulse text-primary-glow" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">نشست یار</h1>
          </div>
          <p className="text-muted-foreground">دستیار هوشمند جلسات</p>
        </div>

        <Card className="shadow-medium border-0 bg-gradient-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">خوش آمدید</CardTitle>
            <CardDescription className="text-center">
              برای دسترسی به جلسات و خلاصه‌های هوشمند خود وارد شوید
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-6">
              <GoogleSignInButton
                onCredential={handleGoogle}
                disabled={isLoading || googleLoading}
                onError={(message) =>
                  toast({
                    title: 'خطا در ورود با گوگل',
                    description: message,
                    variant: 'destructive',
                  })
                }
              />
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">یا</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">ایمیل</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="transition-all focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">رمز عبور</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="رمز عبور خود را وارد کنید"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="transition-all focus:ring-primary/20"
                />
              </div>

              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:text-primary-glow transition-colors"
                >
                  رمز عبور را فراموش کرده‌اید؟
                </Link>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={isLoading || googleLoading}
                size="lg"
              >
                {isLoading ? 'در حال ورود...' : 'ورود'}
              </Button>
            </form>

            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                حساب کاربری ندارید؟{' '}
                <Link
                  to="/signup"
                  className="font-medium text-primary hover:text-primary-glow transition-colors"
                >
                  ثبت نام
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
