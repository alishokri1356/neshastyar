import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { safeReturnPath } from "@/lib/safeReturnPath";
import { useToast } from "@/hooks/use-toast";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import {
  NeshastyarCard,
  NeshastyarField,
  NeshastyarPrimaryButton,
} from "@/components/neshastyar/NeshastyarUi";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login, loginWithGoogle, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnPath = safeReturnPath(searchParams.get("next"));

  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnPath || "/home");
    }
  }, [isAuthenticated, navigate, returnPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      await login(email.trim(), password);
      toast({
        title: "خوش آمدید!",
        description: "شما با موفقیت وارد شدید.",
      });
      navigate(returnPath || "/home");
    } catch (error) {
      const message = (error as Error).message || "";
      if (
        message.includes("Email not verified") ||
        message.includes("verify your email")
      ) {
        setErrorMsg(
          "لطفاً ابتدا ایمیل خود را تأیید کنید. لینک تأیید به ایمیل شما ارسال شده است.",
        );
      } else {
        setErrorMsg("ایمیل یا رمز عبور نامعتبر است. لطفاً دوباره تلاش کنید.");
      }
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
          description: "با حساب گوگل وارد شدید.",
        });
        navigate(returnPath || "/home");
      } catch (error) {
        setErrorMsg((error as Error).message || "ورود با گوگل ناموفق بود.");
        throw error;
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle, navigate, returnPath, toast],
  );

  return (
    <div
      dir="rtl"
      className="flex min-h-[100dvh] items-center justify-center bg-[#FBF9F4] px-6 py-8 text-[#1C1B18]"
    >
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#003535] text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M6 13c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm6-10C9.8 3 8 4.8 8 7s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm6 10c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z"
                />
              </svg>
            </span>
            <span className="text-[26px] font-black text-[#003535]">نشست‌یار</span>
          </Link>
          <p className="mt-1.5 text-[14px] text-[#66625B]">ورود با ایمیل</p>
        </div>

        <NeshastyarCard className="p-6">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <NeshastyarField
              id="email"
              label="ایمیل"
              type="email"
              dir="ltr"
              placeholder="example@mail.com"
              value={email}
              onChange={(v) => {
                setEmail(v);
                if (errorMsg) setErrorMsg(null);
              }}
              required
              leadingIcon={<Mail className="h-5 w-5" />}
            />

            <NeshastyarField
              id="password"
              label="رمز عبور"
              type={passwordVisible ? "text" : "password"}
              dir="ltr"
              value={password}
              onChange={(v) => {
                setPassword(v);
                if (errorMsg) setErrorMsg(null);
              }}
              required
              leadingIcon={<Lock className="h-5 w-5" />}
              trailingIcon={
                <button
                  type="button"
                  onClick={() => setPasswordVisible((prev) => !prev)}
                  aria-label="نمایش رمز عبور"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#66625B] hover:bg-black/5"
                >
                  {passwordVisible ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              }
            />

            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-[13px] text-[#66625B] hover:text-[#0D4D4D]"
              >
                فراموشی رمز عبور؟
              </Link>
            </div>

            {errorMsg ? (
              <p className="text-[13px] text-[#B91C1C]">{errorMsg}</p>
            ) : null}

            <NeshastyarPrimaryButton
              type="submit"
              loading={isLoading}
              disabled={isLoading || googleLoading}
            >
              ورود
            </NeshastyarPrimaryButton>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E8E2D5]" />
            <span className="text-[12px] text-[#66625B]">یا</span>
            <div className="h-px flex-1 bg-[#E8E2D5]" />
          </div>

          <GoogleSignInButton
            onCredential={handleGoogle}
            disabled={isLoading || googleLoading}
            onError={(message) => setErrorMsg(message)}
          />

          <div className="mt-5 flex items-center justify-center gap-1 text-[14px]">
            <span className="text-[#404848]">حساب کاربری ندارید؟</span>
            <Link
              to="/signup"
              className="font-semibold text-[#0F766E] underline hover:text-[#0D4D4D]"
            >
              ثبت‌نام کنید
            </Link>
          </div>
        </NeshastyarCard>
      </div>
    </div>
  );
};

export default Login;
