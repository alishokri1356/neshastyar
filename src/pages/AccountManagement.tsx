import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Save, Upload } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { mysqlClient } from "@/lib/mysql-client";
import { useAuthStore } from "@/store/useAuthStore";
import AnalyzeModelSelect from "@/components/AnalyzeModelSelect";
import { absoluteFromApiPath } from "@/lib/meetingReport";
import androidVersionFile from "../../android-app/versioning.txt?raw";
import {
  NeshastyarCard,
  NeshastyarField,
  NeshastyarPrimaryButton,
  NeshastyarSecondaryButton,
  NeshastyarSubHeader,
  NeshastyarTopBar,
} from "@/components/neshastyar/NeshastyarUi";

const APP_VERSION = androidVersionFile.trim() || "1.0";

const AccountManagement: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [email, setEmail] = useState(user?.email || "");
  const [name, setName] = useState("");
  const [baleID, setBaleID] = useState("");
  const [defaultAnalyzeModel, setDefaultAnalyzeModel] = useState("auto");
  const [orgName, setOrgName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    void loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await mysqlClient.auth.getProfile();
      if (error) {
        throw new Error(
          error.message || error.error || "خطایی در دریافت اطلاعات پروفایل رخ داد.",
        );
      }

      if (data) {
        setEmail(data.email || user?.email || "");
        setName(data.name || "");
        setBaleID(data.baleID ?? "");
        setDefaultAnalyzeModel(data.default_analyze_model || "auto");
        setOrgName(data.org_name || "");
        setLogoUrl(
          data.org_logo_path
            ? absoluteFromApiPath(`/api/public/logos/${data.id}?v=${Date.now()}`)
            : null,
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "خطایی در دریافت اطلاعات پروفایل رخ داد.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setErrorMsg(null);
    try {
      const { error } = await mysqlClient.auth.updateProfile({
        name: name.trim() || null,
        baleID: baleID.trim() || null,
        default_analyze_model: defaultAnalyzeModel || "auto",
        org_name: orgName.trim() || null,
      });

      if (error) {
        throw new Error(error.message || error.error || "خطا در ذخیره تغییرات");
      }

      setMessage("تغییرات با موفقیت ذخیره شد.");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "خطا در ذخیره تغییرات");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingLogo(true);
    setErrorMsg(null);
    try {
      const { data, error } = await mysqlClient.uploadOrgLogo(file);
      if (error || !data?.org_logo_path) {
        throw new Error(error?.message || "بارگذاری نشان ناموفق بود");
      }
      setLogoUrl(absoluteFromApiPath(`/api/public/logos/${data.id}?v=${Date.now()}`));
      toast({ title: "نشان سازمان ذخیره شد." });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "بارگذاری نشان ناموفق بود");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "خروج از حساب ناموفق بود");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] flex-col bg-[#FBF9F4] text-[#1C1B18]"
    >
      <NeshastyarTopBar />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col space-y-4 px-4 pb-10">
        <NeshastyarSubHeader title="تنظیمات" onBack="/home" />

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#0D4D4D]" />
          </div>
        ) : (
          <>
            {/* Main Account Card matching Android AccountScreen */}
            <NeshastyarCard className="space-y-3.5">
              <div>
                <p className="text-[12px] text-[#66625B]">ایمیل</p>
                <p dir="ltr" className="mt-1 text-right text-[15px] font-medium text-[#1C1B18]">
                  {email || "—"}
                </p>
              </div>

              <NeshastyarField
                label="نام"
                placeholder="نام خود را وارد کنید"
                value={name}
                onChange={setName}
              />

              <NeshastyarField
                label="شناسه بله"
                placeholder="شناسه بله خود را وارد کنید"
                value={baleID}
                onChange={setBaleID}
              />

              {/* Web-exclusive Default AI Model & Org Branding kept cleanly in the same Editorial style */}
              <div className="pt-1">
                <label
                  htmlFor="default-analyze-model"
                  className="mb-1.5 block text-[12px] font-medium text-[#66625B]"
                >
                  مدل هوش مصنوعی پیش‌فرض تحلیل
                </label>
                <AnalyzeModelSelect
                  id="default-analyze-model"
                  value={defaultAnalyzeModel}
                  onValueChange={setDefaultAnalyzeModel}
                  disabled={saving}
                />
              </div>

              <NeshastyarField
                label="نام سازمان (سربرگ صورتجلسه)"
                placeholder="نام سازمان برای سربرگ صورتجلسه"
                value={orgName}
                onChange={setOrgName}
              />

              <div>
                <p className="mb-1.5 text-[12px] font-medium text-[#66625B]">
                  نشان سازمان (سربرگ صورتجلسه)
                </p>
                <div className="flex items-center gap-3">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="نشان سازمان"
                      className="h-14 w-14 rounded-xl border border-[#E8E2D5] bg-white object-contain p-1"
                    />
                  ) : null}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-[14px] border border-[#E8E2D5] bg-[#F5F2EB] px-4 py-2.5 text-[13px] font-medium text-[#1C1B18] transition hover:bg-[#E8E2D5]/60">
                    <Upload className="h-4 w-4 text-[#0F766E]" />
                    <span>{uploadingLogo ? "در حال بارگذاری..." : "انتخاب تصویر لوگو"}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      hidden
                      disabled={uploadingLogo}
                      onChange={(e) => void handleLogoPick(e)}
                    />
                  </label>
                </div>
              </div>

              {message ? (
                <p className="text-[13px] text-[#0F766E]">{message}</p>
              ) : null}
              {errorMsg ? (
                <p className="text-[13px] text-[#B91C1C]">{errorMsg}</p>
              ) : null}

              <div className="space-y-2.5 pt-2">
                <NeshastyarPrimaryButton
                  loading={saving}
                  onClick={() => void handleSave()}
                  icon={<Save className="h-4 w-4" />}
                >
                  ذخیره
                </NeshastyarPrimaryButton>

                <NeshastyarSecondaryButton
                  disabled={loggingOut}
                  onClick={() => void handleLogout()}
                >
                  {loggingOut ? "در حال خروج..." : "خروج"}
                </NeshastyarSecondaryButton>
              </div>
            </NeshastyarCard>

            <div className="flex-1" />

            <p className="pt-4 text-center text-[12px] text-[#66625B]">
              {`نسخه برنامه: ${APP_VERSION}`}
            </p>
          </>
        )}
      </main>
    </div>
  );
};

export default AccountManagement;
