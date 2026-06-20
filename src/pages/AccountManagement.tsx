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

const AccountManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [baleID, setBaleID] = useState("");
  const [name, setName] = useState("");

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
      const updates: { name?: string; baleID?: string | null } = {};
      
      if (name !== undefined) {
        updates.name = name.trim() || null;
      }
      
      if (baleID !== undefined) {
        updates.baleID = baleID.trim() || null;
      }

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
      <AppShell title="مدیریت حساب" subtitle="تنظیمات پروفایل" onBack="/home" hideNav>
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="مدیریت حساب" subtitle="تنظیمات پروفایل و حساب کاربری" onBack="/home" hideNav>
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

