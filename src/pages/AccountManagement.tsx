import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { mysqlClient } from "@/lib/mysql-client";
import { useAuthStore } from "@/store/useAuthStore";
import { ChevronLeft, Save, UserCircle } from "lucide-react";

const AccountManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/home")}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 ml-2" />
            بازگشت
          </Button>
          <div className="flex items-center space-x-3 mb-2">
            <UserCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">مدیریت حساب</h1>
          </div>
          <p className="text-muted-foreground">تنظیمات پروفایل و اطلاعات حساب کاربری</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>اطلاعات حساب کاربری</CardTitle>
            <CardDescription>
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
                className="text-right"
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
                className="text-right"
              />
              <p className="text-xs text-muted-foreground">
                شناسه Bale شما برای اتصال حساب کاربری استفاده می‌شود
              </p>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="min-w-[120px]"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white ml-2"></div>
                    در حال ذخیره...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    ذخیره تغییرات
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccountManagement;

