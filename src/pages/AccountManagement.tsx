import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { mysqlClient } from "@/lib/mysql-client";
import { useAuthStore } from "@/store/useAuthStore";
import { Save, LogOut } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import AnalyzeModelSelect from "@/components/AnalyzeModelSelect";
import { absoluteFromApiPath } from "@/lib/meetingReport";

const AccountManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [baleID, setBaleID] = useState("");
  const [name, setName] = useState("");
  const [defaultAnalyzeModel, setDefaultAnalyzeModel] = useState("auto");
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await mysqlClient.auth.getProfile();

      if (error) {
        throw new Error(error.message || error.error || "خطایی در دریافت اطلاعات پروفایل رخ داد.");
      }

      if (data) {
        setName(data.name || "");
        setBaleID(data.baleID ?? "");
        setDefaultAnalyzeModel(data.default_analyze_model || "auto");
        setOrgName(data.org_name || "");
        setLogoUrl(
          data.org_logo_path
            ? absoluteFromApiPath(`/api/public/logos/${data.id}?v=${Date.now()}`)
            : null
        );
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
      toast({
        title: "خطا",
        description: error.message || "خطایی در دریافت اطلاعات پروفایل رخ داد.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: {
        name?: string;
        baleID?: string | null;
        default_analyze_model?: string | null;
        org_name?: string | null;
      } = {};
      
      if (name !== undefined) {
        updates.name = name.trim() || null;
      }
      
      if (baleID !== undefined) {
        updates.baleID = baleID.trim() || null;
      }

      updates.default_analyze_model = defaultAnalyzeModel || "auto";
      updates.org_name = orgName.trim() || null;

      const { data, error } = await mysqlClient.auth.updateProfile(updates);

      if (error) {
        throw new Error(error.message || error.error || "خطایی در ذخیره تغییرات رخ داد.");
      }

      toast({
        title: "موفق",
        description: "تغییرات با موفقیت ذخیره شد.",
      });
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast({
        title: "خطا",
        description: error.message || "خطایی در ذخیره تغییرات رخ داد.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (error: any) {
      console.error("Error logging out:", error);
      toast({
        title: "خطا",
        description: error.message || "خروج از حساب کاربری ناموفق بود.",
        variant: "destructive",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="مدیریت حساب" subtitle="تنظیمات پروفایل" onBack={true} clickableBack hideNav>
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="مدیریت حساب" subtitle="تنظیمات پروفایل و حساب کاربری" onBack={true} clickableBack hideNav>
      <div className="mx-auto max-w-2xl">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>اطلاعات حساب کاربری</CardTitle>
            <CardDescription className="break-all">
              ایمیل شما: {user?.email}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">نام</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="نام خود را وارد کنید"
              />
            </div>

            {/* BaleID Field */}
            <div className="space-y-2">
              <Label htmlFor="orgName">نام سازمان</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="نام سازمان برای سربرگ صورتجلسه"
              />
              <p className="text-xs text-muted-foreground">
                این نام در صورتجلسه قابل اشتراک نمایش داده می‌شود
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="orgLogo">نشان سازمان</Label>
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="نشان سازمان"
                  className="h-16 w-auto rounded border bg-white object-contain p-1"
                />
              ) : null}
              <Input
                id="orgLogo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={uploadingLogo}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  setUploadingLogo(true);
                  try {
                    const { data, error } = await mysqlClient.uploadOrgLogo(file);
                    if (error || !data?.org_logo_path) {
                      throw new Error(error?.message || "بارگذاری نشان ناموفق بود");
                    }
                    setLogoUrl(absoluteFromApiPath(`/api/public/logos/${data.id}?v=${Date.now()}`));
                    toast({ title: "موفق", description: "نشان سازمان ذخیره شد." });
                  } catch (error: any) {
                    toast({
                      title: "خطا",
                      description: error.message || "بارگذاری نشان ناموفق بود",
                      variant: "destructive",
                    });
                  } finally {
                    setUploadingLogo(false);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                PNG، JPG، WEBP یا SVG، حداکثر ۲ مگابایت. این نشان در خانه سمت چپ سربرگ صورتجلسه نمایش داده می‌شود.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="baleID">شناسه Bale</Label>
              <Input
                id="baleID"
                value={baleID}
                onChange={(e) => setBaleID(e.target.value)}
                placeholder="شناسه Bale خود را وارد کنید"
              />
              <p className="text-xs text-muted-foreground">
                شناسه Bale شما برای اتصال حساب کاربری استفاده می‌شود
              </p>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  ذخیره تغییرات
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>مدل تحلیل پیش‌فرض</CardTitle>
            <CardDescription>
              این مدل برای تحلیل جلسات جدید استفاده می‌شود، مگر اینکه برای یک جلسه مدل دیگری انتخاب کنید.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="defaultAnalyzeModel">مدل تحلیل</Label>
              <AnalyzeModelSelect
                id="defaultAnalyzeModel"
                value={defaultAnalyzeModel}
                onValueChange={setDefaultAnalyzeModel}
                disabled={saving}
              />
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto"
            >
              {saving ? "در حال ذخیره..." : "ذخیره مدل پیش‌فرض"}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6 border-destructive/20">
          <CardHeader>
            <CardTitle>خروج از حساب</CardTitle>
            <CardDescription>
              با خروج از حساب، برای استفاده مجدد باید دوباره وارد شوید.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleLogout}
              disabled={loggingOut}
              variant="destructive"
              size="lg"
              className="w-full sm:w-auto"
            >
              {loggingOut ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                  در حال خروج...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  خروج از حساب
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
};

export default AccountManagement;

