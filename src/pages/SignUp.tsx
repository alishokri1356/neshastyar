import React, { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { mysqlClient } from "@/lib/mysql-client";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/use-toast";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import {
  NeshastyarCard,
  NeshastyarField,
  NeshastyarPrimaryButton,
} from "@/components/neshastyar/NeshastyarUi";

const SignUp: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { loginWithGoogle } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg("رمزهای عبور مطابقت ندارند");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await mysqlClient.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() || undefined } },
      });

      if (error) {
        throw new Error(error.error || error.message || "ثبت‌نام ناموفق بود");
      }

      toast({
        title: "ایمیل خود را بررسی کنید!",
        description:
          "لینک تأیید برای شما ارسال شد. لطفاً ایمیل خود را بررسی کنید و سپس وارد شوید.",
        duration: 6000,
      });
      navigate("/login");
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "ایجاد حساب کاربری ناموفق بود.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogle = useCallback(
    async (idToken: string) => {
      setGoogleLoading(true);
      setErrorMsg(null);
      try {
        await loginWithGoogle(idToken);
        toast({
          title: "خوش آمدید!",
          description: "حساب گوگل شما آماده است.",
        });
        navigate("/home");
      } catch (err) {
        setErrorMsg((err as Error).message || "خطا در ثبت‌نام با گوگل");
        throw err;
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle, navigate, toast],
  );

  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] items-center justify-center bg-[#FBF9F4] px-6 py-8 text-[#1C1B18]"
    >
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-[24px] font-bold text-[#1C1B18]">ثبت نام</h1>
          <p className="mt-1.5 text-[14px] text-[#404848]">حساب جدید بسازید</p>
        </div>

        <NeshastyarCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <NeshastyarField
              label="نام (اختیاری)"
              value={name}
              onChange={setName}
            />

            <NeshastyarField
              label="ایمیل"
              type="email"
              dir="ltr"
              placeholder="example@mail.com"
              value={email}
              onChange={setEmail}
              required
            />

            <NeshastyarField
              label="رمز عبور"
              type="password"
              dir="ltr"
              value={password}
              onChange={setPassword}
              required
            />

            <NeshastyarField
              label="تکرار رمز عبور"
              type="password"
              dir="ltr"
              value={confirmPassword}
              onChange={setConfirmPassword}
              required
            />

            {errorMsg ? (
              <p className="text-[13px] text-[#B91C1C]">{errorMsg}</p>
            ) : null}

            <div className="pt-2">
              <NeshastyarPrimaryButton
                type="submit"
                loading={isLoading}
                disabled={isLoading || googleLoading}
              >
                ثبت نام
              </NeshastyarPrimaryButton>
            </div>
          </form>

          <div className="mt-4">
            <GoogleSignInButton
              label="ثبت‌نام با حساب گوگل"
              onCredential={handleGoogle}
              disabled={isLoading || googleLoading}
              onError={(m) => setErrorMsg(m)}
            />
          </div>

          <div className="mt-4 text-center">
            <Link
              to="/"
              className="text-[14px] font-medium text-[#0D4D4D] hover:text-[#0F766E]"
            >
              حساب دارید؟ ورود
            </Link>
          </div>
        </NeshastyarCard>
      </div>
    </div>
  );
};

export default SignUp;
