import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AdminApiError,
  adminFetch,
  clearAdminToken,
  getAdminToken,
  type AdminUser,
} from '@/lib/adminApi';
import {
  KeyRound,
  Loader2,
  LogOut,
  Mail,
  Pencil,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Users,
} from 'lucide-react';

const statusBadge = (text: string, tone: 'green' | 'amber' | 'slate' | 'red') => {
  const tones = {
    green: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
    slate: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
    red: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${tones[tone]}`}
    >
      {text}
    </span>
  );
};

const formatDate = (value: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fa-IR');
  } catch {
    return value;
  }
};

const emailTypeLabel = (type: string | null) => {
  if (type === 'verification') return 'تأیید ایمیل';
  if (type === 'password_reset') return 'بازیابی رمز';
  return '—';
};

const emptyForm = {
  name: '',
  email: '',
  baleID: '',
  email_verified: false,
  password: '',
};

const AdminUsers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [emailActionId, setEmailActionId] = useState<string | null>(null);

  const loadUsers = useCallback(async (search = '') => {
    setIsLoading(true);
    try {
      const qs = search ? `?q=${encodeURIComponent(search)}` : '';
      const result = await adminFetch<{ data: { users: AdminUser[] } }>(
        `/users${qs}`
      );
      setUsers(result.data.users);
    } catch (error) {
      const message = (error as Error).message;
      if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('admin')) {
        clearAdminToken();
        navigate('/admin', { replace: true });
        return;
      }
      toast({
        title: 'خطا',
        description: message || 'بارگذاری کاربران ناموفق بود.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast]);

  useEffect(() => {
    if (!getAdminToken()) {
      navigate('/admin', { replace: true });
      return;
    }
    loadUsers();
  }, [loadUsers, navigate]);

  const stats = useMemo(() => {
    const total = users.length;
    const verified = users.filter((u) => u.email_verified).length;
    const withMeetings = users.filter((u) => u.usage.meeting_count > 0).length;
    const emailFailed = users.filter((u) => u.email_delivery?.status === 'failed').length;
    return { total, verified, withMeetings, emailFailed };
  }, [users]);

  const openEdit = (user: AdminUser) => {
    setEditing(user);
    setForm({
      name: user.name || '',
      email: user.email,
      baleID: user.baleID || '',
      email_verified: user.email_verified,
      password: '',
    });
  };

  const applyUserUpdate = (user: AdminUser) => {
    setUsers((prev) => prev.map((u) => (u.id === user.id ? user : u)));
    setEditing((prev) => (prev && prev.id === user.id ? user : prev));
  };

  const handleSave = async () => {
    if (!editing) return;
    setIsSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        email: form.email,
        baleID: form.baleID,
        email_verified: form.email_verified,
      };
      if (form.password.trim()) {
        payload.password = form.password.trim();
      }

      const result = await adminFetch<{ data: { user: AdminUser } }>(
        `/users/${editing.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        }
      );

      applyUserUpdate(result.data.user);
      setEditing(null);
      toast({ title: 'ذخیره شد', description: 'اطلاعات کاربر به‌روزرسانی شد.' });
    } catch (error) {
      toast({
        title: 'خطا در ذخیره',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setIsDeleting(true);
    try {
      await adminFetch<{ data: { deleted: boolean; id: string } }>(
        `/users/${deleting.id}`,
        { method: 'DELETE' }
      );
      setUsers((prev) => prev.filter((u) => u.id !== deleting.id));
      if (editing?.id === deleting.id) {
        setEditing(null);
      }
      setDeleting(null);
      toast({
        title: 'کاربر حذف شد',
        description: 'حساب کاربر و تمام داده‌های مرتبط از پایگاه داده پاک شد.',
      });
    } catch (error) {
      toast({
        title: 'خطا در حذف کاربر',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const sendEmail = async (
    user: AdminUser,
    kind: 'verification' | 'password_reset'
  ) => {
    const path =
      kind === 'verification'
        ? `/users/${user.id}/resend-verification`
        : `/users/${user.id}/resend-password-reset`;
    const successTitle =
      kind === 'verification' ? 'ایمیل تأیید ارسال شد' : 'ایمیل بازیابی رمز ارسال شد';

    setEmailActionId(`${user.id}:${kind}`);
    try {
      const result = await adminFetch<{
        data: { user: AdminUser; email: { message_id?: string | null } };
      }>(path, { method: 'POST' });

      applyUserUpdate(result.data.user);
      toast({
        title: successTitle,
        description: result.data.email?.message_id
          ? `شناسه Resend: ${result.data.email.message_id}`
          : 'وضعیت ارسال در جدول به‌روز شد.',
      });
    } catch (error) {
      if (error instanceof AdminApiError && error.data) {
        const payload = error.data as { user?: AdminUser };
        if (payload.user) applyUserUpdate(payload.user);
      }
      toast({
        title: 'ارسال ایمیل ناموفق',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setEmailActionId(null);
    }
  };

  const logout = () => {
    clearAdminToken();
    navigate('/admin', { replace: true });
  };

  const renderEmailStatus = (user: AdminUser) => {
    const delivery = user.email_delivery;
    if (!delivery?.status) {
      return <span className="text-xs text-slate-500">هنوز ارسالی ثبت نشده</span>;
    }

    return (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {delivery.status === 'sent'
            ? statusBadge('ارسال موفق', 'green')
            : statusBadge('ارسال ناموفق', 'red')}
          <span className="text-xs text-slate-400">{emailTypeLabel(delivery.type)}</span>
        </div>
        <div className="text-xs text-slate-500">{formatDate(delivery.sent_at)}</div>
        {delivery.message_id ? (
          <div className="text-[11px] text-slate-500 break-all" dir="ltr">
            id: {delivery.message_id}
          </div>
        ) : null}
        {delivery.status === 'failed' && delivery.error ? (
          <div className="text-xs text-rose-300/90 max-w-[220px]">{delivery.error}</div>
        ) : null}
      </div>
    );
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen text-slate-100"
      style={{
        background:
          'radial-gradient(ellipse at top left, #1e3a5f 0%, #0f172a 40%, #020617 100%)',
      }}
    >
      <header className="border-b border-white/10 bg-slate-950/40 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 ring-1 ring-sky-400/30">
              <Shield className="h-5 w-5 text-sky-300" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">پنل مدیریت نشست یار</h1>
              <p className="text-xs text-slate-400">مدیریت کاربران</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={logout}
            className="border-white/15 bg-transparent text-slate-200 hover:bg-white/10"
          >
            <LogOut className="ml-2 h-4 w-4" />
            خروج
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Users className="h-4 w-4" />
              کل کاربران
            </div>
            <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-400">تأیید شده</p>
            <p className="mt-2 text-2xl font-semibold text-emerald-300">
              {stats.verified}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-400">دارای جلسه</p>
            <p className="mt-2 text-2xl font-semibold text-sky-300">
              {stats.withMeetings}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm text-slate-400">ایمیل ناموفق</p>
            <p className="mt-2 text-2xl font-semibold text-rose-300">
              {stats.emailFailed}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">مدیریت کاربران</h2>
              <p className="text-sm text-slate-400">
                وضعیت حساب، تأیید ایمیل، ارسال ایمیل، رمز عبور و حذف کاربر
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-[220px]">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') loadUsers(query);
                  }}
                  placeholder="جستجو ایمیل / نام / شناسه"
                  className="border-white/15 bg-slate-950/40 pr-9 text-white"
                />
              </div>
              <Button
                onClick={() => loadUsers(query)}
                className="bg-sky-500 text-white hover:bg-sky-400"
              >
                <RefreshCw className="ml-2 h-4 w-4" />
                بروزرسانی
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead className="bg-slate-950/50 text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-right font-medium">کاربر</th>
                  <th className="px-4 py-3 text-right font-medium">وضعیت حساب</th>
                  <th className="px-4 py-3 text-right font-medium">تأیید ایمیل</th>
                  <th className="px-4 py-3 text-right font-medium">وضعیت ارسال ایمیل</th>
                  <th className="px-4 py-3 text-right font-medium">رمز عبور</th>
                  <th className="px-4 py-3 text-right font-medium">آخرین ورود</th>
                  <th className="px-4 py-3 text-right font-medium">استفاده</th>
                  <th className="px-4 py-3 text-right font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                      در حال بارگذاری...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      کاربری یافت نشد.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const verifying = emailActionId === `${user.id}:verification`;
                    const resetting = emailActionId === `${user.id}:password_reset`;
                    return (
                      <tr
                        key={user.id}
                        className="border-t border-white/5 hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">
                            {user.name || 'بدون نام'}
                          </div>
                          <div className="text-xs text-slate-400" dir="ltr">
                            {user.email}
                          </div>
                          {user.baleID ? (
                            <div className="text-xs text-slate-500">
                              Bale: {user.baleID}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          {user.account_status === 'active'
                            ? statusBadge('فعال', 'green')
                            : statusBadge('در انتظار تأیید', 'amber')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {user.email_verified
                              ? statusBadge('تأیید شده', 'green')
                              : statusBadge('تأیید نشده', 'red')}
                            {!user.email_verified && user.verification_email_pending ? (
                              <div className="text-xs text-slate-500">
                                لینک فعال تا {formatDate(user.email_verification_expires)}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">{renderEmailStatus(user)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {user.password_reset_pending
                              ? statusBadge('بازنشانی در انتظار', 'amber')
                              : statusBadge('تنظیم شده', 'slate')}
                            {user.password_reset_pending ? (
                              <div className="text-xs text-slate-500">
                                تا {formatDate(user.password_reset_expires)}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">
                          {user.last_login_at
                            ? formatDate(user.last_login_at)
                            : <span className="text-slate-500">هنوز وارد نشده</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div>{user.usage.meeting_count} جلسه</div>
                          <div className="text-xs text-slate-500">
                            آخرین: {formatDate(user.usage.last_meeting_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1.5 min-w-[150px]">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(user)}
                              className="border-white/15 bg-transparent text-slate-200 hover:bg-white/10 justify-start"
                            >
                              <Pencil className="ml-1 h-3.5 w-3.5" />
                              ویرایش
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={user.email_verified || verifying || Boolean(emailActionId)}
                              onClick={() => sendEmail(user, 'verification')}
                              className="border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 justify-start disabled:opacity-40"
                            >
                              {verifying ? (
                                <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Mail className="ml-1 h-3.5 w-3.5" />
                              )}
                              ارسال تأیید
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={resetting || Boolean(emailActionId)}
                              onClick={() => sendEmail(user, 'password_reset')}
                              className="border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 justify-start disabled:opacity-40"
                            >
                              {resetting ? (
                                <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <KeyRound className="ml-1 h-3.5 w-3.5" />
                              )}
                              ارسال بازیابی رمز
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isDeleting || Boolean(emailActionId)}
                              onClick={() => setDeleting(user)}
                              className="border-rose-500/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 justify-start disabled:opacity-40"
                            >
                              <Trash2 className="ml-1 h-3.5 w-3.5" />
                              حذف کاربر
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg border-white/10 bg-slate-900 text-slate-100 sm:rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>ویرایش کاربر</DialogTitle>
            <DialogDescription className="text-slate-400">
              تغییر اطلاعات حساب به‌عنوان مدیر سیستم
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>نام</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="border-white/15 bg-slate-950/50"
              />
            </div>
            <div className="space-y-2">
              <Label>ایمیل</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="border-white/15 bg-slate-950/50"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>شناسه بله (baleID)</Label>
              <Input
                value={form.baleID}
                onChange={(e) => setForm((f) => ({ ...f, baleID: e.target.value }))}
                className="border-white/15 bg-slate-950/50"
                dir="ltr"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
              <div>
                <Label>تأیید ایمیل</Label>
                <p className="text-xs text-slate-400">کاربر بتواند وارد سیستم شود</p>
              </div>
              <Switch
                checked={form.email_verified}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, email_verified: checked }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>رمز عبور جدید (اختیاری)</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="خالی بگذارید اگر نمی‌خواهید عوض شود"
                className="border-white/15 bg-slate-950/50"
              />
            </div>
            {editing ? (
              <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3 space-y-2">
                <p className="text-xs font-medium text-slate-300">آخرین وضعیت ایمیل</p>
                {renderEmailStatus(editing)}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={
                      editing.email_verified ||
                      Boolean(emailActionId)
                    }
                    onClick={() => sendEmail(editing, 'verification')}
                    className="border-sky-500/30 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20"
                  >
                    <Mail className="ml-1 h-3.5 w-3.5" />
                    ارسال تأیید
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={Boolean(emailActionId)}
                    onClick={() => sendEmail(editing, 'password_reset')}
                    className="border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                  >
                    <KeyRound className="ml-1 h-3.5 w-3.5" />
                    ارسال بازیابی رمز
                  </Button>
                </div>
                <p className="text-xs text-slate-500" dir="ltr">
                  ID: {editing.id}
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              className="border-white/15 bg-transparent"
            >
              انصراف
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-sky-500 text-white hover:bg-sky-400"
            >
              {isSaving ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                'ذخیره تغییرات'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleting(null);
        }}
      >
        <DialogContent className="max-w-lg border-white/10 bg-slate-900 text-slate-100 sm:rounded-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>حذف کاربر</DialogTitle>
            <DialogDescription className="text-slate-400">
              این عمل قابل بازگشت نیست. حساب کاربر و همه داده‌های مرتبط برای همیشه حذف می‌شود.
            </DialogDescription>
          </DialogHeader>

          {deleting ? (
            <div className="space-y-3 py-2">
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3">
                <p className="font-medium text-white">{deleting.name || 'بدون نام'}</p>
                <p className="text-sm text-slate-300" dir="ltr">{deleting.email}</p>
                <p className="mt-2 text-xs text-rose-200">
                  {deleting.usage.meeting_count} جلسه و سایر داده‌های کاربر (برچسب‌ها، شرکت‌کنندگان و فایل‌های صوتی) حذف خواهند شد.
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleting(null)}
              className="border-white/15 bg-transparent"
            >
              انصراف
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-rose-600 text-white hover:bg-rose-500"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  در حال حذف...
                </>
              ) : (
                <>
                  <Trash2 className="ml-2 h-4 w-4" />
                  حذف قطعی کاربر
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
