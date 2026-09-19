import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { adminFetch, setAdminToken, getAdminToken } from '@/lib/adminApi';
import { Loader2, Shield } from 'lucide-react';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (getAdminToken()) {
      navigate('/admin/users', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await adminFetch<{
        data: { access_token: string };
      }>('/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setAdminToken(result.data.access_token);
      toast({ title: 'ورود موفق', description: 'به پنل مدیریت خوش آمدید.' });
      navigate('/admin/users', { replace: true });
    } catch (error) {
      toast({
        title: 'خطا در ورود',
        description: (error as Error).message || 'نام کاربری یا رمز عبور نادرست است.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          'radial-gradient(ellipse at top, #1e3a5f 0%, #0f172a 45%, #020617 100%)',
      }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20 ring-1 ring-sky-400/40">
            <Shield className="h-7 w-7 text-sky-300" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">پنل مدیریت نشست یار</h1>
          <p className="mt-2 text-sm text-slate-300">ورود مدیر سیستم</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl backdrop-blur"
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-200">
                نام کاربری
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="border-white/15 bg-slate-950/40 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">
                رمز عبور
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="border-white/15 bg-slate-950/40 text-white"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-sky-500 text-white hover:bg-sky-400"
            >
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ورود...
                </>
              ) : (
                'ورود'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
