import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/hooks/use-toast';
import { Mic2, Sparkles } from 'lucide-react';

const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signup } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        title: "خطا",
        description: "رمزهای عبور مطابقت ندارند",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await signup(email, password, confirmPassword);
      toast({
        title: "ایمیل خود را بررسی کنید!",
        description: "ما لینک تأیید را برای شما ارسال کرده‌ایم. لطفاً ایمیل خود را بررسی کنید و قبل از ورود بر روی لینک کلیک کنید.",
        duration: 6000,
      });
      // Don't navigate automatically - user needs to confirm email first
      navigate('/login');
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast({
        title: "خطا",
        description: errorMessage || "ایجاد حساب کاربری ناموفق بود. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <div className="w-full max-w-md space-y-8">
        {/* Logo and Brand */}
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-glow">
              <Mic2 className="h-6 w-6 text-white" />
              <Sparkles className="absolute -top-1 -left-1 h-4 w-4 animate-pulse text-primary-glow" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">مدیریار</h1>
          </div>
          <p className="text-muted-foreground">دستیار هوشمند جلسات</p>
        </div>

        <Card className="shadow-medium border-0 bg-gradient-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">ایجاد حساب کاربری</CardTitle>
            <CardDescription className="text-center">
              به هزاران متخصصی بپیوندید که از هوش مصنوعی برای تبدیل جلسات خود استفاده می‌کنند
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  placeholder="یک رمز عبور امن ایجاد کنید"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="transition-all focus:ring-primary/20"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">تکرار رمز عبور</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="رمز عبور خود را تکرار کنید"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="transition-all focus:ring-primary/20"
                />
              </div>
              
              <Button 
                type="submit" 
                variant="primary" 
                className="w-full" 
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? "در حال ایجاد حساب..." : "ثبت نام"}
              </Button>
            </form>
            
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                قبلاً حساب کاربری دارید؟{" "}
                <Link 
                  to="/login" 
                  className="font-medium text-primary hover:text-primary-glow transition-colors"
                >
                  ورود
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;