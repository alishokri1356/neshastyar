import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/hooks/use-toast';
import { Mic2, Sparkles } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, initialize, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    initialize();
  }, [initialize]);

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
        title: "خوش آمدید!",
        description: "شما با موفقیت وارد شدید.",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "خطا",
        description: "ایمیل یا رمز عبور نامعتبر است. لطفاً دوباره تلاش کنید.",
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
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="relative">
              <Mic2 className="h-8 w-8 text-primary" />
              <Sparkles className="h-4 w-4 text-primary-glow absolute -top-1 -right-1 animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">مدیریار</h1>
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
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? "در حال ورود..." : "ورود"}
              </Button>
            </form>
            
            <div className="text-center mt-6">
              <p className="text-sm text-muted-foreground">
                حساب کاربری ندارید؟{" "}
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