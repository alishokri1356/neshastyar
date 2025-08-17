import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store/useAuthStore';
import { useToast } from '@/hooks/use-toast';
import { Mic2, Sparkles, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  const { resetPassword } = useAuthStore();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await resetPassword(email);
      setEmailSent(true);
      toast({
        title: "Reset link sent!",
        description: "Check your email for password reset instructions.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
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
            <CardTitle className="text-2xl text-center">بازیابی رمز عبور</CardTitle>
            <CardDescription className="text-center">
              {emailSent 
                ? "دستورالعمل بازیابی رمز عبور به ایمیل شما ارسال شد"
                : "آدرس ایمیل خود را وارد کنید تا دستورالعمل بازیابی دریافت کنید"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!emailSent ? (
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
                
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="w-full" 
                  disabled={isLoading}
                  size="lg"
                >
                  {isLoading ? "در حال ارسال..." : "ارسال لینک بازیابی"}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                  <p className="text-success font-medium">ایمیل با موفقیت ارسال شد!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    لطفاً صندوق ورودی خود را بررسی کنید و دستورالعمل‌ها را برای بازیابی رمز عبور دنبال کنید.
                  </p>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => setEmailSent(false)}
                >
                  ارسال ایمیل دیگر
                </Button>
              </div>
            )}
            
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