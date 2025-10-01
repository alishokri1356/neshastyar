import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mic2, Sparkles, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "خطا",
        description: "لطفاً ایمیل خود را وارد کنید.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${API_BASE_URL}/auth/request-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast({
          title: "ایمیل ارسال شد",
          description: "لینک بازنشانی رمز عبور به ایمیل شما ارسال شد.",
          variant: "default",
        });
      } else {
        toast({
          title: "خطا",
          description: data.message || "خطا در ارسال ایمیل بازنشانی رمز عبور.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "خطا",
        description: "خطا در اتصال به سرور. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
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
              <div className="flex items-center justify-center mb-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-center">ایمیل ارسال شد!</CardTitle>
              <CardDescription className="text-center">
                لینک بازنشانی رمز عبور به ایمیل شما ارسال شد
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">ایمیل بازنشانی رمز عبور ارسال شد</p>
                  <p className="text-sm text-green-600 mt-2">
                    لطفاً صندوق ورودی ایمیل خود را بررسی کنید و روی لینک بازنشانی رمز عبور کلیک کنید.
                  </p>
                </div>
              </div>
              
              <div className="text-center mt-6">
                <Link 
                  to="/login" 
                  className="inline-flex items-center text-sm text-primary hover:text-primary-glow transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 ml-1" />
                  بازگشت به ورود
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            <CardTitle className="text-2xl text-center">بازیابی رمز عبور</CardTitle>
            <CardDescription className="text-center">
              ایمیل خود را وارد کنید تا لینک بازنشانی رمز عبور برای شما ارسال شود
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">ایمیل</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="ایمیل خود را وارد کنید"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    در حال ارسال...
                  </>
                ) : (
                  'ارسال لینک بازنشانی'
                )}
              </Button>
            </form>
            
            <div className="text-center mt-6">
              <Link 
                to="/login" 
                className="inline-flex items-center text-sm text-primary hover:text-primary-glow transition-colors"
              >
                <ArrowLeft className="h-4 w-4 ml-1" />
                بازگشت به ورود
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;