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
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await signup(email, password, confirmPassword);
      toast({
        title: "Check your email!",
        description: "We've sent you a confirmation link. Please check your email and click the link before logging in.",
        duration: 6000,
      });
      // Don't navigate automatically - user needs to confirm email first
      navigate('/login');
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast({
        title: "Error",
        description: errorMessage || "Failed to create account. Please try again.",
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