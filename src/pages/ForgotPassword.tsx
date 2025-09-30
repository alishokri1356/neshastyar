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
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    toast({
      title: "امکان بازیابی رمز عبور وجود ندارد",
      description: "لطفاً با پشتیبانی تماس بگیرید برای تغییر رمز عبور.",
      variant: "destructive",
    });
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
              بازیابی رمز عبور در حال حاضر غیرفعال است
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                <p className="text-warning font-medium">بازیابی رمز عبور غیرفعال است</p>
                <p className="text-sm text-muted-foreground mt-2">
                  لطفاً برای تغییر رمز عبور با پشتیبانی تماس بگیرید.
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
};

export default ForgotPassword;