import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useAuthStore } from "@/store/useAuthStore";
import { useToast } from "@/hooks/use-toast";

const GIS_SCRIPT = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
const API_BASE_URL = (import.meta.env.VITE_API_URL || "https://www.neshastyar.com/api").replace(/\/$/, "");

type LatestApk = {
  version?: string;
  filename?: string;
  downloadUrl?: string;
};

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GIS_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")), {
        once: true,
      });
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(script);
  });
}

const Landing = () => {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuthStore();
  const { toast } = useToast();

  const [showEmailSheet, setShowEmailSheet] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [landingError, setLandingError] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [latestApk, setLatestApk] = useState<LatestApk | null>(null);

  const googleHostRef = useRef<HTMLDivElement>(null);

  const handleGoogleCredential = useCallback(
    async (idToken: string) => {
      setLandingError(null);
      setGoogleLoading(true);
      try {
        await loginWithGoogle(idToken);
        toast({
          title: "خوش آمدید!",
          description: "با حساب گوگل وارد شدید.",
        });
        navigate("/home");
      } catch (error) {
        setLandingError((error as Error).message || "خطا در ورود با گوگل");
      } finally {
        setGoogleLoading(false);
      }
    },
    [loginWithGoogle, navigate, toast],
  );

  const credentialCallbackRef = useRef(handleGoogleCredential);
  useEffect(() => {
    credentialCallbackRef.current = handleGoogleCredential;
  }, [handleGoogleCredential]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE_URL}/android/latest`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const data = payload?.data;
        if (cancelled || !data?.downloadUrl) return;
        setLatestApk({
          version: data.version,
          filename: data.filename,
          downloadUrl: data.downloadUrl,
        });
      })
      .catch(() => {
        // The static latest URL still downloads whichever APK the server publishes.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    (async () => {
      try {
        await loadGisScript();
        if (cancelled || !googleHostRef.current || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response: { credential?: string }) => {
            if (!response?.credential) {
              setLandingError("توکن گوگل دریافت نشد.");
              return;
            }
            await credentialCallbackRef.current(response.credential);
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        googleHostRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleHostRef.current, {
          type: "standard",
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: 380,
          locale: "fa",
        });

        setGoogleReady(true);
      } catch {
        setGoogleReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleFallbackGoogleClick = () => {
    if (googleLoading || emailLoading) return;
    setLandingError(null);
    navigate("/login");
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailLoading || googleLoading) return;
    setSheetError(null);
    setEmailLoading(true);

    try {
      await login(email.trim(), password);
      setShowEmailSheet(false);
      toast({
        title: "خوش آمدید!",
        description: "شما با موفقیت وارد شدید.",
      });
      navigate("/home");
    } catch (error) {
      const errorMessage = (error as Error).message || "";
      if (
        errorMessage.includes("Email not verified") ||
        errorMessage.includes("verify your email")
      ) {
        setSheetError(
          "لطفاً ابتدا ایمیل خود را تأیید کنید. لینک تأیید به ایمیل شما ارسال شده است.",
        );
      } else {
        setSheetError("ایمیل یا رمز عبور نامعتبر است. لطفاً دوباره تلاش کنید.");
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const busy = emailLoading || googleLoading;
  const apkDownloadHref = latestApk?.downloadUrl || `${API_BASE_URL}/android/latest/download`;

  return (
    <div
      dir="rtl"
      className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#003535]"
    >
      {/* Full-bleed scenic halftone illustration matching Android landing page */}
      <picture className="pointer-events-none absolute inset-0 select-none">
        <source media="(min-width: 768px)" srcSet="/landing-bg-desktop.jpg" />
        <img
          src="/landing-bg-mobile.jpg"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center"
        />
      </picture>

      {/* Content overlay */}
      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col items-center px-6 safe-top safe-bottom">
        {/* Top Logo */}
        <div className="flex items-center gap-2.5 pt-9 sm:pt-11">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-[#003535] shadow-sm">
            <WorkspacesIcon className="h-[22px] w-[22px] text-white" />
          </div>
          <span className="text-[28px] font-black tracking-tight text-[#003535] sm:text-[30px]">
            نشست‌یار
          </span>
        </div>

        <div className="flex-1" />

        {/* Center Editorial Tagline */}
        <h1
          className="text-center text-[26px] font-semibold leading-[42px] text-[#003535] drop-shadow-[0_1px_10px_rgba(251,249,244,0.65)] sm:text-[34px] sm:leading-[56px]"
          style={{ fontFamily: "'Noto Naskh Arabic', 'Vazirmatn', Georgia, serif" }}
        >
          شما در جلسه حاضر باشید،
          <br />
          نشست‌یار یادداشت‌ها را می‌نویسد.
        </h1>

        <div className="flex-[1.15]" />

        {/* Bottom Actions + Legal Note */}
        <div className="w-full max-w-[380px]">
          {landingError && !showEmailSheet ? (
            <div
              role="alert"
              className="mb-3 w-full rounded-xl bg-[#B91C1C]/85 px-3 py-2 text-center text-[13px] text-white"
            >
              {landingError}
            </div>
          ) : null}

          {/* Continue with Google */}
          <div className="relative h-[58px] w-full">
            <button
              type="button"
              disabled={busy}
              onClick={handleFallbackGoogleClick}
              className="relative flex h-[58px] w-full items-center justify-center rounded-[30px] bg-[#003535] px-[22px] text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(0,25,25,0.35)] transition hover:bg-[#064646] active:scale-[0.99] disabled:opacity-75"
            >
              {googleLoading ? (
                <Loader2 className="h-[22px] w-[22px] animate-spin text-white" />
              ) : (
                <>
                  <span className="pointer-events-none absolute right-[22px] flex items-center">
                    <GoogleLogo className="h-[22px] w-[22px]" />
                  </span>
                  <span>ادامه با گوگل</span>
                </>
              )}
            </button>

            {GOOGLE_CLIENT_ID ? (
              <div
                aria-hidden={!googleReady}
                className={`absolute inset-0 flex items-center justify-center overflow-hidden rounded-[30px] opacity-[0.01] ${
                  googleReady && !busy ? "cursor-pointer" : "pointer-events-none"
                }`}
              >
                <div ref={googleHostRef} className="scale-y-[1.45]" />
              </div>
            ) : null}
          </div>

          {/* Continue with Email */}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setSheetError(null);
              setShowEmailSheet(true);
            }}
            className="relative mt-3 flex h-[58px] w-full items-center justify-center rounded-[30px] bg-[#003535] px-[22px] text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(0,25,25,0.35)] transition hover:bg-[#064646] active:scale-[0.99] disabled:opacity-75"
          >
            <span className="pointer-events-none absolute right-[22px] flex items-center">
              <Mail className="h-[22px] w-[22px] text-white" />
            </span>
            <span>ادامه با ایمیل</span>
          </button>

          <a
            href={apkDownloadHref}
            download={latestApk?.filename}
            className="mt-3 flex h-[58px] w-full flex-col items-center justify-center rounded-[30px] border border-white/80 bg-white/90 px-[22px] text-[#003535] shadow-[0_8px_24px_rgba(0,25,25,0.25)] transition hover:bg-white"
          >
            <span className="text-[16px] font-semibold leading-5">دانلود اپلیکیشن اندروید</span>
            {latestApk?.version ? (
              <span className="text-[12px] leading-4 text-[#404848]">نسخه {latestApk.version}</span>
            ) : null}
          </a>

          <p className="pb-5 pt-4 text-center text-[13px] leading-[22px] text-white/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
            با ادامه، شرایط استفاده و حریم خصوصی نشست‌یار را می‌پذیرید.
          </p>
        </div>
      </main>

      {/* Email Login Bottom Sheet (matches Android ModalBottomSheet) */}
      <Drawer open={showEmailSheet} onOpenChange={setShowEmailSheet}>
        <DrawerContent
          dir="rtl"
          className="border-[#E8E2D5] bg-[#FBF9F4] text-[#1C1B18] rounded-t-[24px]"
        >
          <div className="mx-auto w-full max-w-md px-6 pb-7 pt-4">
            <DrawerTitle className="text-right text-[22px] font-bold text-[#1C1B18]">
              ورود با ایمیل
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              فرم ورود به نشست‌یار با ایمیل و رمز عبور
            </DrawerDescription>

            <form onSubmit={handleEmailSubmit} className="mt-5 space-y-3">
              {/* Email Field */}
              <div>
                <label
                  htmlFor="landing-email"
                  className="mb-1.5 block text-right text-xs font-medium text-[#66625B]"
                >
                  ایمیل
                </label>
                <div className="relative flex items-center">
                  <Mail className="pointer-events-none absolute right-3.5 h-5 w-5 text-[#0F766E]" />
                  <input
                    id="landing-email"
                    type="email"
                    required
                    autoFocus
                    dir="ltr"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (sheetError) setSheetError(null);
                    }}
                    className="h-[52px] w-full rounded-[14px] border border-[#E8E2D5] bg-[#F5F2EB] pl-4 pr-11 text-left text-[15px] text-[#1C1B18] placeholder:text-[#66625B]/70 focus:border-[#0D4D4D] focus:outline-none focus:ring-1 focus:ring-[#0D4D4D]"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label
                  htmlFor="landing-password"
                  className="mb-1.5 block text-right text-xs font-medium text-[#66625B]"
                >
                  رمز عبور
                </label>
                <div className="relative flex items-center">
                  <Lock className="pointer-events-none absolute right-3.5 h-5 w-5 text-[#0F766E]" />
                  <input
                    id="landing-password"
                    type={passwordVisible ? "text" : "password"}
                    required
                    dir="ltr"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (sheetError) setSheetError(null);
                    }}
                    className="h-[52px] w-full rounded-[14px] border border-[#E8E2D5] bg-[#F5F2EB] pl-11 pr-11 text-left text-[15px] text-[#1C1B18] focus:border-[#0D4D4D] focus:outline-none focus:ring-1 focus:ring-[#0D4D4D]"
                  />
                  <button
                    type="button"
                    onClick={() => setPasswordVisible((prev) => !prev)}
                    aria-label={passwordVisible ? "پنهان کردن رمز عبور" : "نمایش رمز عبور"}
                    className="absolute left-3 flex h-8 w-8 items-center justify-center rounded-full text-[#66625B] hover:bg-black/5"
                  >
                    {passwordVisible ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-0.5 text-right">
                <Link
                  to="/forgot-password"
                  onClick={() => setShowEmailSheet(false)}
                  className="inline-block text-[13px] text-[#66625B] transition-colors hover:text-[#0D4D4D]"
                >
                  فراموشی رمز عبور؟
                </Link>
              </div>

              {sheetError ? (
                <p role="alert" className="text-right text-[13px] text-[#B91C1C]">
                  {sheetError}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={emailLoading}
                className="mt-2 flex h-[52px] w-full items-center justify-center rounded-[14px] bg-[#0D4D4D] text-[16px] font-semibold text-white transition hover:bg-[#0F766E] disabled:opacity-50"
              >
                {emailLoading ? (
                  <Loader2 className="h-[22px] w-[22px] animate-spin text-white" />
                ) : (
                  "ورود"
                )}
              </button>

              <div className="flex items-center justify-center gap-1 pt-3 text-[14px]">
                <span className="text-[#404848]">حساب کاربری ندارید؟</span>
                <Link
                  to="/signup"
                  onClick={() => setShowEmailSheet(false)}
                  className="font-semibold text-[#0F766E] underline hover:text-[#0D4D4D]"
                >
                  ثبت‌نام کنید
                </Link>
              </div>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Landing;

function WorkspacesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 13c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm6-10C9.8 3 8 4.8 8 7s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4zm6 10c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z"
      />
    </svg>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}
